# Privacy notice for the read-only v1 (DRAFT)

> **OUT OF DATE (2026-11-15):** the owner later decided that v1 includes sign-in with a Google account. This draft says the app collects nothing, which would then be wrong. It must be rewritten to cover the name and email received from Google, consent, under-18s and deletion before publication (OQ-030, `docs/operations/GOOGLE_SIGNIN_PLAN.md`).

**Status: DRAFT, NEEDS REVIEW (OQ-029).** Written by Claude Code (agent) on 2026-11-15 from what the code does today. It is not legal advice and not approved. Before publication: (1) the owner confirms every statement against the live app, (2) a lawyer reviews the wording and answers the questions in `docs/operations/LAUNCH_APPROVALS.md` step 2, (3) native Telugu and Hindi speakers translate and check it. No statute, section number or date is cited here on purpose; add them only after counsel confirms them (OQ-003).

Scope: the read-only v1 decided by the owner on 2026-11-15 (OQ-021). If any personal-data feature is switched on later, this notice must be replaced first.

---

## Pushkara Mitra: Privacy notice

_Last updated: [date of publication]_

### Who we are

Pushkara Mitra is an independent application. It is not an official application of any government, temple trust or the organisers of the Godavari Pushkaralu.

It is run by **Krishna Murthy Raju G**, an individual (Dream Team Engineers). For any privacy question, complaint or request, write to **dreamteamtech@zohomail.in**. We aim to reply within [NEEDS REVIEW: reply time to be set with counsel].

### The short version

This version of the app only shows information. You do not create an account, sign in, fill in a form, share your location, upload a photo or pay anything. **We do not ask for, collect or store your name, phone number, location or any other personal details.**

### What stays on your phone

The app saves two choices in your browser, on your device only. They are never sent to us:

- your language (Telugu with English, Hindi with English, or English only), and
- your colour theme.

It also keeps a copy of the app's own files (pages, styles, icons, fonts) so the app can open when you have no signal. These are the same public files for everyone. They contain nothing about you.

You can remove all of this at any time by clearing the site data for this app in your browser settings.

### What happens when you open the app

Like any website, when your phone asks for a page, the request travels over the internet and reaches our hosting provider, **Cloudflare**, which delivers the site. For this to work, Cloudflare handles technical details of the request, such as your IP address and browser type. We do not use this to identify you, and the app does not add cookies, advertising or analytics tools, and loads nothing from other companies' servers. The app itself does not write these details to any log or database.

[NEEDS REVIEW: counsel to confirm how Cloudflare's own handling of visitor IP addresses should be described, whether Cloudflare is a processor, and where its servers are. Do not publish this paragraph unchanged.]

### Phone calls

The Help screen lists emergency and helpline numbers. Tapping "Call" asks you to confirm; only after you tap "Call now" does your phone's own dialler open. The call is made by your phone and network. The app does not see, record or store the call or the number you dial, and sends nothing to us.

### Links to other websites

Some screens link to official websites. When you follow a link you leave this app and that website's own privacy rules apply.

### Location

The app does not ask for your location and does not use it in this version.

### Children

The app collects no personal details from anyone, including children.

### Information shown in the app

Dates, ghats and helpline numbers come from official pages where we found them, or were supplied by the owner and are marked as unverified. They can be wrong or out of date. For anything urgent or official, use official sources and the national emergency number.

### Changes to this notice

If we ever add a feature that collects personal details (for example groups, location sharing or alerts), we will publish a new notice and ask for your consent where needed before that feature is turned on.

### Your rights and complaints

Write to **dreamteamtech@zohomail.in** about anything in this notice. [NEEDS REVIEW: counsel to say whether rights of access, correction, erasure or a named complaint route must be stated for an app that holds no personal data, and to give the correct wording and any regulator reference.]

---

## Facts this draft relies on (owner: please verify before publishing)

| Statement                                         | Evidence in the repository                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Only language and theme are stored, on the device | `web/src/shared/prefs/preferences.ts` (`pm.locale`, `pm.theme`); data inventory DI-11                                 |
| Offline copy holds public files only              | data inventory DI-13; service worker                                                                                  |
| No analytics, ads, cookies or third-party loads   | search of `web/src` and `src` on 2026-11-15 found no analytics, `console` logging or third-party asset hosts          |
| No personal-data feature is on                    | `web/src/shared/flags/flags.ts`, `src/flags.ts`; owner decision 2026-11-15 (OQ-021)                                   |
| Helplines dial only after confirmation            | `web/src/features/help/HelplineList.tsx`; guard test allows `tel:` only there                                         |
| The Worker keeps no request logs of its own       | no logging code found; **Cloudflare dashboard log and analytics settings not checked by the agent**: owner to confirm |
| Outbound links go to official sites               | `https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/` and similar                                                |
