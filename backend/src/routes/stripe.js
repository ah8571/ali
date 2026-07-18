import express from 'express';
import { verifyStripeWebhook, createStripeCheckout, cancelStripeSubscription, STRIPE_TIERS } from '../services/stripeService.js';
import { ensureCreditEntitlement, getSupabaseClient } from '../services/databaseService.js';

const router = express.Router();

// Stripe webhook — raw body required for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] || '';
    const event = verifyStripeWebhook(req.body, sig);

    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const eventType = event.type;
    const session = event.data.object;
    const metadata = session?.metadata || {};
    const userId = metadata?.userId || session?.client_reference_id;
    const tier = metadata?.tier || '';
    const subscriptionId = session?.subscription || session?.id;

    console.log('[Stripe] Webhook:', eventType, { userId, subscriptionId, tier });

    const supabase = getSupabaseClient();

    switch (eventType) {
      case 'checkout.session.completed': {
        if (session.mode === 'subscription' && userId) {
          const tierConfig = STRIPE_TIERS[tier];
          const credits = tierConfig?.credits || 0;

          await supabase.from('user_billing_entitlements').upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_tier: tier,
            stripe_status: 'active',
            is_pro_active: true,
            stripe_updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

          if (credits > 0) {
            await ensureCreditEntitlement(userId, credits, `stripe_${tier}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subStatus = session?.status;
        if (userId) {
          await supabase.from('user_billing_entitlements').upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId || session?.id,
            stripe_status: subStatus === 'active' ? 'active' : 'inactive',
            is_pro_active: subStatus === 'active',
            stripe_updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }
        break;
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[Stripe] Webhook error:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { userId } = req;
    const { tier, email, successUrl, cancelUrl } = req.body || {};

    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!tier || !STRIPE_TIERS[tier]) {
      return res.status(400).json({ error: `Invalid tier. Available: ${Object.keys(STRIPE_TIERS).join(', ')}` });
    }

    const result = await createStripeCheckout(userId, email, tier, successUrl, cancelUrl);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Stripe] Checkout error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const { userId } = req;
    const { subscriptionId } = req.body || {};

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    await cancelStripeSubscription(subscriptionId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Stripe] Cancel error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Tiers list
router.get('/tiers', (_req, res) => {
  return res.json({
    success: true,
    tiers: Object.entries(STRIPE_TIERS).map(([key, config]) => ({
      key,
      label: config.label,
      credits: config.credits,
      period: config.period,
      active: Boolean(config.priceId)
    }))
  });
});

export default router;
