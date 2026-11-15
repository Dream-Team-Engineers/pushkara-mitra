# Owner next steps — 2026-11-15

Working checklist prepared by Claude Code (agent) for the owner, Krishna Murthy Raju G. It is not legal advice and certifies nothing. It extends [LAUNCH_APPROVALS.md](LAUNCH_APPROVALS.md).

## 1. Helplines (built, waiting for your approval of the numbers)

**Built:** the Help screen lists helplines as in the Emergency screen of the UI workflow design (number chip, name, red "Call" button). Tapping Call never dials by itself. It opens a confirmation ("Call 112?") with **Cancel** and **Call 112 now**; only the second starts the phone's dialler. Nothing is sent, stored or located. A row with no approved number shows "Not yet available" and its button is disabled. Code: `web/src/features/help/HelplineList.tsx`.

**Telugu review:** recorded 2026-11-15 on your statement (`te.json` meta: reviewed, not needsNativeReview). Hindi is still draft.

**Numbers are not live yet.** Your screenshot is from a Nashik app, so it is not a source for this one. Verified so far, in draft in `src/content/publishedContent.ts` (still `draft`, so the app shows "not yet available"):

| Line                                           | Number            | Official page found                                                                                           | Status                                      |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Emergency (police, fire, health)               | 112               | https://www.india.gov.in/directory/helpline                                                                   | Candidate: open the page and confirm        |
| Child helpline                                 | 1098              | https://www.spniwcd.wcd.gov.in/child-helpline                                                                 | Candidate: open the page and confirm        |
| Women                                          | **181**, not 1091 | Government sources say 181 is the women's helpline; the India portal lists 1091 as an anti-obscene-calls cell | Needs the official page for 181             |
| Police 100, Ambulance 108, Tourist 1363        | —                 | Not found yet                                                                                                 | You send the official page, or we drop them |
| Festival control room / district disaster line | —                 | The Nashik 1077 line does not apply. Need the East Godavari control-room page                                 | Needs your source                           |

**You do:** open each page, confirm the number, then tell me "approve the helplines dataset, checked against `<pages>`". I add the approval record. If you want Telugu-state numbers (100, 108) shown, send the AP government page that lists them.

## 2. The text you pasted about Pushkaralu

It is a general summary, not an official source, so I did **not** publish from it. What it says against what is already approved:

- Dates 26 Jun to 7 Jul 2027 match the district page (already approved).
- Jupiter's entry into Leo "about 5:25 AM IST" on 26 Jun 2027, the Antya Pushkaralu dates (13 to 24 Jul 2028), "440 ghats (259 + 181)" and "over 10 crore devotees" are **unsourced here**. The 440 figure is a plan, not a list of ghats.
- To publish any of it as an event or update, send the official page (government order, district or temple site) and I will prepare it as `updates` for your approval. Ritual explanations (Snanam, Tarpanam) can be written as general information in the app's own words if you want; they would need your approval and, ideally, a priest or scholar reading them.

## 3. Reviewing Telugu and Hindi (you, as a native speaker)

- **Where:** `web/src/shared/i18n/te.json` (Telugu) and `hi.json` (Hindi), compared with `en.json`. 250 strings each; each line is `"key": "text"`. Edit only the text on the right.
- **Easier on screen:** run `npm run dev`, open the app on your phone or browser, switch language in Settings, and read every screen. Note the screen name and the wrong text.
- **Look hardest at:** the disclaimer (`app.disclaimer`), `help.*` (emergency wording must be unambiguous), `ghats.*` and `home.countdown.*`, and the new `help.call.*` strings.
- **Two ways to finish:** edit the files yourself, or list the corrections and I apply them. Then tell me "te reviewed by `<name>` on `<date>`" (and the same for hi). I set `needsNativeReview: false` and `reviewedBy`, which the guard test requires, and note it in OQ-019.
- Counsel approval of the disclaimer wording (OQ-019) is separate from language review.

## 4. Everything left before production (you already consulted a lawyer)

| #   | Item                                         | What you do                                                                                                                                                                                                            |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Record the lawyer consultation               | Send me: lawyer's name, date, and the answer to each question in LAUNCH_APPROVALS step 2. I write it into OQ-024 and the related OQs. Without answers I write only "consulted on `<date>`" and the questions stay open |
| 2   | Scope decision (OQ-021)                      | Say: "record the v1 read-only scope decision"                                                                                                                                                                          |
| 3   | Content approvals                            | Helplines (section 1); then stays, travel, updates, help points need official sources. Until approved they show labelled samples. Decide whether production should hide samples instead                                |
| 4   | Language review                              | Section 3                                                                                                                                                                                                              |
| 5   | Workers Paid (OQ-020, OQ-028)                | Upgrade in the Cloudflare dashboard, then say "Workers Paid is active"                                                                                                                                                 |
| 6   | Logs and residency for v1 (OQ-017, 026, 027) | Say: "v1 stores no personal data and keeps no request logs; deferred until a personal-data feature is switched on"                                                                                                     |
| 7   | Phone and accessibility test                 | 2 or 3 people on staging: each screen, language, theme, offline. TalkBack, largest font, 200% zoom. Send me the findings                                                                                               |
| 8   | Privacy notice for read-only v1              | Ask me to draft it for your lawyer's wording review                                                                                                                                                                    |
| 9   | Production approval                          | One message in the format in LAUNCH_APPROVALS step 7. I then run `npm run ship:production`                                                                                                                             |

I can do the drafting and code for 3, 6 and 8 as soon as you give the inputs. Review is yours; I cannot approve on your behalf or certify legal compliance.

## 5. release-please: keep or disable

What it does here: on every push to `main` it opens or updates a "chore(main): release X" pull request that bumps the version and changelog. Merging that PR only tags a version; it does **not** deploy (production deploy is disconnected). You have been merging those, e.g. #127.

|      | Keep it                                                                                                                                                                | Disable it                                                                                                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pros | Automatic changelog and version numbers; matches commit-message conventions; costs nothing to leave                                                                    | Matches your CLAUDE.md rule (no PRs, no release-please); no stray release PRs or version-bump commits on `main`; one less automation with write access to contents and pull requests; fewer moving parts for a solo maintainer |
| Cons | Creates PRs you said you do not want; version bumps land on `main` between your own commits and can collide with direct pushes; a merge looks like a release but isn't | No automatic changelog; version stays at 1.12.0 until you bump `package.json` by hand; release notes would be manual                                                                                                           |
| Risk | Low, but "release" wording could be mistaken for a deployment                                                                                                          | Low; reversible by restoring the file                                                                                                                                                                                          |

**Recommendation:** disable it. The deployment record in `PROJECT_STATUS.md` (commit, time, version, rollback) already replaces what a changelog would give you, and it removes the conflict with your no-PR rule. To do it, I delete `.github/workflows/release.yml` and the two release-please files (`release-please-config.json`, `.release-please-manifest.json`), update the docs that mention it, and run the checks. Say "disable release-please" to go ahead. Closing the open release PR, if any, is a GitHub action for you.

## Test-runner note

On this machine (Node 24.15) the default web test runner fails on every file, even without my changes, with `Cannot read properties of undefined (reading 'config')`. `npx vitest run --project web --pool=vmThreads` works. The project asks for Node 22 (`.nvmrc`); installing Node 22 is the likely proper fix.
