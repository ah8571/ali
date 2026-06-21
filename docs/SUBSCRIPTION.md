# RevenueCat Setup

## Recommended Order

1. Create store-side products in App Store Connect and Google Play Console.
2. Create the RevenueCat project and mirror those products there.
3. Add the RevenueCat mobile SDK.
4. Gate entitlements in the app.
5. Add webhook handling on the backend if you want server-side subscription awareness.

## Store Products

Create at least:

- Monthly subscription
- Optional annual subscription
- Optional intro trial / promo variant

Keep product IDs aligned across iOS and Android if possible.

## RevenueCat Project Setup

In RevenueCat:

1. Create a project for Emmaline.
2. Add both mobile apps:
	- iOS bundle ID
	- Android package name
3. Create products.
4. Create an entitlement, for example `pro`.
5. Create an offering, for example `default`.

## Mobile SDK Work

The mobile app does not have RevenueCat installed yet. The expected package is:

```bash
npm --prefix mobile install react-native-purchases
```

Initialize RevenueCat near app startup, likely from [mobile/src/App.js](../mobile/src/App.js).

Typical app flow:

1. Configure with iOS or Android public SDK key.
2. Log in with the app user ID after authentication.
3. Fetch customer info.
4. Check whether entitlement `pro` is active.

## App Surfaces To Update

- Replace placeholder billing UI in [mobile/src/screens/UpgradeScreen.js](../mobile/src/screens/UpgradeScreen.js)
- Add purchase button(s)
- Add restore purchases
- Add entitlement-aware gating

## Source Of Truth

Recommended setup for Emmaline:

1. RevenueCat is the source of truth for subscription status.
2. The mobile app checks entitlements locally for UX.
3. The backend optionally syncs billing state for usage limits or server-side gating.

## Webhook Events To Handle

If you sync subscription state to the backend, subscribe to:

- `initial_purchase`
- `renewal`
- `cancellation`
- `expiration`
- `uncancellation`
- `billing_issue`

These can update billing state in the backend user model.

## Secrets Needed

- RevenueCat iOS public SDK key
- RevenueCat Android public SDK key
- Optional RevenueCat webhook secret on backend

## Minimal First Milestone

1. Install SDK
2. Configure SDK
3. Show offerings on Upgrade screen
4. Purchase and restore
5. Gate premium UI off `pro` entitlement
