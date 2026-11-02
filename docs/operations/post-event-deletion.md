# Post-event deletion

Milestone M10 (2027-07-31): verified deletion, retention exceptions and a retrospective. Event dates are configuration and unconfirmed (OQ-004).

## Plan

1. **Inventory first.** Every stored element is listed in [data-inventory](../compliance/data-inventory.md) with its retention. Deletion jobs are built from that list.
2. **Delete by purpose:** group data, missing-person reports, accounts, consent records (per counsel), payment references (per accounting law), logs (per CERT-In if applicable).
3. **Exceptions** (legal hold, tax, an open police matter) are written down, approved by counsel, and given an end date.
4. **Processors:** request deletion from Cloudflare, Razorpay, Sentry and the SMS provider and keep their confirmations.
5. **Verify** with queries that prove zero rows, and by checking backups age out.
6. **Evidence:** store the verification output in `docs/compliance/compliance-evidence.md` references.
7. **Retrospective** within two weeks.

## Test before the event

Rehearse deletion on staging with synthetic data in M8. Location must already be absent (ADR 0004).
