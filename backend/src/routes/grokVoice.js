import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGrokEphemeralToken, buildGrokRealtimeConfig } from '../services/grokVoiceService.js';
import { assertUserCanStartVoiceSession } from '../services/billingService.js';

const router = express.Router();

router.post('/session', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const voice = String(req.body?.voice || 'eve').trim() || 'eve';

    // Check billing/credits before allowing the session
    await assertUserCanStartVoiceSession(userId);

    const tokenResponse = await createGrokEphemeralToken({ voice });

    return res.status(200).json({
      success: true,
      ...tokenResponse
    });
  } catch (error) {
    if (error.code === 'VOICE_PAYWALL_REQUIRED' || error.code === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: error.message,
        code: error.code,
        billingStatus: error.billingStatus || null
      });
    }

    console.error('Grok voice session error:', error.message);
    return res.status(500).json({ error: error.message || 'Unable to start Grok voice session.' });
  }
});

router.get('/config', authMiddleware, (req, res) => {
  const voice = String(req.query?.voice || 'eve').trim() || 'eve';

  return res.status(200).json({
    success: true,
    config: buildGrokRealtimeConfig({ voice })
  });
});

export default router;
