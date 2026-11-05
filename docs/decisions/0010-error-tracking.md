# 0010. Error tracking and logging — decision candidate

Status: **PROPOSED — G1 CONTRACT APPROVAL PENDING.** Prepared 2026-11-05 (IST). No logging sink, telemetry integration or additional processing is enabled.

Proposed boundary: fixed safe error envelopes and minimal structured operational events under the approved purpose. Do not log credentials, cookies, tokens, raw request bodies, coordinates, movement history or arbitrary identity fields. Keep the existing location non-persistence invariant and reconcile ADR 0005.

BF-09/BF-10 must select the actual permitted event taxonomy, correlation policy, sink (including a decision for no external sink), processor/residency controls, necessity, retention/deletion, access authority, incident owner and failure behavior. Do not infer a statutory retention period or introduce IP/hashed-identity collection just to populate a rate-limit key. Request/body/abuse budgets require route-specific decisions and measured validation.

Acceptance requires redaction tests across nested data/errors, secret and location exclusion, bounded events, unavailable-sink behavior, safe authentication/authorization errors and an operational review. A scanner is not legal sign-off.

Human owner, qualified reviewers, exact content revision and decision links: PENDING. Dependent logging/telemetry activation remains blocked by the foundation approval record.
