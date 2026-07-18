import { getSupabaseClient } from './databaseService.js';
import { ensureCreditEntitlement } from './databaseService.js';

export const validatePromoCode = async (code) => {
  if (!code) return { valid: false, error: 'No code provided.' };

  const supabase = getSupabaseClient();
  const cleanedCode = String(code).trim().toUpperCase();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', cleanedCode)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: 'Invalid promo code.' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'This promo code has expired.' };
  }

  if (data.max_uses !== null && data.current_uses >= data.max_uses) {
    return { valid: false, error: 'This promo code has reached its usage limit.' };
  }

  return {
    valid: true,
    promo: {
      id: data.id,
      code: data.code,
      credits: data.credits,
      label: data.label
    }
  };
};

export const redeemPromoCode = async (userId, code) => {
  const validation = await validatePromoCode(code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const supabase = getSupabaseClient();
  const { promo } = validation;

  // Check if user already redeemed this code
  const { data: existing } = await supabase
    .from('promo_redemptions')
    .select('id')
    .eq('user_id', userId)
    .eq('promo_code_id', promo.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'You have already redeemed this promo code.' };
  }

  // Record redemption and increment usage
  const { error: redeemError } = await supabase
    .from('promo_redemptions')
    .insert({
      promo_code_id: promo.id,
      user_id: userId,
      code: promo.code,
      credits_granted: promo.credits
    });

  if (redeemError) {
    console.error('[Promo] Redemption record error:', redeemError.message);
    return { success: false, error: 'Failed to redeem code.' };
  }

  // Increment usage count
  await supabase.rpc('increment_promo_uses', { promo_id: promo.id }).catch(() => {
    // Fallback: update directly
    supabase
      .from('promo_codes')
      .update({ current_uses: (promo.current_uses || 0) + 1 })
      .eq('id', promo.id)
      .then(() => {});
  });

  // Grant credits
  await ensureCreditEntitlement(userId, promo.credits, `promo_${promo.code}`);

  console.log(`[Promo] ${userId} redeemed ${promo.code} for ${promo.credits} credits`);
  return {
    success: true,
    creditsGranted: promo.credits,
    label: promo.label
  };
};
