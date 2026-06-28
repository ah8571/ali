import { randomUUID } from 'node:crypto';

const requiredEnv = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_API_URL'
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const email = `smoke_${Date.now()}_${randomUUID().slice(0, 8)}@emmaline.app`;
const password = `Smoke!${randomUUID().replace(/-/g, '').slice(0, 18)}`;

const authHeaders = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json'
};

const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ email, password })
});
const signupBody = await signupResponse.json().catch(() => ({}));
if (!signupResponse.ok || !signupBody.user) {
  console.error('Supabase signUp failed:', JSON.stringify(signupBody));
  process.exit(1);
}

let accessToken = signupBody.access_token || null;
if (!accessToken) {
  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email, password })
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody.access_token) {
    console.error('Supabase password sign-in failed:', JSON.stringify(tokenBody));
    process.exit(1);
  }

  accessToken = tokenBody.access_token;
}

const profileSyncResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/auth/profile/sync`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    marketingOptIn: true,
    termsAccepted: true,
    privacyAccepted: true,
    email
  })
});

const profileSyncBody = await profileSyncResponse.json().catch(() => ({}));
if (!profileSyncResponse.ok || !profileSyncBody.user?.id) {
  console.error('Backend profile sync failed:', JSON.stringify(profileSyncBody));
  process.exit(1);
}

const meResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/auth/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
const meBody = await meResponse.json().catch(() => ({}));
if (!meResponse.ok || !meBody.user?.id) {
  console.error('Backend /auth/me failed:', JSON.stringify(meBody));
  process.exit(1);
}

console.log('AUTH_SMOKE_OK');
console.log(JSON.stringify({
  email,
  userId: meBody.user.id,
  marketingOptIn: meBody.user.marketingOptIn
}, null, 2));
