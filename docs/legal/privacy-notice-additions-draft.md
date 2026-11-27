# Privacy notice additions: member names, Map pins, Contact us, favourite ghats, colour choice (DRAFT)

**Status: DRAFT, NEEDS REVIEW (OQ-047, OQ-029, OQ-030).** Written by Claude Code (agent) on 2026-11-27 from what the code does today. It is not legal advice and not approved. English only: Telugu and Hindi need native review before use. No statute, section number or date is cited on purpose. Every statement below is checked against the code, with the evidence in the table at the end. Legal sign-in is reported separately from engineering readiness.

**Known gap in the live in-app notice (`privacy.keep.p`):** it says "Nothing is stored in a database". That is no longer true for staging: group names, member first names, partner applications and counters are in D1 (DI-17, DI-20, DI-24). It must be replaced before any launch. NEEDS REVIEW.

---

## 1. Your first name in a group (NEEDS REVIEW)

When you join or create a group while signed in, we keep the first word of your Google name (at most 20 characters) with your membership. The other members of that group see it on the Group and Map screens, including when you are offline. It is never shown outside your group, and you do not type it.

We delete it when you leave the group, when the leader removes you, when the group ends (groups end after 14 days and a daily clean-up then deletes them), and when you use "Delete my account and data".

## 2. Map pins (NEEDS REVIEW)

Pins for ghats and other places are the same for everyone and come from the app's own data. They are not about you.

If you choose to share your position with your group, other members who share also appear as pins with their first names. Positions are held in memory only while the group room is open. They are never written to a database, file or log, and are gone when you stop sharing or close the app. The first time, sharing starts only after you tick that you agree and switch it on; your agreement is recorded. After that, sharing is on by default: it starts when you open the Group or Map screen, your browser still asks for permission to use your position, and you can switch it off on the screen at any time (it then stays off until you open the screen again). The app does not use your position for anything else. [NEEDS REVIEW: owner decision 2026-11-27, sharing on by default. Counsel to confirm that a recorded earlier agreement, shown again in the notice, is enough, and whether the agreement should be asked again each time the notice version changes or after a set period.]

## 3. Contact us (NEEDS REVIEW)

The Contact us form helps you write an email to dreamteamtech@zohomail.in. What you type (topic, your name, an optional mobile number, your message) is placed in a new email in your own email app. The app does not send or store it. Nothing is sent until you send that email yourself.

If you send it, we receive the email and whatever your email provider adds, such as your address. We use it only to reply and to deal with your request. We keep emails you send for at least one year. [NEEDS REVIEW: owner decision 2026-11-27 is "at least one year"; counsel to confirm this period, say when the emails are then deleted, and say who may read them. The emails sit in the owner's own mailbox, not in this app, so deletion is a manual step to be written into the operations runbook.]

Please do not put medical details or details about children in the message.

## 4. Favourite ghats (NEEDS REVIEW)

When you star a ghat, its short code is saved in your browser on your phone (at most 30). It is used only to show those ghats first. It is never sent to us, holds no name, position or account, and is removed when you clear the site data for this app.

## 5. Your colour choice (NEEDS REVIEW)

Your choice of colour (green, saffron, blue or gold), like your language and light or dark theme, is saved in your browser on your phone only. It is never sent to us and is removed when you clear the site data for this app.

---

## Evidence for each statement (owner: please verify before publishing)

| Statement                                                   | Evidence in the repository                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| First word of the Google name, at most 20 characters        | `migrations/0009_member_name.sql`; data inventory DI-24                                                                                 |
| Shown to the group only; deleted on leave, removal, erasure | `src/db/repository.ts` (`leaveGroup`, `removeMember`, `eraseSubject`); DI-24                                                            |
| Deleted when the group ends                                 | `purgeEndedGroups`, `src/index.ts` `scheduled`, `wrangler.toml` cron (staging, deployed 2026-11-27); `tests/worker/group-purge.test.ts` |
| Positions are in memory only; never stored or logged        | ADR 0004; `tests/guards/no-location-persistence.test.ts`; DI-16                                                                         |
| Members who share appear as named pins                      | `web/src/features/map/Screen.tsx` (header comment on group pins)                                                                        |
| Contact us only builds a `mailto:` link; nothing is sent    | `web/src/features/contact/ContactUs.tsx` (`contactMailto`); `CONTACT_EMAIL`                                                             |
| Favourites are ghat ids in `pm.favs`, at most 30            | `web/src/shared/prefs/preferences.ts`; DI-11                                                                                            |
| Colour is `pm.accent` on the device only                    | `web/src/shared/prefs/preferences.ts`; DI-11                                                                                            |

## Changes made 2026-11-27 after owner direction

- The in-app notice (`privacy.keep.p`, English, Telugu, Hindi) no longer says "Nothing is stored in a database". It now names groups, first names, partner applications, counters and contact emails. The Telugu and Hindi are agent translations and need native review.
- Contact emails are kept for at least one year (owner decision). `contact.intro` says so in all three languages.
- Location sharing is on by default for a person who already agreed (`web/src/shared/group/groupClient.ts`, `shareByDefault`, `loadGroupConsent`). The first agreement still needs the tick and tap. This was kept on purpose: a recorded agreement is the gate, and the browser's own permission prompt still applies. Location is still never stored or logged.

## Not yet checked

- Whether the sweep has run on staging: it is scheduled for 03:30 UTC; check the Cloudflare cron log after the first run.
- The age rule for people who write in through Contact us (OQ-046 covers partners only).
- The data inventory (DI-11, DI-16) and OQ-047 still describe sharing as off by default and have no row for contact emails. Update them with this change.
