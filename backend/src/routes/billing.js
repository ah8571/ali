import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getUserVoiceBillingStatus,
  grantUserCredits
} from '../services/billingService.js';
import { getUserCreditStatus, grantFreeCredits } from '../services/creditService.js';

const router = express.Router();

const isBillingAdminAuthorized = (req) => {
  const configuredKey = process.env.BILLING_ADMIN_KEY;

  if (!configuredKey) {
    return false;
  }

  return req.get('x-admin-key') === configuredKey;
};

router.get('/status', authMiddleware, async (req, res) => {
  try {
    // Ensure free credits are granted (idempotent — only grants once)
    await grantFreeCredits(req.user.userId).catch(() => {});

    const [billingStatus, creditStatus] = await Promise.all([
      getUserVoiceBillingStatus(req.user.userId),
      getUserCreditStatus(req.user.userId)
    ]);

    return res.status(200).json({
      success: true,
      billing: billingStatus,
      credits: creditStatus
    });
  } catch (error) {
    console.error('Error fetching billing status:', error.message);
    return res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

router.post('/grant-credits', authMiddleware, async (req, res) => {
  try {
    if (!isBillingAdminAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const creditsToAdd = Math.round(Number(req.body?.credits || 0));

    if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
      return res.status(400).json({ error: 'credits must be a positive integer' });
    }

    const result = await grantUserCredits(req.user.userId, creditsToAdd);

    return res.status(200).json({
      success: true,
      addedCredits: creditsToAdd,
      billing: result.billingStatus
    });
  } catch (error) {
    console.error('Error granting credits:', error.message);
    return res.status(500).json({ error: 'Failed to grant credits' });
  }
});

/**
 * POST /api/billing/revenuecat-webhook
 * Called by RevenueCat when an IAP purchase is made.
 * Only handles one-time credit pack purchases (Apple compliance IAP).
 * Stripe handles all subscription billing.
 */
router.post('/revenuecat-webhook', async (req, res) => {
  try {
    const event = req.body?.event;
    const eventType = String(event?.type || '');

    // Only process initial purchase events (credit packs are one-time, not renewable)
    if (eventType !== 'INITIAL_PURCHASE') {
      return res.status(200).json({ acknowledged: true, reason: 'event_type_ignored' });
    }

    const productId = String(event?.product_id || '');
    const appUserId = String(event?.app_user_id || '').trim();

    if (!appUserId) {
      return res.status(400).json({ error: 'Missing app_user_id in RevenueCat event.' });
    }

    // One-time credit purchase (Apple IAP: IAP_credits, Google IAP: iap_credits)
    if (productId === 'IAP_credits' || productId === 'iap_credits') {
      await grantUserCredits(appUserId, 100);
      console.log(`[Billing] Granted 100 one-time credits to user ${appUserId} via RevenueCat IAP (${productId})`);

      return res.status(200).json({
        acknowledged: true,
        product: productId,
        credits: 100
      });
    }

    return res.status(200).json({ acknowledged: true, reason: 'product_not_configured' });
  } catch (error) {
    console.error('RevenueCat webhook error:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

export default router;