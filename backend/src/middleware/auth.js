/**
 * Authentication middleware
 * Verifies Supabase access tokens and attaches user info to request.
 */

import { getAuthUserForAccessToken } from '../services/authService.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const user = await getAuthUserForAccessToken(token);

    req.user = {
      userId: user.id,
      email: user.email || null,
      userMetadata: user.user_metadata || {}
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: error.message });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const user = await getAuthUserForAccessToken(token);

      req.user = {
        userId: user.id,
        email: user.email || null,
        userMetadata: user.user_metadata || {}
      };
    }

    next();
  } catch (error) {
    // Optional auth doesn't fail on error, just continues without user
    next();
  }
};

export default authMiddleware;
