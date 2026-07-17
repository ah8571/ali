# GDPR Compliance Guide for Emmaline

[Look into AI processing re Europe]

This document outlines GDPR compliance requirements and implementation for Emmaline. GDPR is mandatory for any EU users, even if you're not based in the EU.

## Table of Contents

1. [Core GDPR Obligations](#core-gdpr-obligations)
2. [Practical Implementation](#practical-implementation)
3. [Data Processing Agreements](#data-processing-agreements)
4. [User Rights](#user-rights)
5. [Privacy Policy Template](#privacy-policy-template)
6. [Risk Assessment](#risk-assessment)
7. [Implementation Checklist](#implementation-checklist)

---

## Core GDPR Obligations

### 1. Data Collection Consent

Users must explicitly opt-in before you collect their data. 

**Mobile App Implementation:**
- Add consent screen before first login
- Clear explanation of data flow
- Explicit checkbox user must accept
- Link to Privacy Policy
- Option to review before accepting

### 1.1 Marketing Email Consent (Newsletter / Product Updates)

Marketing consent should be collected separately from required service consent.

**Rules to follow:**
- Do not pre-check the marketing checkbox
- Keep marketing consent optional (no bundling with account creation)
- Add unsubscribe link in every marketing email
- Honor unsubscribe requests quickly and persist `opt_out_timestamp`
- Keep proof of consent changes for compliance reviews

**Recommended UX copy:**
"I agree to receive product updates and marketing emails. I can unsubscribe at any time."

### 2. Privacy Policy

Required document explaining:
- What data you collect (audio, transcripts, user email)
- How long you keep it (retention period)
- Who accesses it (Google Cloud, OpenAI, your team)
- User rights (see User Rights section)
- How to exercise those rights

**Must be:**
- Easily accessible (link in app footer and website)
- Written in plain language (avoid legal jargon)
- Specific about third-party processors
- Updated when practices change

### 3. User Rights (GDPR Rights)

You must implement technical access to:

#### Right to Access
- Users can download/view their data
- Provide in machine-readable format (JSON)
- Include all calls, transcripts, notes, metadata

**Implementation:**
```
Settings → "Download My Data"
→ Exports ZIP with all user data
→ Available within 30 days of request
```

#### Right to Deletion
- Users can delete conversations
- Users can request full account deletion
- Data removed within 30 days (soft delete)
- Auto-purge from backups within 90 days

**Implementation:**
```
Per-call: Delete button on each transcript
Full account: Settings → "Delete Account"
→ Confirmation dialog
→ Complete removal within 7 days
```

#### Right to Portability
- User can export all data in portable format
- Can take data to competitor
- Include all calls, notes, metadata

**Implementation:**
```
Settings → "Export All Data"
→ JSON/CSV format
→ Can import to other services
```

#### Right to Correction
- Users can correct/update their data
- Note: Can't edit audio/transcripts (immutable)
- Can edit notes and metadata

**Implementation:**
```
Existing: Notes editing ✅
Edit profile: User can update email/name
```

### 4. Data Processing Agreements (DPA)

Since you use third parties, you need agreements with them:

#### Google Cloud Speech-to-Text
- ✅ Has standard DPA (sign their Data Processing Agreement)
- Users' audio streamed to Google's servers
- EU option: Request EU data centers (available in Console)

#### OpenAI
- ⚠️ **Important:** OpenAI uses data for model improvement
- Solution: Requires Business tier + explicit contract to opt-out
- Currently no EU data center option
- Check latest terms as this changes

**Code to use OpenAI safely:**
```javascript
// Requires Business tier subscription
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
  organization: process.env.OPENAI_ORG_ID
  // Note: Still requires contractual agreement
  // Regular tier: Your data CAN be used for training
});

// Until Business tier: Inform users in Privacy Policy
// "Your transcripts may be used by OpenAI to improve their services"
```

#### Supabase
- ✅ Has DPA (included in their terms)
- Data stored encrypted in your chosen region
- Can select EU region to keep data in EU

**Supabase DPA:**
- Access: https://supabase.com/terms
- Use EU region: `eu-west-1` (Ireland)

### 5. Data Breach Notification

If you experience a security incident:
- Notify EU authorities within **72 hours**
- Notify affected users **without undue delay**
- Document the incident and your response

**Reporting process:**
1. Identify the breach
2. Assess impact on user data
3. Contact your data protection authority (DPA)
4. Email users affected with details

### 6. Lawful Basis for Processing

You need a legal reason to process data. Options:

```
Consent (✅ BEST FOR EMMALINE)
├─ User explicitly agrees upfront
├─ Can withdraw consent anytime
├─ Easiest to implement
└─ Clear audit trail of agreement

Contractual Necessity
├─ Required to provide the service
└─ Apply AFTER consent given

Legitimate Interest
├─ Your business needs it
├─ Must balance against user privacy
└─ Harder to justify for EU regulators

Legal Obligation
├─ Law requires you to keep data
└─ Rare for this use case
```

**For Emmaline: Use Consent** - Users agree upfront to all processing.

---

## Practical Implementation

### Before Launch

**Legal Documents:**
- [ ] Write Privacy Policy (see template below)
- [ ] Create Terms of Service (use template from GitHub)
- [ ] Document your Data Retention Policy
- [ ] Document your Security Measures

**Third-Party Agreements:**
- [ ] Get DPA signed with Supabase
- [ ] Get DPA signed with Google Cloud
- [ ] Get DPA signed with OpenAI (requires Business tier)
- [ ] Review terms of all external services

**Mobile App Features:**
- [ ] Add consent screen before first login
- [ ] Test data deletion (works end-to-end)
- [ ] Add Settings screen with:
  - [ ] Download My Data button
  - [ ] Delete Account button
  - [ ] Link to Privacy Policy
- [ ] Add Privacy Policy acceptance checkbox
- [ ] Add optional marketing opt-in checkbox (unchecked by default)
- [ ] Store consent timestamp/source/version for marketing opt-in
- [ ] Add unsubscribe endpoint and verify suppression list behavior

**Backend API Endpoints:**
```javascript
// GET /api/user/data - Export all user data
// DELETE /api/user - Delete all user data (soft delete)
// POST /api/user/export - Create export job (async)
```



## Privacy Policy Template

```markdown
# Privacy Policy for Emmaline

**Last Updated:** [DATE]
**Effective Date:** [DATE]

## 1. Introduction

Emmaline ("we," "us," "our") provides an AI phone call assistant service. 
This Privacy Policy explains how we collect, use, disclose, and safeguard 
your information.

Please read this Privacy Policy carefully. If you do not agree with our 
policies and practices, please do not use our Service.

## 2. What Information We Collect

### Information You Provide:
- **Account Information:** Email address, password (hashed)
- **Call Data:** Audio recordings of all conversations
- **Transcripts:** Text transcriptions generated from audio
- **Notes:** Any notes you create about calls
- **Metadata:** Call timestamps, duration, phone number

### Information Collected Automatically:
- **Device Information:** Device type, operating system
- **Usage Information:** Features used, call frequency, app performance
- **Technical Information:** IP address, crash logs, error reports

## 3. How We Use Your Information

- Provide transcription services (Google Cloud Speech-to-Text)
- Generate summaries and insights (OpenAI)
- Store and retrieve your calls and notes
- Send you support responses (if requested)
- Improve our service reliability
- Comply with legal obligations

## 4. Data Sharing & Third Parties

Your data is processed by:

| Service | Purpose | Data Shared | Privacy |
|---------|---------|------------|---------|
| Google Cloud | Speech-to-Text | Audio (encrypted) | [Privacy Policy](https://cloud.google.com/privacy) |
| OpenAI | Summarization | Transcripts | [Privacy Policy](https://openai.com/privacy) |
| Supabase | Storage | Encrypted data | [Privacy Policy](https://supabase.com/privacy) |

**Important:** 
- OpenAI may use data to improve their services (unless you have Business tier)
- All data is encrypted in transit and at rest
- We do NOT sell your data to third parties

## 5. Data Retention

- **Active Calls:** Stored indefinitely until you delete
- **Deleted Calls:** Soft-deleted immediately, hard-deleted after 90 days
- **Account Deletion:** All data removed within 7 days
- **Backups:** Retained for 90 days for disaster recovery

## 6. Your Privacy Rights (GDPR)

You have the right to:

### Right to Access
Download a copy of your data anytime in the app:
- Settings → "Download My Data"
- Includes all calls, notes, metadata

### Right to Deletion
Delete your data:
- Per-call: Tap any transcript → Delete
- Full account: Settings → "Delete Account"
- Processed within 7 days

### Right to Portability
Export your data to another service:
- Settings → "Export All Data"
- JSON format, importable elsewhere

### Right to Correction
Update your information:
- Edit your profile in Settings
- Edit notes and metadata
- Audio/transcripts are immutable for integrity

### Right to Withdraw Consent
Stop using Emmaline anytime:
- Delete your account
- All data removed per retention policy

## 7. Data Security

We implement:
- SSL/TLS encryption for data in transit
- AES-256 encryption for data at rest (Supabase)
- HTTPS for all API communication
- Regular security updates
- Secure password hashing (bcryptjs)

However, no security is 100% secure. We cannot guarantee 
absolute protection against all attacks.

## 8. International Data Transfer

Your data may be processed in the United States by Google Cloud 
and OpenAI. By using Emmaline, you consent to this transfer.

For EU users: We comply with standard contractual clauses 
(SCCs) as approved by EU authorities.

## 9. Data Breach Notification

In case of a security incident:
- EU authorities notified within 72 hours
- Affected users notified without undue delay
- Details of breach and protective measures provided
- Contact: privacy@yourdomain.com

## 10. Contact Us

**Data Protection & Privacy Questions:**
- Email: privacy@yourdomain.com
- Response time: Within 14 days

**EU Data Protection Authority:**
- Your country's DPA: [Find yours](https://edpb.ec.europa.eu/about-edpb/about-edpb_en)

## 11. Changes to This Policy

We may update this Privacy Policy. Material changes will be 
communicated via the app or email. Continued use means you 
accept changes.

## 12. Lawful Basis for Processing

We process your data based on:
- **Your Consent** - You explicitly agree when using the service
- **Contract** - Necessary to provide the service
- **Legal Obligation** - Required by law

---

*This Privacy Policy complies with GDPR (EU), CCPA (California), 
and similar regulations.*
```

---

## Risk Assessment


**Cost of Compliance:**
- Privacy Policy template: Free-$500
- Legal review: $500-2,000 (optional but recommended)
- Maintenance: Minimal ongoing

---

## Implementation Checklist

### Phase 0: Before Launch
- [ ] Write Privacy Policy (use template above)
- [ ] Add consent screen to app
- [ ] Sign Supabase DPA
- [ ] Sign Google Cloud DPA
- [ ] Decide: OpenAI Business tier? (recommended)
- [ ] Add Settings screen
- [ ] Test: Delete account → Verify full removal

### Phase 1: Post-Launch
- [ ] Monitor for any compliance issues
- [ ] Set up privacy email (privacy@domain.com)
- [ ] Document data processing activities
- [ ] Create incident response plan

### Phase 2: Scale
- [ ] Consult lawyer ($500-2k) to review policy
- [ ] Implement Data Protection Impact Assessment (DPIA)
- [ ] Add more granular consent options (Phase 2+)
- [ ] Regular security audits

---

## Resources

- [GDPR Official Text](https://gdpr-info.eu/)
- [ICO Guide to GDPR](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.ec.europa.eu/)
- [Privacy Shield (now invalid, use SCCs)](https://www.privacyshield.gov/)
- [Standard Contractual Clauses](https://ec.europa.eu/info/law/law-topic/data-protection_en)

---

## US Regulatory Requirements

### A2P SMS/MMS (If Using Twilio for Text Messages)

If you plan to send or receive text messages through Twilio, you must comply with carrier requirements:

**SMS - A2P 10DLC Registration Required**
- Application-to-Person (A2P) messaging requires registration
- 10-Digit Long Code (10DLC) is the standard for SMS
- Required by: AT&T, Verizon, T-Mobile, and other US carriers
- Registration ensures deliverability and carrier compliance

**MMS - A2P 10DLC Registration Required**
- Multi-media messaging also requires A2P 10DLC registration
- Same registration covers both SMS and MMS
- Required for sending images, videos, documents via text

**What You Need to Do:**
1. Register your brand/business with Twilio's A2P 10DLC system
2. Provide: Business information, use case, opt-in practices
3. Get approval (usually 1-3 business days)
4. Maintain compliance with carrier throughput limits

**Why It Matters:**
- Without registration: Messages get blocked/filtered
- Carriers enforce strict requirements on content
- Non-compliance can result in phone number suspension
- Registration is free but mandatory

**In Emmaline Context:**
- Currently not using SMS (call-based only)
- If you add SMS features (reminders, confirmations): Must register
- Add to Phase 2 roadmap if SMS is planned

**Resources:**
- [Twilio A2P 10DLC Guide](https://www.twilio.com/en-us/messaging/sms/10dlc)
- [Carrier Compliance Requirements](https://www.twilio.com/en-us/messaging/compliance)

