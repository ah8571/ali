## Integrate new grok real time voice

## App Store changes

- Update name to Ali
- Work through key words for people to better find the apps (like STT or TTS or how other apps are phrasing it)
- 30 character new name for apple
Emmaline: Free Reader, Transcriber
oov: Reader Transcriber Tutor <- (30)
oov: Free Reader, Transcriber <- (29) 
Ali: AI Voice Assistant <-
Later
Ali: Multitask with AI
Ali: Your AI workspace

consider grabbing oov.tools
oov.digital

[x] In-app branding — replaced "Emmaline" → "Ali" across mobile, backend, website (20+ files)
[x] Legal content — mobile + shared legalContent.json updated with Ali branding + alihelp.tech email
[x] Website — header, footer, SEO metadata, sitemap, robots all updated to alihelp.tech
[x] cloudflare / networking
[x] Google auth page - google reviewing
[x] Email — support@emmaline.app → support@oov.digital
[x] GitHub — repo renamed
[x] supabase auth urls
[x] Digital Ocean — droplet/app names are cosmetic, easy to rename. But if you use emmaline in any DNS/hostname config, those need updating.
[x] API endpoints — api.emmaline.app would need to change or be aliased. If you keep the old domain as an alias, no mobile code changes needed.
[ ] add env variables in digital ocean
[ ] App display name — changed in app.json?
[ ] App Store review — a name change on an existing app is usually fine, but Apple occasionally flags dramatic rebrands. 
[ ] unsubscribe from emmaline.app 
[ ] logins - several apps use support@emmaline.app, need to document [resemble.ai, ]

Intentionally unchanged
com.emmaline.app — bundle ID
emmaline_pro_* — RevenueCat product IDs
emmaline_supabase_session etc. — storage keys (reset on re-login)

## Remodeling the subscription method 

[ ] update subscription info The product IDs emmaline_pro_monthly, create IAP's for each; 
[ ] RevenueCat → Products → the new product should auto-import within a few minutes after step 1
[ ] RevenueCat → Offerings → 
[ ] RevenueCat → Entitlements → attach both to the pro entitlement (same as the monthly product)
[ ] Then the webhook I added at /api/billing/revenuecat-webhook will detect purchases of those product IDs 
[x] Rename products in Stripe: "Ali Weekly" → "Oov Weekly", "Ali Monthly" → "Oov Monthly". The tier keys in code are still ali_weekly / ali_monthly — those are internal identifiers, but the display labels are already "oov Weekly" / "oov Monthly".
[x] Set the env vars in DO: STRIPE_PRICE_WEEKLY, STRIPE_PRICE_MONTHLY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
[x] Create the webhook endpoint in Stripe: https://api.oov.digital/api/stripe/webhook (events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)

*Z;J"9Ms">.@8MJ

## Create promo code workflows for influencers / sign up with affiliate networks

## Appflyer integration w privacy (SKAN and android privacy box)


## Consider weaving in less than .01 cent api providers

**OpenRouter Audio APIs can cover the below
Self-hosted providers
Faster Whisper Large-v3 / Insanely Fast Whisper (.2 per hour of transcription potentially) - open-source
Kokoro-82M with budget friendly runpod gpu could lead to sub .01 compute costs
StyleTTS 2
ChatTTS
XTTS v2 by Coqui



RunPod is a specialized GPU cloud provider. You lease massive Nvidia graphics cards (like H100s or A100s) to host, train, or serve AI models.The Focus: High-performance hardware optimization.The Cost: Expensive (ranging from $0.20/hr for tiny GPUs to $3.50+/hr for elite cards).The Use Case: RunPod is where companies host the actual brain of an open-weight model (like Qwen or Llama) if they choose not to use OpenRouter.

Need to keep interstitial api costs lower than .01 ad payout

For cheaper model work, try to rope in the basic functionality for those who like to use transcribe, reader stuff for free

Use for:
Transcription
TTS reading (Apple has built in AVSpeechSynthesizer)
Don't use for real time voice

## Ads set up
Ad-rewarded feature:
"Ad-Triggered Actions: Instead of random pop-ups, use a Rewarded Interstitial ad format. Require the user to watch a 5-second video specifically to "unlock" a long transcription or article read-aloud. Users accept ads much better when it directly grants them a feature."

Ad framework
Because a 1-hour file costs $0.013 to process, a single standard pop-up ad ($0.010) leaves you at a slight loss. To make this profitable, you must adapt your ad strategy for long-form content.Instead of one random pop-up, you use two strategic ad placements:The 
- Entry Ad: A standard interstitial pop-up when they hit "Transcribe".
- The Processing Ad: While the server spends 90 seconds transcribing the file, you display a native video ad or a rewarded countdown on the processing screen.

Higher paying ad types
- playable game ads (eCpm 15 to 30)
- 15 second ads lead to about 2.5c per watch

User uploads a 1-hour file 
   │
   ├──> [Ad #1: Interstitial Pop-up] ──────> Earns you: +$0.010
   │
   ├──> [90-Second Server Processing Screen]
   │    └──> Displays a 15s Video Ad ───────> Earns you: +$0.020
   │
   └──> Final Transcription Delivered 



## reader screen edits

don't have people scroll to find the read aloud button. have the main keys sticky on the bottom of the pane. make the text pane either only so long put the downloads somewhere else


# Tomorrow



## Start reaching out to influencers 

## perhaps just take a day to create dancing cat/ animal videos....

## Keep working through app upgrades

- Flash cards
- Document upload



## AppsFlyer:
dev key
iOS app ID confirmation
the SKAdNetwork ID list from AppsFlyer or your ad partners
confirmation that RevenueCat -> AppsFlyer integration is enabled
your first-pass Conversion Studio mapping choice, probably:
subscription = high
trial/paywall conversion = medium

Mapping (suggested): Fine values — 1 = Registration, 2 = FreeTrial (placeholder), 3 = Subscription. Coarse: Low = Session, High = Subscribe. Configure this in AppsFlyer Conversion Studio.

What I changed: registration is logged in api.js; subscribe is logged in revenueCatService.js. Guidance added to .env.example and app.config.js reads EXPO_PUBLIC_IOS_SKADNETWORK_IDS.

SKAN IDs: get canonical IDs from each ad network dashboard or AppsFlyer Settings → SKAdNetwork. For TikTok/Meta use their partner docs (they publish SKAN IDs) or copy the list AppsFlyer shows for those partners.

Next: if you paste TikTok (and optionally Meta) SKAN IDs I will create an EAS secret EXPO_PUBLIC_IOS_SKADNETWORK_IDS and trigger a production TestFlight build for validation.

Note: installs are measured by SKAN postbacks; in-app appsFlyer.logEvent(...) provides the events Conversion Studio maps to conversion values for ROAS later.

## Affiliate draft inputs:
1 creator slug/name to use as the first real landing page
rough promo code format you want, even if temporary
optional headline/testimonial copy for that creator page

