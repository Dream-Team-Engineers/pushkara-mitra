# Content workflow design (draft, publish, approve, withdraw)

Status: **PROPOSED — design only.** Prepared 2026-11-12 (IST). Contract draft: [content-workflow.openapi.yaml](../contracts/content-workflow.openapi.yaml) (valid YAML, parsed locally; not a validated OpenAPI check). Builds on the [data model](DATA_MODEL_PROPOSAL.md) tier 1, [RBAC matrix](RBAC_MATRIX.md) and [Access verifier](../security/access-jwt-verification.md). Creates no endpoint, table or role.

## 1. Purpose

Let named staff publish public guidance (ghats, stays, travel, updates, notices) that visitors can trust: every item has a source, was approved by someone other than its author, and can be withdrawn at once. Candidate or unverified records are never shown as approved guidance.

## 2. State machine

| From      | Action    | To                   | Who (permission)                                                                      | Rules                                                                                           |
| --------- | --------- | -------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| (none)    | create    | draft                | content operator (`content.draft`)                                                    | Source name and retrieval date required                                                         |
| draft     | edit      | draft (new revision) | author only                                                                           | `If-Match` on the revision; stale gives 409                                                     |
| draft     | submit    | in_review            | author                                                                                | Fields re-validated server-side                                                                 |
| in_review | approve   | approved             | approver or safety moderator for safety items (`content.approve`), **not the author** | Approves the exact revision shown; records reviewer ref and date                                |
| in_review | send back | draft                | approver                                                                              | Reason is a fixed code, no free text                                                            |
| approved  | edit      | (blocked)            | nobody                                                                                | An edit creates a new draft revision; the approved one stays live until the new one is approved |
| approved  | withdraw  | withdrawn            | any approver, or safety moderator for safety items (`content.withdraw`)               | Takes effect on the next read; audited                                                          |
| withdrawn | restore   | draft                | approver                                                                              | Never straight to approved                                                                      |

Any other transition is 409. All transitions write an audit record (actor ref, action, target, outcome, request id; no text).

## 3. Rules the server enforces

1. Deny by default; role and scope come from a server-side assignment, never from the token or a client flag.
2. Four eyes: approver id differs from author id, checked on the server.
3. Public reads return only `approved`. A missing, draft, in-review or withdrawn id gives the same 404.
4. No cross-language fallback; each locale is its own item.
5. Strict schemas: unknown fields rejected, limits as in the contract (title 120, 12 paragraphs of 600), body size capped (413).
6. `synthetic` items can never be approved in production (checked by environment flag, proposed).
7. Output is plain text; the frontend renders it as text, never as HTML.
8. Staff routes require `Origin` allow-list and a custom header (CSRF), per BF-04 proposal.

## 4. Acceptance tests (all synthetic; to be written with the implementation)

- Unauthenticated: 401. Verified identity with no assignment: 403. Each role against each denied operation: 403.
- Author approves own item: 403, audited. Approver then another approver approves: 200.
- Edit of an approved item creates a draft and leaves the live revision unchanged.
- Stale `If-Match`: 409. Illegal transition: 409.
- Withdraw then public read: 404 on the next request.
- Revoked or expired assignment denies, including after a simulated restore that resurrects the row.
- Oversize and unknown-field bodies rejected; error bodies never echo input.
- Every transition produces exactly one audit record, with no content text in it.
- Frontend: renders provenance and `synthetic`/`status` flags; a withdrawn item disappears after refresh; stale and offline states unchanged.

## 5. Caching (proposal for review)

Public lists and items are small and read-heavy, so an edge cache with a short lifetime fits (this is also what keeps D1 reads low, ADR 0012). Withdrawal must take effect quickly, so choose a short `s-maxage` plus purge-on-withdraw, or no edge cache for safety kinds. The service worker never caches `/api`. Exact numbers need the load test and a reviewer decision.

## 6. Delivery order (after gates)

1. Owners name the first approver and the identity provider; BF-02 and BF-03 are decided.
2. Data contract for `content_item` approved (tier 1 has no personal data except staff refs).
3. Migration and repository module with local synthetic tests.
4. Key fetching for the Access verifier, then the staff routes behind a disabled flag.
5. Public read routes, then the frontend resources replace the synthetic fixtures one kind at a time.
6. Content team enters real, sourced items; native-language review before approval.

## 7. Open items

- Which `kind`s count as safety items and who the safety moderator is.
- Retention of revisions and of withdrawn items.
- Whether staff need a screen in this app or a separate tool behind Access.
- Edge-cache lifetime and purge method.
- Licence and provenance rules for map-derived or third-party facts (asset register).
