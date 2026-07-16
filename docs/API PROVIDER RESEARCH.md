# Credit Model

*Last updated: 2026-07-15*

## Overview

Emmaline uses a **credit system** to unify usage across all AI-powered modes. Users receive a base allocation of free credits, and Pro subscribers receive monthly credits with rollover. Credits are consumed at different rates depending on the mode, reflecting the underlying provider costs.

## Rate Card (user-facing)

| Mode | Credits per minute | Notes |
|---|---|---|
| **Voice Mode** (OpenAI Realtime) | 5 credits | Full-duplex AI conversation |
| **Reader — Natural Voice** (Resemble / ElevenLabs) | 2 credits | Premium TTS narration |
| **Reader — Basic** (device TTS) | 0 credits | Falls back to phone's built-in voice |
| **Listen Mode** (Google STT + AI) | 1 credit | Transcription and AI processing |

## Rate Card (internal costs)

| Mode | Provider | Our cost/min | Credit cost/min | Implied margin |
|---|---|---|---|---|
| Voice Mode | OpenAI Realtime | ~$0.17 | 5 credits ($0.50) | ~3x |
| Reader Natural | Resemble / ElevenLabs | ~$0.05–0.10 | 2 credits ($0.20) | ~2–5x |
| Listen Mode | Google STT + OpenAI chat | ~$0.03 | 1 credit ($0.10) | ~3x |
| Reader Basic | Device-local | $0.00 | 0 credits | N/A |

*Costs estimated at OpenAI Realtime $0.06 input + $0.24 output per minute (~40/60 split), Google STT $0.016/min, Resemble per-character pricing. Actual costs tracked via `call_costs` and `credit_transactions` tables.*

### Alternative to real time voice mode:

"Option A" Grok's realtime voice supposedly half price of OpenAI

Deepgram AI? Nova 2.0 Sonic

"Option B" — split STT from the rest of the stack. We'd use:

Deepgram or Google STT for transcription
OpenAI GPT-4o-mini for the AI response (cheap, fast)
ElevenLabs or Resemble for TTS output

## Tiers

### Free Tier
- **20 credits** one-time grant on account creation
- Enough to try: ~2 min Voice Mode + 4 min Reader Natural + 10 min Listen Mode
- Reader Basic (device TTS) always available at no credit cost
- No monthly renewal

### Pro Tier ($9.99/mo)
- **100 credits per month** with rollover
- Unused credits roll over to the next month (capped at 2x monthly allocation = 200 max)
- Additional credits can be purchased (future)
- All modes available

## Rollover Rules
- On monthly renewal: `new_balance = 100 + min(previous_balance, 100)`
- Effect: unused credits carry forward, but you can never have more than 200 at renewal
- Free tier credits never expire

## Schema Design

### users table (new columns)
- `credit_balance INTEGER NOT NULL DEFAULT 0` — current available credits
- `free_credits_granted INTEGER NOT NULL DEFAULT 20` — one-time free allocation
- `monthly_credit_allocation INTEGER NOT NULL DEFAULT 0` — credits/month (100 for pro)
- `last_credit_allocation_date TIMESTAMPTZ` — last monthly renewal
- `rollover_credits INTEGER NOT NULL DEFAULT 0` — rolled over from previous month

### credit_transactions table (new)
- `user_id UUID` — FK to users
- `type` — free_grant | monthly_renewal | usage | purchase | rollover | expiry | adjustment
- `credits INTEGER` — positive for additions, negative for consumption
- `balance_after INTEGER` — running balance after transaction
- `source` — voice_mode | listen_mode | reader_natural | reader_basic | purchase | system
- `usage_duration_seconds INTEGER` — nullable, for usage transactions
- `metadata JSONB`
- `created_at TIMESTAMPTZ`

## Migration Path
1. Add credit columns to `users` table
2. Create `credit_transactions` table
3. Grant initial free credits to existing users
4. Update billing service to read/write credits instead of seconds
5. Update mobile UI to show credits instead of minutes
6. Add credit consumption hooks to voice, listen, and reader flows

---

# API Provider Research


## Decision Framework

Compare providers on:

- voice quality
- latency
- interruption handling and barge-in
- multilingual support, especially English and Spanish in one product
- real-time streaming support
- pricing transparency
- operational complexity
- privacy and compliance posture
- mobile integration friction
- future flexibility for phone and text expansion

## Provider Shortlist

### Direct providers
- OpenAI: best first test for in-app voice mode because it can unify speech, reasoning, and reply audio in one loop.
- Google: strongest direct comparison for voice mode and STT if we want a broader speech platform option.
- Deepgram: strong STT benchmark if we intentionally split transcription from the rest of the stack.
- AssemblyAI: secondary STT comparison vendor.
- Soniox: niche STT benchmark if noisy multilingual speech becomes a blocker.

### Packaged voice-agent vendors
- Retell: strongest packaged benchmark if direct orchestration feels too slow to build.
- Vapi: useful abstraction layer for fast experiments across multiple underlying providers.
- Bland: more relevant for future external phone-agent workflows than in-app voice mode.
- Hume: future UX benchmark if expressive or affect-aware voice becomes important.

## Product Mapping

### A. In-app Voice Mode
Rename product thinking from live call to voice mode.

Recommended evaluation order:
1. OpenAI direct (current implementation — WebRTC)
2. xAI Grok direct (WebSocket — API-compatible, ~half the cost)
3. Google direct
4. Retell benchmark
5. Vapi benchmark

Why:
- direct integrations better match cost sensitivity
- packaged vendors are benchmarks, not defaults
- Twilio should no longer be the center of the in-app voice experience
- Grok Voice Agent is OpenAI Realtime API-compatible — switching is a URL + API key change for WebSocket clients, or a WebSocket transport build for WebRTC clients

### Grok Voice Agent (xAI) — Alternative to OpenAI Realtime

- **Docs:** https://docs.x.ai/developers/model-capabilities/audio/voice
- **Voice Agent API:** https://docs.x.ai/developers/model-capabilities/audio/voice-agent
- **LiveKit Integration:** https://docs.livekit.io/agents/integrations/xai/
- **Pricing:** ~$0.06 input + ~$0.18 output per minute (~half of OpenAI)
- **Model:** `grok-voice-latest` (currently `grok-voice-think-fast-1.0`)
- **Protocol:** WebSocket (primary), WebRTC via LiveKit
- **Event compatibility:** OpenAI Realtime API-compatible — same `session.update`, `response.create`, function calling schema
- **Key differences from OpenAI:**
  - `server_vad` built-in (no client-side VAD needed)
  - `reasoning.effort` toggle (high/none) for complex queries
  - `resumption` for reconnecting sessions
  - `replace` for pronunciation fixes
  - `force_message` for scripted TTS utterances
  - Event name: `input_audio_transcription.updated` (cumulative) vs OpenAI's `delta`
- **Languages:** 20+ with native accents, including Spanish (es-MX, es-ES)
- **Our integration effort:** Medium — event protocol identical, but we need a WebSocket transport layer alongside our current WebRTC implementation. Feature-flag behind settings.

### B. Reader Voice
Recommended evaluation order:
1. ElevenLabs
Alternatives to Elevanlabs
2. Chatterbox
3. Google TTS / Vertex AI
2. Fish Audio
3. PlayHT
4. Cartesia
6. Noiz.ai


Why:
- reader experience is mostly driven by narration quality
- this is the fastest place to create a noticeable UX improvement

### Multi-lingual assistance
1. Openai real time
2. Elevanlabs [supposedly?]
3. Inworld

### C. Real-Time Transcription
Recommended evaluation order:
1. Google
2. Deepgram
3. AssemblyAI
4. Soniox

## Twilio Positioning

Twilio should be treated as a future external communications layer, not the main in-app voice-mode stack.

Best future Twilio use cases:
- direct phone calls to an agent
- direct texting to an agent
- PSTN connectivity and number-based experiences

