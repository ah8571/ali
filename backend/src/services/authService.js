/**
 * Authentication service
 * Handles user registration, login, and JWT token generation
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import { getSupabaseClient, getSupabaseDebugInfo } from './databaseService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const googleAudienceList = [
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID
].filter(Boolean);
const appleAudienceList = String(process.env.APPLE_OAUTH_BUNDLE_IDS || 'com.emmaline.app,com.emmaline.app.dev')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const googleOAuthClient = new OAuth2Client();

const getSupabase = () => getSupabaseClient();

const buildUsernameBase = (email, fullName = null) => {
  const fromName = String(fullName || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const fromEmail = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  return fromName || fromEmail || 'user';
};

const buildUniqueUsername = (email, fullName = null) => {
  return `${buildUsernameBase(email, fullName)}_${Date.now().toString().slice(-6)}`;
};

const createRandomPasswordHash = async () => {
  return bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
};

const normalizeAppUser = (user) => ({
  id: user.id,
  email: user.email,
  marketingOptIn: Boolean(user.marketing_opt_in),
  pricingTier: 'tier1'
});

/**
 * Generate JWT token for a user
 */
export const generateToken = (userId, email) => {
  return jwt.sign(
    {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Register a new user
 */
export const registerUser = async (email, password, consentOptions = {}) => {
  const supabase = getSupabase();
  const supabaseDebug = getSupabaseDebugInfo();
  const {
    marketingOptIn = false,
    termsAccepted = false,
    privacyAccepted = false
  } = consentOptions;

  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!termsAccepted || !privacyAccepted) {
    throw new Error('Terms of Use and Privacy Policy acceptance are required');
  }

  // Check if user already exists
  let existingUser;
  let existingUserError;

  try {
    ({ data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle());
  } catch (error) {
    console.error('Supabase existing-user lookup threw before response', {
      message: error.message,
      cause: error.cause?.message || null,
      supabase: {
        configured: supabaseDebug.configured,
        host: supabaseDebug.host,
        normalizedRestSuffix: supabaseDebug.normalizedRestSuffix,
        normalizedUrl: supabaseDebug.normalizedUrl
      }
    });
    throw new Error(`Failed to check existing user: ${error.message} (supabase host: ${supabaseDebug.host})`);
  }

  if (existingUserError) {
    console.error('Supabase existing-user lookup returned an error response', {
      message: existingUserError.message,
      code: existingUserError.code || null,
      details: existingUserError.details || null,
      hint: existingUserError.hint || null,
      supabase: {
        configured: supabaseDebug.configured,
        host: supabaseDebug.host,
        normalizedRestSuffix: supabaseDebug.normalizedRestSuffix,
        normalizedUrl: supabaseDebug.normalizedUrl
      }
    });
    throw new Error(`Failed to check existing user: ${existingUserError.message}`);
  }

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  const username = buildUniqueUsername(email);
  const nowIso = new Date().toISOString();

  // Create user in database
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email,
      username,
      password_hash: passwordHash,
      marketing_opt_in: Boolean(marketingOptIn),
      created_at: nowIso,
      term_and_privacy_accepted_at: nowIso,
      marketing_consent_at: marketingOptIn ? nowIso : null
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering user:', error);
    throw new Error(`Failed to register user: ${error.message}`);
  }

  // Generate token
  const token = generateToken(newUser.id, newUser.email);

  return {
    user: normalizeAppUser(newUser),
    token
  };
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
  const supabase = getSupabase();

  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Find user
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user.id, user.email);

  return {
    user: normalizeAppUser(user),
    token
  };
};

const findUserByEmail = async (email) => {
  const supabase = getSupabase();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user: ${error.message}`);
  }

  return user || null;
};

const createSocialUser = async ({ email, fullName = null, marketingOptIn = false }) => {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const passwordHash = await createRandomPasswordHash();

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email,
      username: buildUniqueUsername(email, fullName),
      password_hash: passwordHash,
      marketing_opt_in: Boolean(marketingOptIn),
      created_at: nowIso,
      term_and_privacy_accepted_at: nowIso,
      marketing_consent_at: marketingOptIn ? nowIso : null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create social user: ${error.message}`);
  }

  return newUser;
};

const verifyGoogleIdentityToken = async (idToken) => {
  if (!googleAudienceList.length) {
    throw new Error('Google sign-in is not configured on the backend');
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken,
    audience: googleAudienceList
  });
  const payload = ticket.getPayload();

  if (!payload?.email || payload.email_verified === false) {
    throw new Error('Google account did not provide a verified email');
  }

  return {
    email: payload.email,
    fullName: payload.name || null
  };
};

const verifyAppleIdentityToken = async (idToken, fallbackEmail = null, fallbackFullName = null) => {
  const claims = await appleSigninAuth.verifyIdToken(idToken, {
    audience: appleAudienceList,
    ignoreExpiration: false
  });
  const email = claims?.email || fallbackEmail;

  if (!email) {
    throw new Error('Apple sign-in did not provide an email address for this account');
  }

  return {
    email,
    fullName: fallbackFullName
  };
};

export const loginWithSocialProvider = async ({
  provider,
  idToken,
  email = null,
  fullName = null,
  marketingOptIn = false
}) => {
  if (!provider || !idToken) {
    throw new Error('Provider and identity token are required');
  }

  let identity;

  if (provider === 'google') {
    identity = await verifyGoogleIdentityToken(idToken);
  } else if (provider === 'apple') {
    identity = await verifyAppleIdentityToken(idToken, email, fullName);
  } else {
    throw new Error('Unsupported social login provider');
  }

  let user = await findUserByEmail(identity.email);

  if (!user) {
    user = await createSocialUser({
      email: identity.email,
      fullName: identity.fullName || fullName,
      marketingOptIn
    });
  }

  const token = generateToken(user.id, user.email);

  return {
    user: normalizeAppUser(user),
    token
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  const supabase = getSupabase();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, created_at, marketing_opt_in')
    .eq('id', userId)
    .single();

  if (error || !user) {
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

/**
 * Refresh token (returns new token)
 */
export const refreshToken = (decodedToken) => {
  return generateToken(decodedToken.userId, decodedToken.email);
};

export default {
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  loginWithSocialProvider,
  getUserById,
  refreshToken
};
