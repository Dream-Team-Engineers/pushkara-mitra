# Pushkara Mitra: Version Roadmap and Readiness

**Current product direction — 2026-11-04 (IST):** the user explicitly requested the full functional target using Kumbh-Sathi only as a benchmark for an original Pushkara Mitra mobile application, without copying code, imagery, icons, colors, text or branding and without silently reducing it to a foundation shell. [Original product blueprint](proposals/PRODUCT_BLUEPRINT.md) and [recommended architecture](architecture.md) define the proposed workflows/file boundaries; [benchmark acceptance inventory](proposals/REFERENCE_PARITY_ACCEPTANCE.md) retains 26 coverage items and verified/unknown reference behavior. The historical V1/V2 material below is sequencing context, not a restriction on planning the now-requested full product. Foundation remains the first dependency tranche. Existing no-production, no-location-persistence, no-paid-settings and high-risk human-approval boundaries remain; G0/G1 adoption and contracts still require explicit disposition. The old `v0.2.0` target is historical and does not authorize a reset from current `v1.0.1` or any tag/history rewrite. Full implementation uses the next owner-approved prospective versions.

## Historical roadmap baseline — 2026-11-02

Status as of 2026-11-02. Source documents: Kickoff Prompt V1, Kickoff Prompt V2, `PROJECT_STATUS.md`, the ADRs and `docs/decisions/OPEN_QUESTIONS.md`.

Only **V1** and **V2** are defined by a prompt. Anything after V2 is a hint taken from the docs, not a plan, and needs its own prompt and counsel sign-off.

Engineering readiness and legal sign-off are tracked separately. Nothing here certifies legal compliance, and every legal item stays `NEEDS REVIEW` until counsel says otherwise.

## 1. At a glance

|                     | V1                               | V2                                          | V3 and later            |
| ------------------- | -------------------------------- | ------------------------------------------- | ----------------------- |
| Theme               | Repository scaffold              | M0 legal discovery and M1 secure foundation | Product features        |
| Milestones          | Setup                            | M0 (due 2026-11-30), M1 (due 2026-12-20)    | M2 to M10 (not defined) |
| End state           | Scaffold on `main`               | Release v0.2.0 on staging                   | Not defined             |
| Real user screens   | None                             | None (shells only)                          | Yes, after M1           |
| Status              | Done and merged, with open items | Not started (blocked, see section 4)        | Not started             |
| Defined by a prompt | Yes                              | Yes                                         | No                      |

## 2. V1: Repository scaffold

**Status: built, merged to `main` (PRs 6 and 7), with open items below.**

### Pages and features

- One placeholder page: title and a "not an official government application" line. Unstyled.
- `GET /healthz` returns `{"status":"ok"}` with `Cache-Control: no-store`.
- Security headers on every response: CSP, HSTS, `nosniff`, `Referrer-Policy: no-referrer`, and a Permissions-Policy that disables geolocation, camera, microphone and payment.
- Stubs only: group location (stores nothing), a fail-closed kill switch, a web manifest and a service worker.
- No login, navigation, language options or product screens.

### What was built around it

- Nine CI/CD workflows and eleven required check names.
- Privacy guard test: the code may never persist or log location.
- 15 passing tests, strict lint, typecheck and format gates.
- 101 files: governance, 7 ADRs, 19 open questions, and security, compliance and legal registers (all `NEEDS REVIEW`).

### Requirements

| Type          | Item                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Tools         | Node 22, npm, Wrangler (Cloudflare Workers), Vitest, ESLint, Prettier, TypeScript, `gh` CLI           |
| CI scanners   | gitleaks 8.30.1, osv-scanner 2.7.0, Semgrep CE (private repos) or CodeQL (public), zizmor, actionlint |
| Subscriptions | GitHub org on the Free plan. Cloudflare is optional until a real deploy                               |
| Auths         | `gh auth login`. No application auth yet                                                              |
| Skills        | TypeScript, Cloudflare Workers, GitHub Actions security                                               |

### Git readiness

| Item                                   | State                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Repo, `main`, PR-only flow             | Done                                                                          |
| 9 workflows, 11 checks green on `main` | Done                                                                          |
| Branch protection and rulesets         | **Not applied** (Phase 2 not run). The 11 checks run but cannot block a merge |
| Release workflow                       | **Failing**: "Actions can create pull requests" setting is off                |
| Code owners                            | One (`@amruthamudunuru39`)                                                    |
| Commit signing                         | Not set up                                                                    |
| Git identity                           | Mixed: global `Amrutha-MIG`, repo-local `amruthamudunuru39`                   |
| Project board and M0 issues (Phase 3)  | **Not done**                                                                  |

### Open items from the owners

- ADR 0007: public or private repo (recommendation recorded: public).
- DEV2 and DEV3 GitHub usernames.
- `docs/ENGINEERING_STANDARDS.md` v3.0 (the file is still a placeholder).
- Security and grievance email addresses.
- Which git identity to use.

### Not verified

- osv-scanner and gitleaks have only run in GitHub Actions, not locally.
- The osv step skips today because there are zero runtime dependencies.
- The staging deploy shows success in CI, but I have not checked what URL it serves or whether secrets were present.

## 3. V2: Secure foundation (M0 and M1)

**Status: not started.** V2 rule 1 says to stop after Phase 0 while the standards file is a placeholder.

### Pages and features

- Installable PWA shell with an offline page. The service worker caches versioned static assets only, never `/api` or `/admin`.
- Language shell: Telugu (default), English, Hindi. Message catalogues, a local-only language switch, a self-hosted Telugu font, and the disclaimer on every page in all three languages. Telugu needs native review.
- Notices page generated at build time from the licence register.
- `/admin*` routes that deny by default and need a valid Cloudflare Access token. No admin UI is described.
- Back end only: sessions, roles (one `authorize()` helper), rate limits, body-size caps, schema validation, one safe error format, a scrubbing logger, and a D1 database baseline (append-only `admin_audit_log`, `consent_ledger` skeleton).
- **Out of scope:** location sharing, groups, directory, lost and found, missing persons, payments, donations, children or dependents, SMS, push, production launch.

### Work breakdown (gap IDs G1 to G30 refer to the V2 Plan)

| Phase                                | Tasks                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 Preflight** (read-only)          | Check `main`, PRs and runs. Confirm standards v3.0. Print variables and mark `BLOCKED` ones                                                                                                                                                                                                                                                                          |
| **A Close V1 gaps**                  | A1 reconcile docs to standards. A2 update `setup-github.sh` (token read-only, labels, milestones M0 to M10, visibility branch). A3 two code owners. A4 release bot App. A5 deploy honesty. A6 Dependabot flow. A7 local scanners. A8 commit signing. A9 contact placeholders. A10 budget-alert runbook. A11 run the script (dry run first) plus the M0 and M1 issues |
| **B Legal drafts** (counsel decides) | B1 counsel brief. B2 data fiduciary and processors. B3 date verification. B4 DPIA and threat model v1. B5 trademark and domain plan. B6 organiser outreach. B7 retention (D1 Time Travel) versus erasure. B8 ADRs 0004 to 0007 ready for decision                                                                                                                    |
| **C M1 code** (one PR each)          | C1 admin auth. C2 sessions. C3 roles. C4 abuse controls. C5 logger. C6 D1 baseline. C7 PWA shell. C8 language shell. C9 notices page. C10 Durable Object spike (branch only). C11 Lighthouse and axe gates. Write ADR 0008 (user auth model) and ADR 0010 (error tracking) before C2 and C5                                                                          |
| **D Verify and release**             | D1 OWASP ZAP baseline. D2 independent review of C1 to C5. D3 evidence. D4 release v0.2.0 and staging smoke test                                                                                                                                                                                                                                                      |

### Requirements

| Type           | Item                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools          | Playwright, axe, Lighthouse CI, OWASP ZAP, D1, Workers rate-limit binding, `actions/create-github-app-token`                                                                             |
| Subscriptions  | Cloudflare account (Free or Paid), Zero Trust Access with MFA, one scoped API token per environment. Sentry only if chosen in ADR 0010                                                   |
| Possible later | SMS sender (DLT) registration and Razorpay merchant onboarding. These are counsel questions in V2, not built                                                                             |
| Auths          | Admin: Cloudflare Access JWT (signature, `aud`, `iss`, `exp`). Users: ADR 0008 chooses between accountless invite codes, phone OTP, passkeys or a hybrid. Developers: SSH commit signing |
| Skills         | Auth and session security, Cloudflare Workers and D1, accessibility testing, native Telugu and Hindi reviewers, counsel, a second developer for independent review                       |

### Git readiness needed

- Run `scripts/setup-github.sh`: rulesets, labels (`privacy`, `children`, `ip-licence`, `public-safety`, `auth`, `v2`), milestones M0 to M10. Dry run first, then a real run after approval.
- Two code owners on every critical path (needs DEV2).
- Signed commits, once all three developers confirm signing.
- Release bot GitHub App installed on the repo only (Contents write, Pull requests write, Metadata read), with `RELEASE_BOT_APP_ID` and `RELEASE_BOT_PRIVATE_KEY` set.
- Dependabot PRs 1 to 5 triaged and closed.
- Visibility-aware branch protection per ADR 0007.

### Owner inputs checklist (from the V2 prompt)

- [ ] ADR 0007 decided (`PUBLIC` or `PRIVATE_TEAM`)
- [ ] DEV2 and DEV3 usernames
- [ ] Standards v3.0 committed as `docs/ENGINEERING_STANDARDS.md`
- [ ] Release bot App created, secrets set
- [ ] One git identity per developer, SSH signing set up
- [ ] Legal entity (data fiduciary) named, counsel engaged
- [ ] Domain registered, role mailboxes for security and grievance
- [ ] Cloudflare account, plan chosen, environment tokens set
- [ ] Cloudflare Access application for `/admin*`, with `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`
- [ ] Error-tracking choice (Sentry or none)

### Exit criteria

- **Engineering:** every Phase A, C and D "done when" met with evidence, `main` protected, Release green, staging live, and the guard, auth, logger, migration, Playwright, accessibility and ZAP checks green.
- **Legal (separate track):** counsel engaged, entity named, dates verified, DPIA v1 rated, threat model v1 reviewed, ADRs 0004 to 0007 decided, trademark search done, no `PASS` without evidence.
- V2 can complete with legal items open. That must be stated explicitly, never implied as sign-off.

## 4. What blocks V2 today

| Blocker                                  | Blocks                                                           |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Standards file is still a placeholder    | Everything after Phase 0 (rule 1)                                |
| ADR 0007 undecided                       | `setup-github.sh` branch choice (A2, A11), IP exposure questions |
| DEV2 and DEV3 unknown                    | Two code owners (A3), signing (A8), independent review (D2)      |
| No release bot App                       | A4 and a green Release                                           |
| No domain or role mailboxes              | A9, SECURITY.md, grievance contact                               |
| No Cloudflare plan, tokens or Access app | A5, C1, staging, D1                                              |
| No legal entity or counsel               | B2, B3, DPIA ratings, any legal sign-off                         |

## 5. V3 and later (hints only, not defined)

The docs mention these. None is planned, scoped or approved.

- Payments and donations (docs point at M4): Razorpay onboarding and legal review first.
- Performance work and an independent penetration test (docs point at M5).
- Location sharing, groups, directory, missing persons and SMS: each blocked on counsel answers in `docs/compliance/` and the open questions list.
- Children and dependents: not built until counsel answers (ADR 0006).

Each needs a new kickoff prompt, a threat-model update and legal review before any code.

## 6. Recommended order

1. Decide ADR 0007 and supply DEV2 and DEV3.
2. Commit the real standards v3.0.
3. Fix the Release workflow (enable the setting, or move to the release bot App).
4. Run V2 Phase 0, then Phase A.
5. Start counsel work in parallel (Phase B), since it has the longest lead time.
6. Build Phase C one PR at a time, then verify and release v0.2.0.
