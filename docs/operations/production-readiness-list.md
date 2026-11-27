# Production readiness list (2026-11-27)

Planning list. **Nothing here has been applied to the Cloudflare account.** Production stays undeployed until the owner explicitly approves a release and the legal gates in [release-readiness](release-readiness.md) are met. Engineering readiness and legal sign-off are reported separately; this file certifies no legal compliance.

## State today

- Production D1: **created and migrated to 0006** (PROJECT_STATUS 2026-11-24: `pushkara-mitra-production`, id `d3117bbc-34d9-4212-bac1-3bf8f35044d1`, APAC, empty tables). Its binding is now in `wrangler.toml` (repository only). Migration state was not re-read from the account (UNKNOWN until checked).
- `wrangler.toml` production has the D1 binding and the daily cron, no flags and no `GOOGLE_CLIENT_ID`. Apply migrations 0007 to 0009 before the first deploy, or the cron sweep will meet a missing table or column.
- `deploy-production.yml` is a fail-closed job. `npm run ship:production` exists but is for the owner only after approval (CLAUDE.md).
- `wrangler.admin.toml` has a production environment with no Access values, so it answers 503. No Access application exists for it and it is not deployed.

## Steps, in order (each needs the owner's go)

| #   | Step                                                                                                                                                                              | Owner approval needed                      | Verification                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| 1   | Decide D1 region and residency position (OQ-026) before creating the production database                                                                                          | Yes                                        | OQ-026 answered                                                 |
| 2   | Production D1 already exists (see above); add its `[[env.production.d1_databases]]` binding                                                                                       | Yes                                        | `wrangler d1 list`                                              |
| 3   | Apply the missing migrations 0007, 0008 and 0009 to production D1 (0001 to 0006 were applied 2026-11-24)                                                                          | Yes                                        | `wrangler d1 migrations list --env production --remote`         |
| 4   | Production vars: `GOOGLE_CLIENT_ID` (owner's production OAuth client with production origin), `DEVICE_LOCATION` only if OQ-041 is settled                                         | Yes                                        | Sign-in on the production URL                                   |
| 5   | Flags: `FLAG_GROUPS`, `FLAG_GROUP_LOCATION`, `FLAG_METRICS` decided one by one; `FLAG_PARTNERS` stays **off** until OQ-045 and OQ-046 are answered                                | Yes, per flag                              | Route answers 503 when off, 200 when on; kill switch drill (M8) |
| 6   | Cron trigger `30 3 * * *` for the ended-group sweep (add `[env.production.triggers]`), needed before groups go live so first names are not kept                                   | Yes                                        | Dashboard cron log after the first run; no ended groups remain  |
| 7   | Admin Worker: add `[env.production]` to `wrangler.admin.toml`, its own Cloudflare Access application and AUD tag, policy naming the three admins; `FLAG_PARTNERS` matches the app | Yes                                        | 503 without Access token, 200 with an admin's                   |
| 8   | Privacy notice, consent and Contact us wording approved (OQ-029, OQ-047) and shown in the app                                                                                     | Counsel (launch day, OQ-024) and the owner | Legal status stays NEEDS REVIEW until signed off                |
| 9   | Native review of te and hi strings added since 2026-11-26 (list in PROJECT_STATUS)                                                                                                | Owner                                      | Recorded in O1                                                  |
| 10  | Full gate from the exact release commit: `npm ci`, `npm run gate`; then `npm run ship:production`                                                                                 | Yes, explicit                              | Deployed URL and `/healthz` 200, recorded with commit and time  |
| 11  | Post-deploy: sign-in, group with two accounts, Map pins, Partners (if on), `/healthz`, security headers                                                                           | Owner on phone                             | Written into PROJECT_STATUS with evidence                       |

## Rollback route

- App Worker: `npx wrangler rollback <version> --env production`, or `git revert <commit>` then redeploy.
- Migrations 0007 to 0009 only add tables or a nullable column; the previous app ignores them, so no down-migration is planned. Do not drop tables with data without the owner.
- Any flag off returns the feature to 503 without a deploy.

## Not in scope here

Independent security test (M5), accessibility audit, performance drills on a low-end device, and all legal gates remain NOT STARTED in [release-readiness](release-readiness.md). Partner nudge notifications need an ADR and threat model first.
