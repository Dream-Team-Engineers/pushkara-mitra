# Data Protection Impact Assessment (DPIA) v1 (draft)

Status: **DRAFT. Risk ratings are deliberately left blank for human review.** Owner: LEAD. Reviewers: DEV2 and counsel.

## 1. Processing described

- Real-time group location sharing during Adi Pushkaralu (dates are configuration and unconfirmed: OQ-004).
- Missing-person and lost-and-found reports.
- Vendor directory, payments and notices.
- Offline-first PWA, Telugu first.

See [data-inventory.md](data-inventory.md) and [ADR 0004](../decisions/0004-ephemeral-location.md).

## 2. Necessity and proportionality

| Question                                                   | Answer (to complete)                             |
| ---------------------------------------------------------- | ------------------------------------------------ |
| Is each data element necessary for its stated purpose?     |                                                  |
| Could the purpose be met with less data or on-device only? | Location is memory-only by design                |
| How is consent obtained and withdrawn per purpose?         | See consent-register.md                          |
| How long is each element kept and how is deletion proved?  | See data-inventory.md and post-event-deletion.md |

## 3. Risk assessment

Likelihood and impact are `UNRATED` until reviewed by a human. Mitigations are engineering proposals.

### 3.1 Location sharing

| Risk                                                | Likelihood | Impact  | Mitigation (proposed)                                                             | Residual |
| --------------------------------------------------- | ---------- | ------- | --------------------------------------------------------------------------------- | -------- |
| Stalking or coercion through a shared group         | UNRATED    | UNRATED | Explicit opt-in, visible sharing indicator, one-tap stop, auto-expiry, no history | UNRATED  |
| Location retained in logs, storage or crash reports | UNRATED    | UNRATED | ADR 0004, static guard test, log scrubbing                                        | UNRATED  |
| Fake or hijacked group to harvest locations         | UNRATED    | UNRATED | Join approvals, short-lived invite codes, rate limits                             | UNRATED  |
| Crowd-density inference from aggregate data         | UNRATED    | UNRATED | No aggregation or analytics on location                                           | UNRATED  |

### 3.2 Missing persons

| Risk                                       | Likelihood | Impact  | Mitigation (proposed)                                                     | Residual |
| ------------------------------------------ | ---------- | ------- | ------------------------------------------------------------------------- | -------- |
| False reports or impersonation of a family | UNRATED    | UNRATED | Verification path with the authorities, report review                     | UNRATED  |
| Publication of a child's data              | UNRATED    | UNRATED | Blocked pending counsel (ADR 0006). Minimal fields, restricted visibility | UNRATED  |
| Retention beyond the need                  | UNRATED    | UNRATED | Auto-expiry, post-event deletion                                          | UNRATED  |

### 3.3 Children and dependents

| Risk                                             | Likelihood | Impact  | Mitigation (proposed)                    | Residual |
| ------------------------------------------------ | ---------- | ------- | ---------------------------------------- | -------- |
| Processing a child's data without lawful consent | UNRATED    | UNRATED | No implementation until counsel approves | UNRATED  |
| Profiling or tracking of a child                 | UNRATED    | UNRATED | No tracking and no ads                   | UNRATED  |

## 4. Sign-off

| Role    | Name | Date | Decision |
| ------- | ---- | ---- | -------- |
| LEAD    |      |      |          |
| DEV2    |      |      |          |
| Counsel |      |      |          |
