# Issue #24 remediation and delivery handoff

## Scope and actual authorization

LEAD selected the corrected standards replacement subject to final independent review, private/enforced GitHub governance, and any named non-author maintainer as independent reviewer. See FOUNDATION_APPROVAL_RECORD.md for actual evidence and unresolved G0/G1 inputs. This work prepares engineering controls and decision-ready changes; it does not authorize private-data activation or launch.

## Review-control implementation and bootstrap

1. Repair checked-but-pending review attestations and add adversarial regression coverage.
2. Add a read-only verifier of actual GitHub reviews. It rejects self/bot/unlisted/stale/dismissed approvals, blocking changes, malformed evidence, pagination truncation and head movement. The named non-author human may approve the current head; that is code review, not legal sign-off.
3. Independently review and merge the verifier PR under the existing explicitly recorded human process. The requesting user's final-review condition remains mandatory; the agent does not merge.
4. In a separate dependent PR, wire the review-evidence workflow to validator code from the trusted base revision and add its check name to the reviewed setup script. It must not execute PR-controlled validator code with elevated credentials. Initial absence of a trusted verifier is BLOCKED, never silently passed. A merge queue must fail closed until equivalent per-PR review evidence is supported.
5. After the owner supplies a suitable private-repository plan and humans review setup, apply settings only through the supported script and read back native protections. Do not label a dry run or CODEOWNERS as enforcement. No source exposure, purchase, settings bypass or production deploy is part of this approval.
6. Confirm source/signature integrity and final-head human review before every merge. Keep the original uncommitted checkout untouched.

## Ordered backlog

| Task                                   | Dependencies                                           | Acceptance and rollback                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private enforcement setup              | Owner plan availability, final reviewed setup          | Native approval/current checks/thread/signature/no-bypass controls verified; unsupported/unknown blocks; no automatic visibility/paid changes                                           |
| Standards and scope adoption           | LEAD source choice, qualified independent review       | Exact corrected text, reference/ADR reconciliation and stop-gate disposition; revert reviewed docs without rewriting history                                                            |
| G1 identity/security/privacy decisions | Named reviewers and owners                             | Every required BF row has actual concrete answers and review links; no invented retention/session/notice defaults                                                                       |
| Admin verifier + RBAC                  | Accepted G0/G1 and configured trust                    | Deny-by-default signature/issuer/audience/time/key-failure and path/method tests; no self-enrolment or cross-subject escape; rollout remains disabled until reviewed                    |
| Sessions, abuse and logging            | ADR 0008/0010 and BF approval                          | Expiry/rotation/revocation/CSRF/replay/input/rate/failure/redaction tests; synthetic fixtures and reviewed rollback                                                                     |
| Local D1 audit/consent                 | Approved minimal schema, purposes and retention        | Parameterized statements, ownership, append-only ordinary audit behavior, withdrawal/idempotency/concurrency/deletion/restore tests; no remote migration without separate authorization |
| First complete public business slice   | Approved publishing/data boundary and reviewed content | Authorized staff publishes one event → anonymous Telugu-first schedule; accurate unavailable/stale states; original licensed assets and native-language/accessibility review            |
| Functional staging verification        | Approved runtime PRs and protected staging path        | Actual URL/commit, integration/browser/offline/privacy/negative tests and rollback evidence; health-only and mocked results remain separately labeled                                   |
| Dependency compatibility               | OQ-022 and supported toolchain                         | Verify overrides and declared engines with actual compatible checks; npm audit zero alone is insufficient; reviewed dependency-only rollback                                            |

Later groups/location, directory, child/missing-person, payments/donations, notifications and production remain gated. Keep the full 26-item original-product target in the backlog rather than treating foundation delivery as the whole product.

## Issue closure

Keep #24 open while required approvals or native enforcement are pending. A closure comment must link standards and ADR decisions, concrete G1 contracts, independent/domain reviews on the actual revision, verified controls, check results and owned delivery issues. Preserve all historical merge facts and date new remediation truthfully.
