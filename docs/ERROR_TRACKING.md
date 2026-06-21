# Sentry Setup

## Recommended Order

1. Mobile first
2. Backend second
3. Website third if you want frontend web visibility too

## Mobile Setup

This Expo-based app uses a dev client and native modules, so use the official React Native / Expo Sentry setup.

Typical flow:

1. Install `@sentry/react-native`
2. Run the Sentry wizard
3. Add DSN as an env var or Expo extra
4. Initialize Sentry near app startup in [mobile/src/App.js](../mobile/src/App.js)

## Backend Setup

Install Sentry in the backend and initialize it before your routes in [backend/src/index.js](../backend/src/index.js).

Capture:

- Uncaught exceptions
- Unhandled promise rejections
- Express request errors
- Useful tags like user ID, call mode, and Twilio SID when available

## Website Setup

Since the site is Next.js, use the official Sentry Next.js integration if you want browser and server-render coverage there too.

## Source Maps And Releases

For Sentry to be useful on mobile builds:

1. Upload source maps during EAS build.
2. Keep release/version names aligned with app builds.
3. Do the same for website production deploys if enabled.

## Secrets Needed

- `SENTRY_DSN_MOBILE`
- `SENTRY_DSN_BACKEND`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

If you add website coverage, also keep the web DSN and release config in deployment secrets.

## User Context

Once auth succeeds, set:

- User ID
- Email if appropriate

This makes debugging call failures, login issues, and billing issues much easier.

## Smoke Test Checklist

After setup:

1. Trigger a handled mobile test error.
2. Trigger a backend test error.
3. Confirm both appear in Sentry with useful stack traces and source maps.
