import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })
  : null;

// Tier configuration — matches Stripe price IDs
export const STRIPE_TIERS = {
  ali_weekly: {
    priceId: process.env.STRIPE_PRICE_WEEKLY || '',
    label: 'Ali Weekly',
    credits: 100,
    period: 'week'
  },
  ali_monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY || '',
    label: 'Ali Monthly',
    credits: 500,
    period: 'month'
  }
};

export const verifyStripeWebhook = (rawBody, signature) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.warn('[Stripe] Not configured — skipping webhook verification');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return null;
  }
};

export const createStripeCheckout = async (userId, email, tierKey, successUrl, cancelUrl, promoCode = null) => {
  if (!stripe) throw new Error('Stripe is not configured.');

  const tier = STRIPE_TIERS[tierKey];
  if (!tier || !tier.priceId) {
    throw new Error(`Unknown tier: ${tierKey}`);
  }

  const sessionConfig = {
    mode: 'subscription',
    line_items: [{ price: tier.priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    metadata: { userId, tier: tierKey, promoCode: promoCode || '' },
    success_url: successUrl || 'https://alihelp.tech/subscribe/success',
    cancel_url: cancelUrl || 'https://alihelp.tech/subscribe',
    allow_promotion_codes: true
  };

  // If a specific promo code was provided, apply it as a discount
  if (promoCode) {
    try {
      // Look up the coupon in Stripe
      const coupons = await stripe.coupons.list({ limit: 1 });
      const matchingCode = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1
      });

      if (matchingCode.data.length > 0) {
        sessionConfig.discounts = [{ coupon: matchingCode.data[0].coupon.id }];
      }
    } catch (err) {
      console.warn('[Stripe] Could not apply promo code:', promoCode, err.message);
      // Continue without discount — user can enter it on Stripe's checkout page
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  return { checkoutUrl: session.url, checkoutId: session.id };
};

export const cancelStripeSubscription = async (subscriptionId) => {
  if (!stripe) throw new Error('Stripe is not configured.');
  await stripe.subscriptions.cancel(subscriptionId);
  return { success: true };
};

export const getStripeSubscription = async (subscriptionId) => {
  if (!stripe) return null;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return sub;
};

export default {
  STRIPE_TIERS,
  verifyStripeWebhook,
  createStripeCheckout,
  cancelStripeSubscription,
  getStripeSubscription
};
