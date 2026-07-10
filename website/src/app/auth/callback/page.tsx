const APP_CALLBACK_URL = 'emmaline://auth/callback';

type SearchParams = Record<string, string | string[] | undefined>;

const buildAppRedirectUrl = (searchParams: SearchParams) => {
  const nextUrl = new URL(APP_CALLBACK_URL);

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const lastValue = value[value.length - 1];

      if (lastValue) {
        nextUrl.searchParams.set(key, lastValue);
      }

      return;
    }

    if (value) {
      nextUrl.searchParams.set(key, value);
    }
  });

  return nextUrl.toString();
};

export default function AuthCallbackPage({ searchParams }: { searchParams: SearchParams }) {
  const appRedirectUrl = buildAppRedirectUrl(searchParams);
  const redirectScript = `
    window.location.replace(${JSON.stringify(appRedirectUrl)});
    window.setTimeout(function () {
      var manualOpen = document.getElementById('manual-open');
      if (manualOpen) {
        manualOpen.style.display = 'inline-flex';
      }
    }, 1500);
  `;

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <a
        id="manual-open"
        href={appRedirectUrl}
        className="hidden min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
      >
        Open Emmaline
      </a>
      <noscript>
        <a href={appRedirectUrl}>Open Emmaline</a>
      </noscript>
    </main>
  );
}