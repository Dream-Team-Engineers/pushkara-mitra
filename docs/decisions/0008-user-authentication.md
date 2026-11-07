# 0008. Pilgrim and administrator identity — decision candidate

Status: **PROPOSED — G1 CONTRACT APPROVAL PENDING.** Prepared 2026-11-05 (IST). No authentication routes or identity processing are activated.

Candidate for confirmation: anonymous public browsing; server-verified Google pilgrim sign-in for approved protected operations; separate Cloudflare Access administrators. Neither local remembered identity nor frontend role flags authorize an operation. A verified identity still requires server-side, resource-scoped authorization.

Before acceptance, decide BF-01–BF-05: whether persistent pilgrim accounts are necessary; exact trusted issuers/audiences and verification/key retrieval; minimal server-derived subject mapping; permission/assignment authority; session transport, storage, absolute and idle expiry, rotation, concurrent-session policy, revocation, recovery and applicable CSRF/replay controls. No role names, numerical lifetimes or personal fields are selected by this proposal. Review provider/processor and accessibility implications.

Use bounded trusted key origins only; token-controlled jku/x5u/kid values cannot select arbitrary network targets or files. Missing, malformed, forged, expired, future, wrong-issuer/audience, unknown-key and unavailable-trust evidence must not authenticate. Never log credentials, token claims or personal identifiers by default.

Human owner: LEAD to confirm. Independent identity/security/privacy reviewer: unfilled until actual appointment. Exact reviewed revision and decision links: PENDING. Dependent implementation remains blocked by the foundation approval record.
