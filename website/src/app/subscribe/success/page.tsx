'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        {/* Checkmark */}
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-3">Subscription confirmed</h1>
        <p className="text-white/60 mb-8">
          Your subscription is active. Return to the oov app to start using your credits.
        </p>

        <a
          href="oov://"
          className="inline-block bg-white text-black font-semibold rounded-xl px-8 py-4 hover:bg-white/90 transition mb-4"
        >
          Open oov app
        </a>

        <p className="text-white/30 text-sm">
          If the app doesn&apos;t open, make sure oov is installed on this device.
        </p>

        {sessionId && (
          <p className="text-white/10 text-xs mt-8 font-mono">session: {sessionId.slice(0, 12)}…</p>
        )}
      </div>
    </main>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/50">Confirming subscription…</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
