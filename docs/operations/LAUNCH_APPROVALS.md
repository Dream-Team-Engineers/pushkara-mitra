# Launch approvals — step-by-step guide for the owner

**Owner and sole maintainer:** Krishna Murthy Raju G (GitHub `gkmraju`), acting as an individual. Contact: dreamteamtech@zohomail.in.
**Prepared:** 2026-11-14 by Claude Code (agent). This is a working checklist, not legal advice and not a compliance certificate. Each box is ticked only by the owner, with the evidence named next to it.

## The recommended route: launch read-only first

Every feature that handles personal data is switched off in code today: device location, My Group, live map, SOS, photo upload, missing persons, partner contact, payments and donations (`web/src/shared/flags/flags.ts`, `src/flags.ts`). With those off, v1 is a **read-only information app**: no accounts, no forms, nothing stored about the people using it.

That changes what has to be approved before launch:

| Needed for a read-only v1                                 | Can wait until the feature is switched on (v2+)                |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| Who runs the app, and a working contact (done, below)     | Accounts, sign-in, roles and sessions (G1, issue #24)          |
| A short privacy notice saying what is and isn't collected | Consent screens, retention and deletion rules                  |
| Verified content: dates, ghats, helplines, stays, travel  | Location sharing, groups, SOS (children/missing persons)       |
| Independent-app disclaimer reviewed                       | Donations, payments, partner listings                          |
| A plan that survives event-day traffic                    | India log sink, D1/Durable Object residency (OQ-017, 026, 027) |
| A real-phone test and an accessibility pass               | DPIA, CERT-In incident process for personal data               |

Each feature in the right-hand column must come back through this guide before its flag is turned on.

---

## Step 1 — Identity and contact ✅ decided 2026-11-14

- [x] Data fiduciary: **Krishna Murthy Raju G, as an individual** (OQ-023).
- [x] Grievance contact and nodal officer for requests from authorities: same person, **dreamteamtech@zohomail.in** (OQ-005, OQ-023).
- [x] Added to `SECURITY.md` and DPDP-10 in `docs/compliance/dpdp-checklist.md`.
- [ ] Make sure that mailbox is checked at least daily during the event, and that replies go out from it.

**Is a name enough for DPDP?** No. The name tells people _who_ is responsible. Under the DPDP Act, 2023 the responsible person (the "data fiduciary") also has duties that depend on what data is collected: a clear notice before collecting, consent where consent is the basis, care with children's data, security safeguards, breach reporting, deleting data when it is no longer needed, and answering grievances. For a read-only v1 that collects nothing, most of these have nothing to act on, which is the main reason to launch read-only first. Exact rules and start dates are in OQ-003 and must be confirmed by a lawyer.

## Step 2 — One session with a lawyer (item 2)

Strongly recommended even for v1. Book one consultation with an Indian technology/privacy lawyer and take this list:

1. For a read-only app that stores nothing, is a privacy notice enough? Cloudflare handles visitors' IP addresses to deliver the site. Does that make me a data fiduciary for v1, and what must the notice say? (OQ-003, OQ-023)
2. Is the independent-app disclaimer, in Telugu, English and Hindi, adequate so nobody mistakes this for an official government service? (OQ-019, OQ-018)
3. Can I use the name "Pushkara Mitra" and the event name without trademark issues? No government emblems are used.
4. My liability if published information (a date, a helpline) turns out wrong, and the wording that limits it.
5. Does CERT-In incident reporting apply to me as an individual running this site? (OQ-007)
6. Which licence should the repository use? It is public but marked "All rights reserved". (OQ-008)
7. For later: what is needed before switching on groups/location, SOS, missing persons, donations or payments? (OQ-016)

**Record it:** write the lawyer's name, the date and their answers in `docs/decisions/OPEN_QUESTIONS.md` (OQ-024 and each question above). If you decide to launch without a lawyer, write that decision and its date in OQ-024. It is your decision, but keep a record of it.

## Step 3 — Scope decision for v1 (item 3)

- [ ] Decide: "v1 is read-only. No accounts, no personal data, all personal-data features stay off. G1 decisions are deferred to v2."
- **Record it:** tell Claude "record the v1 read-only scope decision". It goes into `OPEN_QUESTIONS.md` (OQ-021) and `PROJECT_STATUS.md` with your name and the date.

If you want accounts or groups in v1 instead, the G1 decisions in `docs/proposals/OWNER_DECISION_PACK.md` (sign-in method, roles, retention, consent wording) must be made first, and the lawyer questions in step 2, item 7 become mandatory.

## Step 4 — Verified content (item 4)

The app now fetches real listings from the Worker at `/api/public/content/{kind}`. Until a dataset is approved it shows the built-in samples, each labelled "Sample". Do this for each kind (`ghats`, `stays`, `travel`, `updates`, `helplines`, `help-points`):

1. **Find the official source.** Event dates: the government order or official Pushkaralu website (resolves OQ-004). Ghats and help points: the district collectorate pages for East/West Godavari and the other districts. Helplines: the official state or national page for each number. Never copy a number from a news article.
2. **Send Claude the source links and the facts.** Claude fills `src/content/publishedContent.ts`. Each item gets `synthetic: false`, the official `sourceUrl`, `status: 'verified'` and the date you checked. Ghats always use `crowd: 'noData'`, because a file cannot know live crowds.
3. **Check every item yourself** against its source, on the staging site.
4. **Approve:** say "approve the ghats dataset at commit `<sha>`, checked against `<source>`". Claude adds the approval record (reviewer `gkmraju`, the commit, the date, what you checked). The Worker refuses to serve anything with a missing source, a sample item, a duplicate or an invalid field.
5. **Translations:** ask a native Telugu speaker, and a Hindi speaker, to read every screen on their phone. Write down their names and the date (OQ-019). They do not need to be professionals, but they must actually read the text.

Before launch, also decide whether screens with no approved data should keep showing samples or say "not available yet". Claude can make production hide samples; ask for it.

## Step 5 — Operations (item 5)

- [x] Contact email (step 1).
- [ ] **Cloudflare plan.** Workers Free allows 100,000 requests a day, then returns errors. Every page and file request counts (OQ-028), so one busy event day will go over. Upgrade the account to **Workers Paid** before launch (Cloudflare dashboard → Workers & Pages → Plans; check the current price there). Then tell Claude "Workers Paid is active" so OQ-020/OQ-028 are updated.
- [ ] **Custom domain (optional).** Without one the address stays `pushkara-mitra-production.<subdomain>.workers.dev`. If you buy a domain, add it to the Cloudflare account and Claude will route it.
- [ ] **Logs and residency for v1:** record the decision "v1 stores no personal data and keeps no request logs of its own; India log sink and D1 residency are deferred until a personal-data feature is switched on" (OQ-017, OQ-026, OQ-027).
- [ ] **Who watches the site on event days:** you. Bookmark `/healthz` on the production URL and the Cloudflare dashboard's Workers metrics. Keep the rollback command from `PROJECT_STATUS.md` somewhere you can reach from your phone.

## Step 6 — Testing and review (item 6)

As the sole maintainer there is no independent code reviewer. Make up for that with testing by other people:

- [ ] **Real-phone test.** Two or three people use the staging site on their own phones (one cheap Android at least) for 20 minutes: open each screen, switch language, switch theme, add to home screen, turn on airplane mode and reopen. They note anything broken or confusing.
- [ ] **Accessibility pass.** On Android, turn on TalkBack and move through Home, Ghats and Help; set font size to the largest and zoom to 200%; check nothing is cut off. In Chrome DevTools, run Lighthouse → Accessibility on Home and fix anything under 90.
- [ ] **Record it:** tell Claude who tested, on which phones, and what they found. Claude fixes the problems and records the test in `PROJECT_STATUS.md`.

## Step 7 — Production approval (item 7)

When steps 1–6 are done (or each skipped item has a written decision), give the approval in one message, for example:

> I, Krishna Murthy Raju G, approve the production release of commit `<sha>`. Legal: `<lawyer consulted on date / decided to launch without>`. Content approved: `<kinds>`. Workers Paid active: yes. Phone and accessibility test done: yes.

Claude then runs `npm run ship:production` (full check, build, deploy), verifies the production URL and `/healthz`, and records the commit, time, result and rollback command in `PROJECT_STATUS.md`. If anything fails, Claude rolls back and reports it.

## After launch

- Re-check official sources daily during the event; publish corrections through step 4 (they reach people on the next refresh).
- Any v2 feature (groups, SOS, accounts, donations) goes back through steps 2, 3 and 6 before its flag is turned on.
