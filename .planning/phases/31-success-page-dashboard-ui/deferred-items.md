# Deferred Items — Phase 31

## Pre-existing Test Failures (Out of Scope)

Discovered during 31-02 full suite run. These failures pre-date this plan and are unrelated to dashboard changes.

### 1. src/components/landing/HeroAudioCard.test.tsx — FAILING
- Pre-existing failure confirmed by checking before my changes (git stash test)
- Likely a landing page content update broke test assertions

### 2. src/components/landing/VideoSection.test.tsx — FAILING
- Pre-existing failure
- Likely a landing page content update broke test assertions

### 3. src/components/landing/BottomCtaSection.test.tsx — 1 test failing
- `renders 3 trust badges` — asserts 'Instant delivery' text which may have been changed
- Pre-existing failure

### Recommendation
Address in a future landing page maintenance plan. Not blocking Phase 31 execution.
