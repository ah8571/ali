-- Migration: credit system for unified usage tracking across modes
-- Replaces the seconds-based billing model with a credit-based model.

-- 1. Add credit columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_credits_granted INTEGER NOT NULL DEFAULT 20;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS monthly_credit_allocation INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_credit_allocation_date TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rollover_credits INTEGER NOT NULL DEFAULT 0;

-- 2. Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'free_grant',
    'monthly_renewal',
    'usage',
    'purchase',
    'rollover',
    'expiry',
    'adjustment'
  )),
  credits INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source VARCHAR(30) CHECK (source IN (
    'voice_mode',
    'listen_mode',
    'reader_natural',
    'reader_basic',
    'purchase',
    'system'
  )),
  usage_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
  ON public.credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON public.credit_transactions(type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at
  ON public.credit_transactions(created_at);

-- 3. Grant initial free credits to existing users who haven't received them yet
DO $$
BEGIN
  INSERT INTO public.credit_transactions (user_id, type, credits, balance_after, source, metadata)
  SELECT
    u.id,
    'free_grant',
    20,
    20,
    'system',
    jsonb_build_object('reason', 'initial_free_credit_grant')
  FROM public.users u
  WHERE u.free_credits_granted = 0
    AND u.credit_balance = 0
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions ct
      WHERE ct.user_id = u.id AND ct.type = 'free_grant'
    );

  UPDATE public.users
  SET
    credit_balance = 20,
    free_credits_granted = 20
  WHERE free_credits_granted = 0
    AND credit_balance = 0;
END $$;

-- 4. Rate card reference (documentation only — not enforced by DB)
-- Voice Mode:    5 credits/min  (OpenAI Realtime)
-- Reader Natural: 2 credits/min  (Resemble / ElevenLabs)
-- Reader Basic:   0 credits/min  (device TTS)
-- Listen Mode:    1 credit/min   (Google STT + AI)

-- 5. Row-level security for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_transactions'
      AND policyname = 'users_read_own_credits'
  ) THEN
    CREATE POLICY "users_read_own_credits" ON public.credit_transactions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_transactions'
      AND policyname = 'service_insert_credits'
  ) THEN
    CREATE POLICY "service_insert_credits" ON public.credit_transactions
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
