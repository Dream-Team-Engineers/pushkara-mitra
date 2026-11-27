# Runbook

Status: draft for owner review. Commands are taken from `package.json`, `wrangler.toml` and `.github/workflows/deploy-staging.yml`. Thresholds, contacts and the production rehearsal are not done yet and are marked TBD or NEEDS REVIEW. Nothing here has been run against production.

## Environments

| Environment | Worker name                 | Deployed by                              | Notes                                                    |
| ----------- | --------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| preview     | `pushkara-mitra-preview`    | Same-repo pull requests (workflow)       | `workers_dev` on; skipped when secrets are absent        |
| staging     | `pushkara-mitra-staging`    | Every push, with a `/healthz` smoke test | `workers_dev` on; test Google client; device location on |
| production  | `pushkara-mitra-production` | Owner-approved `npm run ship:production` | CI workflow for production stays disabled until reviewed |

A bare `npx wrangler deploy` targets the top-level Worker, not a named environment, and does not build `dist/web`. Always use the `ship:*` scripts.

## Deploy

1. Confirm the source commit and target environment. Keep credentials in the local credential store.
2. `npm ci`, then `npm run check`.
3. Staging: `npm run ship:staging` (gate, staging web build, `wrangler deploy --env staging`).
4. Production: `npm run ship:production`, only after the owner has approved that release and the gates in `docs/operations/LAUNCH_APPROVALS.md`.
5. Verify the deployed URL: `curl -fsS "$URL/healthz"` must return `{"status":"ok"}`. `/healthz` alone does not prove features work, so also load the home page and one `/api/v1` read.
6. Record the commit SHA, environment, time, result and rollback route.

## Roll back

Worker versions are immutable, so a rollback is a redeploy of the previous version (ADR 0012).

```powershell
npx wrangler deployments list --env production
npx wrangler rollback --env production
```

`wrangler rollback` takes an optional version ID as its argument. Without one it returns to the previous version. After rolling back:

1. Run the `/healthz` check and one functional request.
2. Record the incident time, the bad version ID, the restored version ID and who ran it.
3. Confirm no new migration has been applied that the previous Worker cannot read. Migrations are forward-only and use expand-then-contract (ADR 0012), so the previous Worker should still run. D1 Time Travel is not a schema rollback tool.

Rollback does not undo changes to secrets or variables. Revert those separately.

## Kill switches

Risky features fail closed and turn on only when the matching Worker variable is exactly `enabled` (`src/flags.ts`).

| Feature                | Variable                      |
| ---------------------- | ----------------------------- |
| Group location         | `FLAG_GROUP_LOCATION`         |
| Groups                 | `FLAG_GROUPS`                 |
| SOS                    | `FLAG_SOS`                    |
| Pilgrim pass           | `FLAG_PILGRIM_PASS`           |
| Photo upload           | `FLAG_PHOTO_UPLOAD`           |
| Payments               | `FLAG_PAYMENTS`               |
| Donations              | `FLAG_DONATIONS`              |
| Missing-person reports | `FLAG_MISSING_PERSON_REPORTS` |

To switch a feature off, remove the variable (or set it to anything other than `enabled`) for that environment and redeploy. Check how each environment sets it (`[env.<name>.vars]` in `wrangler.toml` or the dashboard) before editing.

## Symptoms and first actions

| Symptom                                 | Likely cause                                                 | First action                                                             |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Requests return errors after a busy day | Workers Free 100,000 requests/day cap (OQ-028)               | Confirm the account is on Workers Paid. This is the main launch blocker. |
| `/healthz` fails right after a deploy   | Bad release                                                  | Roll back, then investigate                                              |
| Google sign-in fails                    | Wrong client ID or redirect URI, or missing `SESSION_SECRET` | Check the environment's `GOOGLE_CLIENT_ID` and the secret exists         |
| Map or pages stale for users            | Old service worker cache                                     | Check `web/build/sw.ts` cache version; redeploy with a bumped version    |
| Location or coordinates seen in any log | SEV1, breach of hard rule 1                                  | Follow `docs/security/incident-response.md` immediately                  |

## Scheduled data deletion and manual deletion

| What                                | How it is deleted                                                                                                                              | Owner check                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ended groups and member first names | Daily cron (03:30 UTC) `purgeEndedGroups`                                                                                                      | After the first run, confirm no ended groups remain (Cloudflare cron log)                      |
| Partner data (all partners)         | Daily cron `purgePartners`; acts from 14 July 2028 (`src/retention.ts`: event end 7 July 2027, plus a one-week buffer, plus one year, OQ-046)  | Check the cron ran on or just after 14 July 2028 and the `partner` table is empty              |
| Rejected applicants' name and email | 30 days after the decision (cleared when an admin opens the Partners tab)                                                                      | None                                                                                           |
| **Contact us emails (manual)**      | **The emails sit in the owner's mailbox (DI-25). Once a year, after the retention period, delete every Contact us email older than one year.** | Owner: set a yearly reminder; first review on 2027-12-01 and then each 1 December; log it here |

Contact us emails are kept at least one year (owner decision 2026-11-27). Do not keep them longer than needed; when and how they are finally deleted, and who may read them, is a counsel question (OQ-047, OQ-024).

## Secrets

- `SESSION_SECRET` is set per environment with `npx wrangler secret put SESSION_SECRET --env <name>`. The production value must be different from staging. Never put it in the repo, a log or a ticket.
- Rotating `SESSION_SECRET` signs everyone out. Do it deliberately and tell the owner first.
- Rotate the Cloudflare deploy token per environment if it may be exposed, then review the account audit log.

## Event-window rules (owner gave the dates 2026-11-27: 26 June to 7 July 2027; official source still to be linked, OQ-004)

- Code freeze from M7 (2027-06-01). Only LEAD-approved critical fixes.
- Two named responders on call at all times. Contact details TBD.
- Cloudflare budget alerts at 50, 80 and 100 percent for Workers, D1, Durable Objects and R2.

## Monitoring (not set up yet)

| Signal                                | Status                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| External uptime probe on `/healthz`   | TBD                                                                                                     |
| Error-rate alert                      | TBD                                                                                                     |
| Request volume against the plan limit | TBD                                                                                                     |
| Durable Object connection count       | TBD                                                                                                     |
| Log sink                              | Deferred. v1 keeps no request logs of its own (OQ-017, decided 2026-11-15, counsel review NEEDS REVIEW) |

## Open items before production

- Workers Paid plan active (OQ-028).
- Production deploy approval and review of the disabled production workflow.
- Production domain, Google OAuth client and redirect URIs, and `SESSION_SECRET`.
- Alert thresholds, uptime probe, load test and named responders.
- One rehearsal of deploy, `/healthz` check and rollback on staging, with the result recorded here.
