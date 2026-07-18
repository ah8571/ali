'use client';

import { useState } from 'react';

export default function AffiliatePage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // TODO: POST to backend /api/promo/affiliate-signup
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold mb-4">Ali Affiliate Program</h1>
        <p className="text-white/60 mb-10 text-lg">
          Share Ali with your audience. They get a free trial week, you earn when they subscribe.
        </p>

        {submitted ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <p className="text-green-400 text-lg font-semibold mb-2">Thanks! We'll be in touch.</p>
            <p className="text-white/50">We review applications within 48 hours and will email you your unique promo code.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-8 text-left space-y-5">
            <div>
              <label className="block text-sm text-white/60 mb-1">Name</label>
              <input required className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Email</label>
              <input required type="email" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Platform / Audience</label>
              <input className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30" placeholder="YouTube, TikTok, blog, etc." />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Audience size (approx)</label>
              <input className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30" placeholder="e.g. 5,000" />
            </div>
            <button type="submit" className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-white/90 transition">
              Apply
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
