# Consent and privacy wording: proposed drafts for counsel (OQ-030, OQ-041, OQ-029)

**Status: DRAFT, NEEDS REVIEW.** Written 2026-11-21 by Claude Code (agent) at the owner's request, for the owner to take to counsel (OQ-024). Not legal advice, not approved, no independent reviewer. No statute, section number, age threshold or date is cited on purpose (OQ-003, Hard Rule 6). Every `[COUNSEL]` marker is a decision or wording only a lawyer can give. English only: Telugu and Hindi are produced and native-reviewed after the English is settled (O1).

Sources of fact: `web/src/shared/i18n/en.json` keys `account.*`, `privacy.*`, `map.locate.*` as of this date; `docs/operations/GOOGLE_SIGNIN_PLAN.md`.

## 1. Problems found in the current in-app wording

| #   | Where                                     | Problem                                                                                                                                                                                                                                                        | Proposed fix                                               |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1  | `privacy.what.p`                          | Says "do not use your location", but the map has "Show my location" (`map.locate.*`). Contradiction: the position stays on the phone, but the notice must say so.                                                                                              | Add a Location section (draft 3.4).                        |
| P2  | `privacy.keep.p` vs. A2 in PROJECT_STATUS | A name cookie and Google sign-in are not fully described (what the cookie holds, name shown after refresh). The agent has not re-verified the exact cookie contents for this draft: **owner or agent to verify against `src/security/session.ts` before use.** | Draft 3.3 uses placeholders in brackets.                   |
| P3  | `account.consent`                         | One tick covers sign-in only. It names the purpose but not the right to withdraw, and does not link the notice at the point of ticking.                                                                                                                        | Draft 2.1.                                                 |
| P4  | `account.parent.consent`                  | A self-declared tick by the child. `privacy.child.p` already admits this may be insufficient. Whether it is lawful is a counsel question; the product decision (verify, block under-18, or keep tick) is open.                                                 | Three options in section 4; the owner picks after counsel. |
| P5  | `privacy.contact.p`                       | No reply time, no rights list, no complaint route.                                                                                                                                                                                                             | Draft 3.6 with `[COUNSEL]` slots.                          |
| P6  | `privacy.keep.p`                          | Cloudflare's handling of IP addresses and where it happens are not stated (draft notice already flagged it).                                                                                                                                                   | Draft 3.3, `[COUNSEL]`.                                    |

## 2. Consent text (OQ-030)

### 2.1 Sign-in consent, adult

Label next to the tick box (replaces `account.consent`):

> I agree that Pushkara Mitra may receive the name and email address of my Google account, only to sign me in and show my name in the app. I can sign out and delete this at any time. [Privacy notice]

- The notice link opens the privacy screen in the same tab.
- The box is unticked by default. The Google button stays hidden until it is ticked (already so).
- Consent is for one purpose only. If a purpose is ever added (alerts, groups), a new consent is asked; the tick is not reused.

### 2.2 Withdrawal

Shown on the signed-in screen and on the delete screen:

> You can withdraw this consent at any time by choosing "Delete my account and data". Withdrawing is as easy as signing in. If you withdraw, you can still use the app without signing in.

`[COUNSEL]`: confirm that deleting the signed cookie plus Google-side access removal is a complete withdrawal given nothing is stored server-side, and whether a "last consent given" record is needed (OQ-026 defers storage; consent record location is open).

### 2.3 Under-18, option wording

Only the chosen option is built.

- **Option A, block under-18** (smallest data duty; recommended to ask counsel about first): "Sign-in is for people aged 18 or over. You can use the rest of the app without signing in."
- **Option B, parent or guardian declaration** (current): "I am under 18 and my parent or guardian has agreed that I may sign in." Plus the existing note. `[COUNSEL]`: does this satisfy the verifiable-consent duty, or is it not enough?
- **Option C, verified parental consent:** needs a method and a place to store the record; not buildable until counsel names an acceptable method and OQ-026 is settled.

`[COUNSEL]`: the age at which a person counts as a child for this purpose, and whether tracking, behavioural monitoring or targeted advertising limits matter here (the app has none).

## 3. Privacy notice (OQ-029), proposed text

Replaces the `privacy.*` copy once counsel and native reviewers approve. English `_Last updated: [date of publication]_`.

### 3.1 Who runs this app

Pushkara Mitra is an independent app. It is not an official service of any government, temple trust or the Pushkaralu organisers. It is run by Krishna Murthy Raju G, an individual (Dream Team Engineers), who decides how your information is used. `[COUNSEL]`: confirm "individual" is the right description and what the notice must call this role.

### 3.2 What we receive

Only if you sign in with Google: the name and email address of your Google account. We never see your Google password. We do not ask for your contacts, phone number, photos or address book.

### 3.3 What we keep, and for how long

- Our servers store nothing about you: there is no database for personal data in this version.
- If you choose to stay signed in, a small signed cookie on **your** device holds `[VERIFY in src/security/session.ts: exactly which fields, e.g. name and email]`. It lasts up to 7 days or until you sign out or delete.
- Your language and theme choices stay on your device and are never sent to us.
- Our hosting provider, Cloudflare, handles technical details of each request, such as your IP address and browser type, to deliver the app. The app itself does not log them. `[COUNSEL: describe Cloudflare's role, whether it is a processor, and where it handles data. Do not publish this line unchanged.]`
- No analytics, advertising or third-party trackers are used. `[OWNER: re-verify against the current build before publishing.]`

### 3.4 Location

The map has an optional "Show my location" button. If you tap it your phone asks permission. Your position is shown on the map **on your phone only**. It is not sent to us, not saved and not shared. Tracking stops when you leave the map screen. If you say no, the map works without it. `[COUNSEL, OQ-041: confirm this wording; confirm no further notice or consent is needed given nothing leaves the device; settle whether the feature may go to production and the under-18 position.]`

Not in this version: sharing your location with a group, SOS alerts, and location history. If we add them we will publish a new notice and ask for consent first.

### 3.5 Children

Sign-in `[is for people aged 18 or over | needs a parent or guardian's agreement, which you tell us by ticking a box]` (matches the option chosen in 2.3). The app has no features aimed at children, no tracking and no advertising.

### 3.6 Your choices, rights and complaints

You can use the app without signing in. You can sign out, delete your sign-in data, and remove the app's access in your Google Account settings at any time. Write to **dreamteamtech@zohomail.in** about any question, correction, erasure or complaint. We aim to reply within `[COUNSEL: reply time]`. `[COUNSEL: rights to list, whether a named complaint route or regulator reference must appear, and the right to nominate someone.]`

### 3.7 Changes

If we change how your information is used we will update this notice and ask again where consent is needed.

## 4. Questions to take to counsel (add to the LAUNCH_APPROVALS step 2 list)

1. Is a self-declared parent or guardian tick enough for under-18 sign-in, or should v1 block under-18s (2.3)?
2. Is a signed device-side cookie holding name and email, with nothing stored on our servers, still "processing" that needs consent and a notice? Is the wording in 2.1 and 3.3 adequate?
3. How must withdrawal work when nothing is stored server-side (2.2)? Is a consent record required, and where may it live (OQ-026)?
4. Is the on-device-only location display (3.4) covered by the notice alone, and may it go to production (OQ-041)?
5. How should Cloudflare's handling of IP addresses and its location be described (3.3)?
6. Which rights, reply time and complaint route must the notice state (3.6)?
7. Must the notice and consent screen be shown in Telugu and Hindi as well as English, and who may certify the translations (OQ-029)?
8. Is Google's own verification (privacy-policy link, scopes) enough on their side, and does opening sign-in beyond the 3 test users change any of the above?

## 5. What happens next

1. Owner decides the under-18 option (2.3) before or after counsel; the agent builds only that one.
2. Counsel returns the answers; the agent updates this file and the OQ rows. Nothing moves to `PASS` or off `NEEDS REVIEW` without a named reviewer and date.
3. English text goes into `en.json`; Telugu and Hindi drafts are produced and then read by native speakers (O1).
4. Only then is sign-in opened beyond test users, and the notice replaces the draft banner.

Engineering readiness and legal sign-off are reported separately; nothing here certifies compliance.
