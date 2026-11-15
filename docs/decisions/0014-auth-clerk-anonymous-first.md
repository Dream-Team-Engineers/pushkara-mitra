# 0014. Authentication: Clerk, anonymous-first, OTP by SMS or WhatsApp — owner-stated direction

Status: **PROPOSED — owner direction recorded 2026-11-15 (chat); approval, privacy review and counsel input PENDING.** Updates the candidate in [ADR 0008](0008-user-authentication.md) (which named Google sign-in). Activates no routes.

## Decision (proposed)

1. **Pilgrims are anonymous by default.** All public read content (ghats, information, maps, emergency numbers) needs no account and no cookie.
2. **Login is required only for features where identity matters:** Pilgrim Pass and My Group. **Clerk** is the managed identity provider. The Worker verifies Clerk session JWTs server-side (issuer, audience, expiry, signature from the configured key origin only). We do not hand-roll sessions.
3. **Sign-in methods:** phone OTP, with **SMS and WhatsApp** as delivery channels, plus Google if wanted. Our database stores only an opaque Clerk subject reference, never phone or email (ADR 0012 minimisation).
4. **Staff and admins** stay separate: Cloudflare Access with MFA (ADR 0008), then application-level role checks in the Worker.
5. **SOS must not require login** (see ADR 0015). This departs from the earlier chat wording, which listed SOS among login-gated features; a person in danger must not be blocked by a sign-in step. Needs owner confirmation (OQ-032).
6. Authorisation is always resource-scoped on the server. A verified identity alone grants nothing.

## Risks and items NOT VERIFIED

- Whether Clerk supports SMS delivery to India numbers, and whether it supports WhatsApp OTP natively. I believe WhatsApp may need a separate provider (for example a verify service) wired in through a custom flow; unverified (OQ-030).
- India telecom rules (DLT registration for SMS) and WhatsApp Business onboarding: obligations and lead time unverified. Do not assume they can be done before launch.
- Clerk data location, subprocessors and DPDP position (identity data held outside India): NEEDS REVIEW with counsel (OQ-031).
- Pricing at festival scale unverified.
- Hono middleware must verify the Clerk JWT itself; Supabase RLS does not receive Clerk identity unless integrated deliberately (not decided here).

## Consequences

Less security code to own; vendor dependency and cost; identity data leaves our systems, which helps minimisation and hurts residency. Reversible by swapping the verifier behind one `auth` adapter.
