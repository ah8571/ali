'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_CALLBACK_URL = 'emmaline://auth/callback';

const buildAppRedirectUrl = (searchParams: URLSearchParams) => {
  const nextUrl = new URL(APP_CALLBACK_URL);

  searchParams.forEach((value, key) => {
    nextUrl.searchParams.set(key, value);
  });

  return nextUrl.toString();
};

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const [appRedirectUrl, setAppRedirectUrl] = useState(APP_CALLBACK_URL);
  const [showManualOpen, setShowManualOpen] = useState(false);

  useEffect(() => {
    const nextAppRedirectUrl = buildAppRedirectUrl(searchParams);
    setAppRedirectUrl(nextAppRedirectUrl);

    const handoffTimer = window.setTimeout(() => {
      window.location.replace(nextAppRedirectUrl);
    }, 120);
    const fallbackTimer = window.setTimeout(() => {
      setShowManualOpen(true);
    }, 1600);

    return () => {
      window.clearTimeout(handoffTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Emmaline</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Returning to the app</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Completing your Google sign-in and sending you back to Emmaline now.
        </p>

        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
        </div>

        {showManualOpen ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-white/60">If the app does not reopen automatically, use the button below.</p>
            <a
              href={appRedirectUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Open Emmaline
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}