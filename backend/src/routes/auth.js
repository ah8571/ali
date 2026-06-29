/**
 * Routes for authenticated user profile sync
 * Supabase Auth is the session source of truth.
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getUserById, refreshSession, syncAuthenticatedUserProfile } from '../services/authService.js';

const router = express.Router();

router.post('/profile/sync', authMiddleware, async (req, res) => {
  try {
    const {
      marketingOptIn,
      termsAccepted = false,
      privacyAccepted = false,
      email = null,
      fullName = null
    } = req.body || {};

    const user = await syncAuthenticatedUserProfile({
      authUser: {
        id: req.user.userId,
        email: req.user.email,
        user_metadata: req.user.userMetadata || {}
      },
      marketingOptIn,
      termsAccepted,
      privacyAccepted,
      email,
      fullName
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Profile sync error:', error.message);

    if (error.message.includes('Terms of Use and Privacy Policy acceptance are required')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to sync user profile' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const session = await refreshSession(refreshToken);

    return res.status(200).json({
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || null
    });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return res.status(401).json({ error: 'Token refresh failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error.message);
    return res.status(404).json({ error: 'User not found' });
  }
});

export default router;
