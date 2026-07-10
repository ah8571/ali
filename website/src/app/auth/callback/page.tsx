import { Suspense } from 'react';

import AuthCallbackClient from './AuthCallbackClient';

function AuthCallbackFallback() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Emmaline</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Returning to the app</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">Completing your Google sign-in.</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}