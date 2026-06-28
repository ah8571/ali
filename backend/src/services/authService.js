/**
 * Authentication service
 * Uses Supabase Auth for sessions and the public users table for app profile data.
 */

import { getSupabaseAuthClient, getSupabaseClient, getSupabaseDebugInfo } from './databaseService.js';

const getSupabase = () => getSupabaseClient();
const getSupabaseAuth = () => getSupabaseAuthClient();

const buildUsernameBase = (email, fullName = null) => {
  const fromName = String(fullName || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const fromEmail = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  return fromName || fromEmail || 'user';
};

const buildUniqueUsername = (email, fullName = null) => {
  return `${buildUsernameBase(email, fullName)}_${Date.now().toString().slice(-6)}`;
};

const normalizeAppUser = (user) => ({
  id: user.id,
  email: user.email,
  marketingOptIn: Boolean(user.marketing_opt_in),
  pricingTier: 'tier1'
});

const getIdentityFromAuthUser = (authUser = {}, fallbackProfile = {}) => {
  const metadata = authUser.user_metadata || {};

  return {
    email: authUser.email || fallbackProfile.email || null,
    fullName: fallbackProfile.fullName || metadata.full_name || metadata.name || null
  };
};

const getUserByIdInternal = async (userId) => {
  const supabase = getSupabase();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user: ${error.message}`);
  }

  return user || null;
};

const createUserProfile = async ({ authUser, identity, marketingOptIn = false, termsAccepted = false, privacyAccepted = false }) => {
  if (!identity.email) {
    throw new Error('Authenticated user is missing an email address');
  }

  if (!termsAccepted || !privacyAccepted) {
    throw new Error('Terms of Use and Privacy Policy acceptance are required');
  }

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: identity.email,
      username: buildUniqueUsername(identity.email, identity.fullName),
      marketing_opt_in: Boolean(marketingOptIn),
      created_at: nowIso,
      updated_at: nowIso,
      term_and_privacy_accepted_at: nowIso,
      marketing_consent_at: marketingOptIn ? nowIso : null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return newUser;
};

export const getAuthUserForAccessToken = async (accessToken) => {
  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new Error(error?.message || 'Invalid authentication token');
  }

  return data.user;
};

export const syncAuthenticatedUserProfile = async ({
  authUser,
  marketingOptIn,
  termsAccepted = false,
  privacyAccepted = false,
  email = null,
  fullName = null
}) => {
  if (!authUser?.id) {
    throw new Error('Authenticated user is required');
  }

  const identity = getIdentityFromAuthUser(authUser, { email, fullName });
  let user = await getUserByIdInternal(authUser.id);

  if (!user) {
    user = await createUserProfile({
      authUser,
      identity,
      marketingOptIn,
      termsAccepted,
      privacyAccepted
    });
  } else if (typeof marketingOptIn === 'boolean') {
    const nextMarketingConsentAt = marketingOptIn
      ? user.marketing_consent_at || new Date().toISOString()
      : null;
    const nextTermsAcceptedAt = (termsAccepted && privacyAccepted)
      ? (user.term_and_privacy_accepted_at || new Date().toISOString())
      : user.term_and_privacy_accepted_at;

    const { data: updatedUser, error } = await getSupabase()
      .from('users')
      .update({
        marketing_opt_in: marketingOptIn,
        marketing_consent_at: nextMarketingConsentAt,
        term_and_privacy_accepted_at: nextTermsAcceptedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    user = updatedUser;
  }

  return normalizeAppUser(user);
};

export const getUserById = async (userId) => {
  const user = await getUserByIdInternal(userId);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    marketingOptIn: Boolean(user.marketing_opt_in),
    pricingTier: 'tier1'
  };
};

export const signInWithPassword = async ({ email, password }) => {
  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.session || !data?.user) {
    throw new Error(error?.message || 'Invalid email or password');
  }

  return data;
};

export const signUpWithPassword = async ({ email, password }) => {
  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data?.user) {
    throw new Error(error?.message || 'Unable to create account');
  }

  if (data.session) {
    return data;
  }

  return signInWithPassword({ email, password });
};

export const signInWithIdToken = async ({ provider, idToken }) => {
  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token: idToken
  });

  if (error || !data?.session || !data?.user) {
    throw new Error(error?.message || `Unable to sign in with ${provider}`);
  }

  return data;
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
    throw new Error(error?.message || 'Unable to refresh session');
  }

  return data.session;
};

export const deleteAuthUser = async (userId) => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete auth user: ${error.message}`);
  }
};

export const getAuthDebugInfo = () => getSupabaseDebugInfo();

export default {
  getAuthUserForAccessToken,
  syncAuthenticatedUserProfile,
  getUserById,
  signInWithPassword,
  signUpWithPassword,
  signInWithIdToken,
  refreshSession,
  deleteAuthUser,
  getAuthDebugInfo
};
