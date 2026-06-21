# Emmaline Manual Setup Checklist

Use this doc as the quick working list when you are doing setup from your phone or laptop.

## Priority Order

1. Google OAuth
2. Sentry mobile
3. Sentry backend
4. RevenueCat products and SDK
5. App Store / Play screenshots

## Credentials To Gather First

### Google OAuth

- Google Cloud project access
- Supabase project ref
- Support email for consent screen

### Sentry

- Sentry org
- Sentry project(s)
- Mobile DSN
- Backend DSN
- Sentry auth token for source maps

### RevenueCat

- RevenueCat account
- App Store Connect access
- Google Play Console access
- Product IDs
- RevenueCat iOS public SDK key
- RevenueCat Android public SDK key
- Optional RevenueCat webhook secret

## Docs To Follow

- Google / Apple / Facebook OAuth: [OAUTH.md](OAUTH.md)
- RevenueCat and subscription rollout: [SUBSCRIPTION.md](SUBSCRIPTION.md)
- Sentry and error tracking: [ERROR_TRACKING.md](ERROR_TRACKING.md)
- App store screenshots and listing prep: [APP_STORE_PUBLISHING.md](APP_STORE_PUBLISHING.md)

## Suggested Working Session Plan

### Session 1

- Create Google OAuth credentials
- Add Google provider credentials to Supabase
- Verify sign-in works

### Session 2

- Create Sentry mobile and backend projects
- Save DSNs and auth token
- Add them to deployment secrets / env management

### Session 3

- Create App Store and Play subscription products
- Mirror them in RevenueCat
- Create `pro` entitlement and `default` offering

### Session 4

- Capture iPhone and Android screenshots from the latest build
- Upload store listing assets

## Repo Notes

- Mobile billing UI is still placeholder content in [mobile/src/screens/UpgradeScreen.js](../mobile/src/screens/UpgradeScreen.js)
- Mobile app config is in [mobile/app.json](../mobile/app.json)
- Mobile startup entry is [mobile/src/App.js](../mobile/src/App.js)
- Backend startup entry is [backend/src/index.js](../backend/src/index.js)
