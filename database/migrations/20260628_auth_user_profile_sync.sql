CREATE OR REPLACE FUNCTION public.upsert_user_profile_from_auth(
  auth_user_id UUID,
  auth_email TEXT,
  auth_metadata JSONB DEFAULT '{}'::jsonb,
  auth_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata JSONB := COALESCE(auth_metadata, '{}'::jsonb);
  normalized_email TEXT := LOWER(TRIM(COALESCE(auth_email, metadata->>'email', '')));
  full_name TEXT := COALESCE(metadata->>'full_name', metadata->>'name', '');
  base_username TEXT;
  username_suffix TEXT := SUBSTRING(REPLACE(auth_user_id::TEXT, '-', '') FROM 1 FOR 8);
  accepted_at TIMESTAMP WITH TIME ZONE := NULLIF(
    COALESCE(metadata->>'term_and_privacy_accepted_at', metadata->>'terms_accepted_at'),
    ''
  )::TIMESTAMP WITH TIME ZONE;
  marketing_consent_at TIMESTAMP WITH TIME ZONE := NULLIF(metadata->>'marketing_consent_at', '')::TIMESTAMP WITH TIME ZONE;
  marketing_opt_in BOOLEAN := CASE LOWER(COALESCE(metadata->>'marketing_opt_in', ''))
    WHEN 'true' THEN TRUE
    WHEN 'false' THEN FALSE
    ELSE FALSE
  END;
  generated_username TEXT;
  legacy_user RECORD;
  effective_marketing_opt_in BOOLEAN;
  effective_terms_accepted_at TIMESTAMP WITH TIME ZONE;
  effective_marketing_consent_at TIMESTAMP WITH TIME ZONE;
  effective_created_at TIMESTAMP WITH TIME ZONE;
  effective_password_hash TEXT;
BEGIN
  IF normalized_email = '' THEN
    RETURN;
  END IF;

  base_username := REGEXP_REPLACE(
    LOWER(TRIM(COALESCE(NULLIF(full_name, ''), SPLIT_PART(normalized_email, '@', 1), 'user'))),
    '[^a-z0-9_]+',
    '',
    'g'
  );

  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  generated_username := LEFT(base_username, 91) || '_' || username_suffix;

  SELECT *
  INTO legacy_user
  FROM public.users
  WHERE email = normalized_email
    AND id <> auth_user_id
  LIMIT 1;

  IF FOUND THEN
    effective_marketing_opt_in := COALESCE(legacy_user.marketing_opt_in, FALSE) OR marketing_opt_in;
    effective_terms_accepted_at := COALESCE(legacy_user.term_and_privacy_accepted_at, accepted_at);
    effective_marketing_consent_at := CASE
      WHEN effective_marketing_opt_in THEN COALESCE(
        legacy_user.marketing_consent_at,
        marketing_consent_at,
        accepted_at,
        auth_created_at,
        CURRENT_TIMESTAMP
      )
      ELSE NULL
    END;
    effective_created_at := COALESCE(legacy_user.created_at, auth_created_at, CURRENT_TIMESTAMP);
    effective_password_hash := COALESCE(legacy_user.password_hash, 'supabase_auth_managed');

    INSERT INTO public.users (
      id,
      email,
      username,
      password_hash,
      marketing_opt_in,
      term_and_privacy_accepted_at,
      marketing_consent_at,
      created_at,
      updated_at
    )
    VALUES (
      auth_user_id,
      auth_user_id::TEXT || '@placeholder.emmaline.local',
      generated_username,
      effective_password_hash,
      effective_marketing_opt_in,
      effective_terms_accepted_at,
      effective_marketing_consent_at,
      effective_created_at,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.user_phone_numbers SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.calls SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.transcripts SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.call_messages SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.call_costs SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.summaries SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.topics SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.notes SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.note_revisions SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.api_keys SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.audit_logs SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.support_requests SET user_id = auth_user_id WHERE user_id = legacy_user.id;
    UPDATE public.account_deletion_requests SET user_id = auth_user_id WHERE user_id = legacy_user.id;

    DELETE FROM public.users WHERE id = legacy_user.id;
  ELSE
    effective_marketing_opt_in := marketing_opt_in;
    effective_terms_accepted_at := accepted_at;
    effective_marketing_consent_at := CASE
      WHEN marketing_opt_in THEN COALESCE(marketing_consent_at, auth_created_at, CURRENT_TIMESTAMP)
      ELSE NULL
    END;
    effective_created_at := COALESCE(auth_created_at, CURRENT_TIMESTAMP);
    effective_password_hash := 'supabase_auth_managed';
  END IF;

  INSERT INTO public.users (
    id,
    email,
    username,
    password_hash,
    marketing_opt_in,
    term_and_privacy_accepted_at,
    marketing_consent_at,
    created_at,
    updated_at
  )
  VALUES (
    auth_user_id,
    normalized_email,
    generated_username,
    effective_password_hash,
    effective_marketing_opt_in,
    effective_terms_accepted_at,
    effective_marketing_consent_at,
    effective_created_at,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      marketing_opt_in = EXCLUDED.marketing_opt_in,
      username = COALESCE(public.users.username, EXCLUDED.username),
      term_and_privacy_accepted_at = COALESCE(public.users.term_and_privacy_accepted_at, EXCLUDED.term_and_privacy_accepted_at),
      marketing_consent_at = CASE
        WHEN EXCLUDED.marketing_opt_in THEN COALESCE(public.users.marketing_consent_at, EXCLUDED.marketing_consent_at)
        ELSE public.users.marketing_consent_at
      END,
      updated_at = CURRENT_TIMESTAMP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_user_profile_from_auth(NEW.id, NEW.email, NEW.raw_user_meta_data, NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

SELECT public.upsert_user_profile_from_auth(id, email, raw_user_meta_data, created_at)
FROM auth.users
WHERE id NOT IN (
  SELECT id
  FROM public.users
);