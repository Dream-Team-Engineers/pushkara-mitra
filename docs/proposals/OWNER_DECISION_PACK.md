# Owner and counsel decision pack (Step 1)

Status: **PROPOSED — a request for decisions, not a record of any.** Prepared 2026-11-12 (IST) against `main` at `d873eb7`. Nothing here is approved. Each answer must be recorded by its named human with a date and link in [FOUNDATION_APPROVAL_RECORD](../decisions/FOUNDATION_APPROVAL_RECORD.md) or the matching ADR.

**Owner update, 2026-11-14:** Section 1 question 1 is deferred until before launch, at the owner's request. The legal entity and nodal/grievance contact are undecided; do not ask again during project completion or treat the question as answered. The deferral does not authorize live personal-data processing or remove the prelaunch gate. The repository is public for now under the updated ADR 0007; its protections still need live verification.

## 1. Questions for the owners (answer in one sitting)

| #   | Question                                                                                                   | Why it blocks                                                                             | Recommendation                                                                       | Tracks       |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
| 1   | Who is the data fiduciary (legal entity) and who is the nodal officer / grievance contact?                 | Notices, request register, legal hold, consent records                                    | Name a legal entity and a named person; interim contact allowed but must be recorded | OQ-023       |
| 2   | Who is the independent human reviewer for each PR, and who may approve security and privacy changes?       | #99 merged on 11 Nov with `pr-checklist` failing and no recorded independent human review | Name one reviewer per area; do not merge with a failing required check               | ADR 0007, F6 |
| 3   | Which Cloudflare plan will staging and production use, and who pays?                                       | Free caps at 100,000 requests/day and 429s over it                                        | Paid plan for staging and production; Free for dev and preview only                  | OQ-028       |
| 4   | Keep `run_worker_first = true` for all paths, or restrict it to `/api/*`, `/admin*`, `/auth*`, `/healthz`? | Every asset request is a billed Worker request today                                      | Decide after the load test, as an ADR 0011 amendment                                 | OQ-028       |
| 5   | Expected attendance and concurrent users on peak days (any official or organiser figure)?                  | Load test has no target                                                                   | Provide a figure or an organiser contact                                             | OQ-025       |
| 6   | Which identity provider will staff use with Cloudflare Access, and who owns the Cloudflare account?        | BF-02 and any admin route                                                                 | Choose one with enforced MFA; two account owners, not one                            | BF-02        |
| 7   | Who is the first approver (bootstrap) and who is the safety owner?                                         | BF-03: no role assignment is possible without one                                         | Two named people; documented one-time step                                           | BF-03        |
| 8   | Is a persistent pilgrim account ever needed?                                                               | BF-01, BF-04                                                                              | Keep accountless (owner already said none needed for public browsing)                | BF-01        |
| 9   | Which v1 features may be cut if time runs short?                                                           | Release blockers (master instructions section 16)                                         | Cut Pass, payments, donations, missing persons first                                 | Plan         |
| 10  | Who contacts the festival organisers about independence and any official data?                             | Branding and disclaimer risk                                                              | Name a person                                                                        | OQ-018       |

## 2. Questions for counsel (once engaged, OQ-024 / OQ-016)

No answer below may be taken from this repository; counsel gives them in writing and we record the source and date.

1. Is the app a Data Fiduciary or Significant Data Fiduciary, and which DPDP Rules provisions apply and from what date? (OQ-003 holds only secondary-source dates.)
2. May personal data be stored in D1 / Durable Objects, which cannot be pinned to India? (OQ-026)
3. Which CERT-In duties apply, including log retention and where logs may be held? (OQ-007, OQ-017)
4. What deletion and retention commitments are lawful given D1 Time Travel restores of 7 or 30 days? Is crypto-shredding acceptable? (OQ-027)
5. What are the verification, notice and consent requirements for any child or dependent feature? Should it be excluded from v1? (ADR 0006)
6. What process and legal basis govern requests from authorities, and is any interception or technical-assistance duty relevant given location is never stored?
7. Missing-person workflow: lawful basis, moderation and who may publish.
8. Donations: recipient, fund flow, tax, FCRA, receipts. Payments: merchant obligations before live activation.
9. Is the independent-app disclaimer text sufficient, and does the name "Pushkara Mitra" need trademark clearance? (OQ-019)
10. Vendor directory and sponsored placements: consumer-law and dark-pattern obligations.

## 3. Engineering review checklist for the merged design PRs

#101 to #104 merged on 11 Nov. They are proposals; merging does not approve them. A reviewer should confirm, and the record should state who and when:

- [ ] ADR 0012 option A, the Free-for-dev-only rule, and the thresholds (section 6 of the ADR).
- [ ] Data model: no personal-data table is created until its tier's gates are recorded.
- [ ] RBAC matrix: roles, separation of duties and the bootstrap step.
- [ ] BF-01 to BF-04 recommendations accepted, amended or rejected, each with a reviewer.
- [ ] Integration matrix statuses match what the app does (nothing is live).

## 4. Governance finding to resolve

PR #99 merged with `pr-checklist` red and three unticked human items. The route answers 404 for every locale and the frontend view is flag-off, so there is no user-visible effect, and I have not checked whether main is deployed. The owners should record whether the merge was an intended exception, and consider making the required check refuse to pass when the checklist is absent (it currently passes when absent).

## 5. After the answers

I can then proceed, with each item gated on its answer: branch protection script change (owners run it), environments and secrets checklist, Access JWT verification module behind a disabled route, and content-workflow contract drafts.
