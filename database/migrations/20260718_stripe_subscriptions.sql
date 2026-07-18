-- Add Stripe subscription fields to billing entitlements
ALTER TABLE user_billing_entitlements
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_tier TEXT,
ADD COLUMN IF NOT EXISTS stripe_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS stripe_updated_at TIMESTAMP WITH TIME ZONE;
