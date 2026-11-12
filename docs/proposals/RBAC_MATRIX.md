# RBAC matrix (proposed permission domains)

Status: **PROPOSED — not approved (BF-03).** Prepared 2026-11-11 (IST). No role exists, no assignment is possible, no admin route is active. Related: [BF recommendations](BF_DECISION_RECOMMENDATIONS.md), [ADR 0012](../decisions/0012-backend-architecture-and-d1.md), [data model](DATA_MODEL_PROPOSAL.md).

## Rules (proposed)

1. Deny by default. A request is allowed only when a server-side rule names the actor's current role, the operation and the scope.
2. Authority comes from a server-side `role_assignment` read per request (or from a short-lived server cache with revocation), never from a frontend role flag, a decoded token claim or a URL.
3. Cloudflare Access proves who the staff member is; it does not grant a role. A verified Access identity with no assignment gets 403.
4. Separation of duties: the author of a change cannot approve it; nobody assigns or approves their own role.
5. Every staff operation writes an audit record (no free text, no coordinates).
6. Pilgrim operations resolve ownership from the session, never from an id in the request.

## Actors

| Actor            | Who                                                                 | Authenticated by               |
| ---------------- | ------------------------------------------------------------------- | ------------------------------ |
| Visitor          | Anyone, no account                                                  | nothing                        |
| Pilgrim          | Person using group or pass features (if BF-01 approves any account) | pilgrim session                |
| Content operator | Drafts public content                                               | Access + role assignment       |
| Safety moderator | Reviews safety-related items                                        | Access + role assignment       |
| Operations staff | Runs partner inquiries and operational tasks                        | Access + role assignment       |
| Approver         | Approves content and role grants                                    | Access + role assignment + MFA |

## Matrix (✔ allowed within scope; blank = denied)

| Resource / operation                                                                 | Visitor                                               | Pilgrim | Content operator | Safety moderator    | Operations staff                | Approver                                |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------- | ---------------- | ------------------- | ------------------------------- | --------------------------------------- |
| Public content: read approved                                                        | ✔                                                     | ✔       | ✔                | ✔                   | ✔                               | ✔                                       |
| Content item: create/edit draft (scope: own drafts)                                  |                                                       |         | ✔                |                     |                                 |                                         |
| Content item: submit for review                                                      |                                                       |         | ✔                |                     |                                 |                                         |
| Content item: approve/withdraw (not own)                                             |                                                       |         |                  | ✔ safety items only |                                 | ✔                                       |
| Content item: read drafts (scope: all)                                               |                                                       |         | ✔                | ✔                   |                                 | ✔                                       |
| Own pass/session/consent: read, withdraw (scope: self)                               |                                                       | ✔       |                  |                     |                                 |                                         |
| Own group: create, invite, revoke invite, leave (scope: groups owned or joined)      |                                                       | ✔       |                  |                     |                                 |                                         |
| Other users' pass or group data                                                      |                                                       |         |                  |                     |                                 |                                         |
| Live location of group members (scope: same group, active sharing only, memory only) |                                                       | ✔       |                  |                     |                                 |                                         |
| Partner inquiry: read/triage (scope: partner)                                        |                                                       |         |                  |                     | ✔                               |                                         |
| Partner inquiry: delete                                                              |                                                       |         |                  |                     | ✔                               | ✔                                       |
| Missing-person or child records                                                      | blocked pending ADR 0006 review for every actor       |         |                  |                     |                                 |                                         |
| Audit log: read                                                                      |                                                       |         |                  |                     |                                 | ✔ (read-only, no edit/delete by anyone) |
| Role assignment: grant/revoke                                                        |                                                       |         |                  |                     |                                 | ✔ (never to self)                       |
| Payment reference: read (scope: finance)                                             |                                                       |         |                  |                     | ✔ only if finance scope granted |                                         |
| Legal request register and holds                                                     | restricted to the nodal officer role, not yet defined |         |                  |                     |                                 |                                         |

## Who assigns, reviews, revokes

| Role             | Assigned by                                                                      | Reviewed                                         | Revoked by                                 | Expiry                         |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------------------------ |
| Content operator | Approver                                                                         | every 30 days during the event run-up (proposal) | Approver; emergency revoke by any approver | assignment carries an end date |
| Safety moderator | Approver, with the safety owner's written request                                | as above                                         | Approver or safety owner                   | end date                       |
| Operations staff | Approver                                                                         | as above                                         | Approver                                   | end date                       |
| Approver         | Two existing approvers, or the owners at bootstrap (a one-time, documented step) | as above                                         | Another approver or the owners             | end date                       |
| Pilgrim          | Created by the user only if BF-01 approves accounts; no staff grants             | n/a                                              | The user, or staff on abuse (audited)      | session expiry                 |

The bootstrap of the first approver is itself a gate decision for the owners; it must not be done by code that trusts a hard-coded email.

## Tests required before any role code ships

All with synthetic principals, run in CI (no claim until they actually run):

- Unauthenticated request to any protected route: 401, no body detail.
- Verified Access identity with no assignment: 403.
- Each role attempting each denied cell above: 403.
- Cross-user: pilgrim A requesting pilgrim B's pass, group or invitation: 404, same body as a missing id.
- Escalation: operator editing their own assignment, approving their own draft, granting themselves a role: rejected and audited.
- Revoked: a request after revocation (and after a simulated D1 restore that resurrects the old row) is denied.
- Expired assignment: denied.
- Forged claims: a token or header asserting `role=approver` changes nothing; Access JWT with wrong `aud`, wrong `iss`, expired, or unknown `kid`: 401.
- Fail closed: a role lookup error returns 503 or 403, never allow.
