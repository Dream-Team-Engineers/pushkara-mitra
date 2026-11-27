# Privacy notice additions: member names, Map pins, Contact us, favourite ghats, colour choice (DRAFT)

**Status: DRAFT, NEEDS REVIEW (OQ-047, OQ-029, OQ-030).** Written by Claude Code (agent) on 2026-11-27 from what the code does today. It is not legal advice and not approved. English only: Telugu and Hindi need native review before use. No statute, section number or date is cited on purpose. Every statement below is checked against the code, with the evidence in the table at the end. Legal sign-in is reported separately from engineering readiness.

**Known gap in the live in-app notice (`privacy.keep.p`):** it says "Nothing is stored in a database". That is no longer true for staging: group names, member first names, partner applications and counters are in D1 (DI-17, DI-20, DI-24). It must be replaced before any launch. NEEDS REVIEW.

---

## 1. Your first name in a group (NEEDS REVIEW)

When you join or create a group while signed in, we keep the first word of your Google name (at most 20 characters) with your membership. The other members of that group see it on the Group and Map screens, including when you are offline. It is never shown outside your group, and you do not type it.

We delete it when you leave the group, when the leader removes you, when the group ends (groups end after 14 days and a daily clean-up then deletes them), and when you use "Delete my account and data".

## 2. Map pins (NEEDS REVIEW)

Pins for ghats and other places are the same for everyone and come from the app's own data. They are not about you.

If you choose to share your position with your group, other members who share also appear as pins with their first names. Positions are held in memory only while the group room is open. They are never written to a database, file or log, and are gone when you stop sharing or close the app. Sharing is off until you switch it on. The app does not use your position for anything else.

## 3. Contact us (NEEDS REVIEW)

The Contact us form helps you write an email to dreamteamtech@zohomail.in. What you type (topic, your name, an optional mobile number, your message) is placed in a new email in your own email app. The app does not send or store it. Nothing is sent until you send that email yourself.

If you send it, we receive the email and whatever your email provider adds, such as your address. We use it only to reply and to deal with your request. [NEEDS REVIEW: counsel to set how long contact emails are kept and who may read them. No retention period is decided yet.]

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

## Not yet checked

- The sharing switch default for group location: confirm in the live app that it is off until chosen.
- Whether the sweep has run on staging: it is scheduled for 03:30 UTC; check the Cloudflare cron log after the first run.
- Contact email retention and the age rule for people who write in (OQ-046 covers partners only).
