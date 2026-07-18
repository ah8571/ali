import express from 'express';
import { validatePromoCode, redeemPromoCode } from '../services/promoService.js';

const router = express.Router();

// Validate a promo code (public — used during signup or checkout)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body || {};
    const result = await validatePromoCode(code);
    return res.json(result);
  } catch (error) {
    console.error('[Promo] Validate error:', error.message);
    return res.status(500).json({ valid: false, error: 'Validation failed.' });
  }
});

// Redeem a promo code (requires auth)
router.post('/redeem', async (req, res) => {
  try {
    const { userId } = req;
    const { code } = req.body || {};

    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    if (!code) return res.status(400).json({ error: 'No promo code provided.' });

    const result = await redeemPromoCode(userId, code);
    return res.json(result);
  } catch (error) {
    console.error('[Promo] Redeem error:', error.message);
    return res.status(500).json({ success: false, error: 'Redemption failed.' });
  }
});

export default router;
