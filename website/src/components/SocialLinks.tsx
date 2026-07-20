import React from 'react';

export default function SocialLinks() {
  return (
    <div className="flex gap-6 items-center justify-center">
      <a href="https://twitter.com/ali_ai" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7a10.6 10.6 0 01-9.5 5M2 21c5.5 0 10-4.5 10-10S7.5 1 2 1" strokeWidth="2" stroke="currentColor" fill="none"/></svg>
      </a>
      <a href="https://instagram.com/ali_ai" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
      </a>
      <a href="https://tiktok.com/@ali_ai" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.08 1.61 2.88 2.88 0 015.4-2.72v-3.54a8.84 8.84 0 00-8.94 8.9c0 4.92 4.02 8.92 8.94 8.92 4.91 0 8.93-3.99 8.93-8.92v-5.5c1.9 1.48 4.51 2.36 7.22 2.36v-3.45a7.99 7.99 0 01-7.45-4.28z"/></svg>
      </a>
    </div>
  );
}
