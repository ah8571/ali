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

export const createStripeCheckout = async (userId, email, tierKey, successUrl, cancelUrl) => {
  if (!stripe) throw new Error('Stripe is not configured.');

  const tier = STRIPE_TIERS[tierKey];
  if (!tier || !tier.priceId) {
    throw new Error(`Unknown tier: ${tierKey}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: tier.priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    metadata: { userId, tier: tierKey },
    success_url: successUrl || 'https://alihelp.tech/subscribe/success',
    cancel_url: cancelUrl || 'https://alihelp.tech/subscribe',
    allow_promotion_codes: true
  });

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
