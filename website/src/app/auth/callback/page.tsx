'use client';

import { useEffect, useState } from 'react';

const APP_SCHEME = 'oov';
const APP_PACKAGE = 'com.emmaline.app.dev';
const APP_PATH = 'auth/callback';

const buildIntentUrl = (searchParams: string) => {
  const encoded = encodeURIComponent(searchParams);
  const fallback = encodeURIComponent(`https://oov.digital/auth/callback${searchParams}`);
  return `intent://${APP_PATH}${searchParams}#Intent;scheme=${APP_SCHEME};package=${APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
};

const buildUniversalUrl = (searchParams: string) => {
  return `oov://${APP_PATH}${searchParams}`;
};

export default function AuthCallbackPage() {
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    const searchParams = window.location.search + window.location.hash;
    const isAndroid = /android/i.test(navigator.userAgent);
    const url = isAndroid ? buildIntentUrl(searchParams) : buildUniversalUrl(searchParams);
    setAppUrl(url);
    window.location.href = url;
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-white/60 text-sm text-center">
        Complete your sign-in by opening the app
      </p>
      <a
        href={appUrl}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
      >
        Open Oov
      </a>
    </main>
  );
}