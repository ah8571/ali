# Emmaline: AI Phone Call Buddy Concept

## Overview

Emmaline is a hands-free, voice-first AI assistant accessible via phone call. Users can call a dedicated phone number and speak with an AI assistant in real-time while multitasking—cooking, commuting, shopping, or any daily activity. Conversations are automatically transcribed, summarized, and organized in a minimalistic note-taking interface for later review and reference.

### The Value Proposition
- **Hands-free interaction**: No need to text or type—just call and talk
- **True multitasking**: Engage with AI while fully focused on other tasks
- **Persistent knowledge**: Transcripts and summaries are stored and retrievable
- **Minimal friction**: Simple, clean interface for organizing thoughts

---

## Roadmap & Development Phases

This section is now meant to be a working product plan rather than a pure brainstorming list. The goal is to identify what is already present in the repo, what is still blocking launch, and which longer-term assistant directions should be treated as Phase 2-3 expansion rather than MVP scope.

### Table of Contents
1. [Current Status Snapshot](#current-status-snapshot)
2. [Phase 1: Publishable MVP with Cloud Infrastructure](#phase-1-publishable-mvp-with-cloud-infrastructure)
2. [Phase 2: OpenClaw Integration + Enhanced Privacy](#phase-2-openclaw-integration--enhanced-privacy)
3. [Phase 3: Completely Local & Private](#phase-3-completely-local--private)

---

## Phase 1: Publishable MVP with Cloud Infrastructure


### Phase 1 Publish Blockers

These are the major items still worth focusing on to make the app viable rather than just technically interesting.

1. Product mode clarity
- [ ] Lock the Phase 1 product into two explicit user-facing modes:
  - Call mode: talk with the AI assistant
  - Listen mode: silent transcript / note-taking / summary capture
- [ ] Add a listening / transcription mode as a first-class option in the app
- [ ] Make sure summaries and notes are generated cleanly from both modes

2. Reliability and responsiveness
- [ ] Improve response speed and perceived responsiveness during live calls
- [ ] Tighten transcript streaming reliability and end-of-call save behavior
- [ ] Reduce the number of visible "processing" gaps that make the product feel unfinished

3. Billing and monetization
- [ ] Turn the upgrade / paywall foundation into a real purchasable flow
- [ ] Decide whether RevenueCat, Superwall, or a simpler first-party gating approach is the Phase 1 path
- [ ] Make usage limits understandable to users
- [ ] Track LLM API token usage per call / summary / user so we know when a user needs to pay more
- [ ] Track provider cost vs. billed revenue so we can verify margins are positive

4. Tracking, monitoring, and launch instrumentation
- [ ] Connect the standard launch tooling stack: Resend, PostHog, Sentry
- [ ] Implement attribution and campaign tracking correctly:
  - GTM / UTM on the website
  - app analytics and install attribution in the app itself
- [ ] Track the key funnel events: signup, trial/upgrade intent, call started, call completed, note created
- [ ] Map the LLMs/providers we want to test and compare quality vs. cost
  - OpenAI
  - DeepSeek
  - Kimi
  - other low-cost / open-source-compatible providers we connect over time
- [ ] Add a simple quality review loop for model outputs so we can test whether cheaper providers are good enough before routing real users onto them

5. Legal and trust requirements
- [ ] Publish Privacy Policy and Terms of Use
- [ ] Add first-run consent for data processing
- [ ] Implement minimum account-level deletion / export planning for privacy compliance
- [ ] Finish the launch-safe subset of GDPR work before broad distribution

### Phase 1 Scope To Defer Unless It Becomes Essential

- [ ] Text chat with the AI assistant
- [ ] Twilio text registration or SMS-based assistant flow
- [ ] Dedicated personal phone number per user
- [ ] Deep affiliate or venue-specific attribution systems



---

## Phase 2: OpenClaw Integration + Enhanced Privacy

### Phase 2 Goal

Extend the MVP into a more capable assistant without losing the core voice-and-notes workflow.

### Phase 2 Product Expansion

- Dedicated phone number and trusted-caller security model
- Text chat interface alongside calling
- Better conversation memory, topic organization, and search
- Better summarization: action items, sentiment, context, structured outputs
- OpenClaw ecosystem integration
- Email sorting and summarization via voice
- Developer-focused assistant tasks such as code project initiation on the go
- Language-support experiments, including translation or language-teacher flows where speech tooling makes sense


## Phase 3: Completely Local & Private

### Phase 3 Goal

Turn Emmaline from a focused phone companion into a broader assistant platform with local/privacy-first deployment options and specialized product tracks.

### Development Features

- Full on-device AI conversation (no external API calls)
- Local speech-to-text (using open-source models like Whisper)
- Local text-to-speech (using Piper or similar)
- Local LLM for responses (using models like Llama 2, Mistral)
- Entirely self-contained system
- Offline-capable (no internet required after initial setup)

### Phase 3 Product Outlets

These are interesting longer-term assistant directions, but they should be treated as extensions of the core product rather than launch promises.

- Flexible virtual assistant layer for everyday coordination
- Real-time translation workflows
- Receptionist / front-desk mode
  - handle bookings
  - route problems to managers
  - escalate based on business rules
- Specialist assistant tracks built on the same voice / transcript / notes core:
  - Lawyer specialization: review work, document drafting, intake
  - Coder specialization: developer execution and project support
  - Customer support agent: triage, response suggestions, escalation
- Privacy Model: Tier 3 - Completely Local & Private
  - Zero external API calls during conversation
  - All processing happens on user's device or self-hosted backend  
  - No data ever leaves the user's infrastructure
  - Cryptographic verification of model integrity


