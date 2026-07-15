-- Fix: free_credits_granted default should be 0, not 20.
-- The grantFreeCredits() function in creditService handles the actual grant.
-- Having DEFAULT 20 on free_credits_granted causes the function to skip
-- (it thinks credits were already granted) while credit_balance stays at 0.

ALTER TABLE public.users ALTER COLUMN free_credits_granted SET DEFAULT 0;

-- Reset users who got the bad default (free_credits_granted=20 but credit_balance=0)
-- so grantFreeCredits() can properly grant them when they next check billing status.
UPDATE public.users
SET free_credits_granted = 0
WHERE free_credits_granted = 20
  AND credit_balance = 0;
