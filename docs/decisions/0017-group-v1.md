# 0017. My Group for version 1

Status: Proposed. Built for staging only (owner scope decision 2026-11-21, OQ-021). Production stays off until the owner approves the release; counsel review of this design is recorded with the counsel details (OQ-024), still pending.
Date: 2026-11-21

## Context

The owner chose version 1 with Group, SOS and Pass. Group lets a family or party at the Pushkaralu see each other on the phone so nobody gets lost. Location is the most sensitive data the app could touch (ADR 0004, CLAUDE.md Hard Rule 1), and group sharing invites stalking and coercion. The backend routes for creating, joining and leaving groups already exist (ADR 0012, `src/routes/v1.ts`) and keep only opaque IDs in D1: no names, no coordinates.

## Decision

1. **Groups (D1, no location, no person names).** A signed-in person creates a group, optionally typing a group name (at most 16 letters or digits in any script, single spaces allowed; stored in `group_.name`, shown to members, cleared if the leader erases their account; owner decision 2026-11-23, data inventory DI-17), and gets an 8-character join code. **One code per group (owner decision 2026-11-23):** the code stays the same from creation until the group ends. It is derived from the group id with a server secret (HMAC-SHA-256), so it is never stored; D1 keeps only its hash, and every member is shown it again on the Group screen. A person can leave at any time; a group with nobody left is deleted; every group expires after 14 days (to be aligned with the event window, BF-08). Maximum 10 members, owner included, enforced by the server (the join is refused with `GROUP_FULL`). The owner can remove a member (`POST /api/v1/groups/{id}/remove` with the member's per-group handle); removal closes that person's live connection (close code 4002) and adds their pseudonym to `group_block` (migration 0005), so the unchanged code cannot bring them back. Members invite others with a **Share** button that opens the phone's share sheet (WhatsApp, SMS and others), with WhatsApp and Copy as the fallback when the browser has no share sheet.
2. **Live room (Durable Object memory only).** While the Group screen is open, the app holds a WebSocket to the group's `GroupLocation` object. The room keeps, for each connected member: a per-group handle (a hash of the group and the person's pseudonym, not linkable across groups), their first name from the sign-in (max 20 characters) and, only while they share, their latest position rounded to about 1 m with its accuracy. Nothing is written to storage, KV, D1, logs or error reports (ADR 0004 items 1 and 2 unchanged). Closing the screen or the app drops the member and their position. A position not refreshed for 2 minutes is no longer shown to anyone.
3. **Sharing is off by default and is asked each time.** The share switch starts off whenever the screen opens. The first time, the person ticks a consent line, recorded through `POST /api/v1/me/consents` (purpose `group`, notice version `group-1`). Positions are sent only while the switch is on and the screen is in the foreground; no background tracking exists. The person sees a clear "You are sharing" state and can stop with one tap.
4. **Who sees what.** Only current members of that group, while connected. Leaving the group closes the leaver's connection at once. There is no history, no "last seen", no replay and no export. Members who are sharing are also drawn on a small map inside the Group screen (when the regional map archive is on the site); the map gets positions from the same in-memory room state and is not shown on the separate Map tab, so positions still flow only while the Group screen is open (added 2026-11-23).
5. **Screen and roles (2026-11-23).** The Group screen shows a compact card first: the group name, the person's role (Group Owner for the owner, Member otherwise), the member count out of 10 and the number online, and the group code with a Share button. The live room labels the Group Owner in the member list (the Worker passes the role from D1).
6. **Kill switches.** Worker variables `FLAG_GROUPS` (groups) and `FLAG_GROUP_LOCATION` (live room) must each be exactly `enabled`; the frontend `myGroup` flag is on only in the staging build. Production has none of them.

## Threat model (summary)

| Threat                                     | Mitigation in this build                                                                                                        | Still open                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Stalker joins with a leaked code           | Code expires in 24 hours and after 20 uses; members see every name in the list; the owner removes a member and they are blocked | Per-member approval; removing a member who never opens the screen |
| Coercion: someone forces a person to share | Sharing must be switched on by the person each time; visible state; leave any time                                              | Counsel view on under-18s (OQ-030)                                |
| Location kept or leaked by the server      | Memory only, no storage API (guard tests), no coordinates in logs, no history                                                   | Production plan choice (OQ-020/OQ-028)                            |
| Cross-group tracking                       | Per-group handles; IDs are pseudonyms                                                                                           | —                                                                 |
| Abuse or flooding                          | Same-origin check, sign-in, membership check, rate limit, 200-byte messages, one update per 3 seconds, 20 connections per room  | —                                                                 |
| Children                                   | Same rules as sign-in consent (OQ-030)                                                                                          | Counsel decision                                                  |

## Consequences

- Staging needs a D1 database bound as `DB` with the migrations applied before groups work; without it the routes answer 503 and the app says groups are unavailable.
- A Durable Object restart drops the room; the app reconnects and the person shares again (privacy-positive, ADR 0004 trade-off).
- The privacy notice must describe group sharing before production (OQ-029).
