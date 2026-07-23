'use client';

import { useEffect, useState } from 'react';

const APP_CALLBACK_URL = 'oov://auth/callback';

const buildAppRedirectUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const nextUrl = new URL(APP_CALLBACK_URL);

  params.forEach((value, key) => {
    nextUrl.searchParams.set(key, value);
  });

  return nextUrl.toString();
};

export default function AuthCallbackPage() {
  const [appRedirectUrl, setAppRedirectUrl] = useState('');

  useEffect(() => {
    const url = buildAppRedirectUrl();
    setAppRedirectUrl(url);

    // Try auto-redirect (may be blocked by some browsers)
    window.location.href = url;
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-white/60 text-sm text-center">
        Complete your sign-in by opening the app
      </p>
      <a
        id="manual-open"
        href={appRedirectUrl}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
      >
        Open Oov
      </a>
    </main>
  );
}