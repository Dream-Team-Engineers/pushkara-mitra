# Runbook

Status: skeleton. Commands are verified against `wrangler.toml` and the workflows; operational thresholds are TBD.

## Environments

| Environment | Deploys from                      | Credentials                                           | Notes                                   |
| ----------- | --------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| preview     | Pull request (same-repo only)     | Cloudflare **test** resources, Razorpay **test** keys | Skipped cleanly when secrets are absent |
| staging     | Push to `main`                    | Separate token, Razorpay **test** keys                | Re-runs `npm run check` first           |
| production  | Release created by release-please | Separate token, Razorpay **live** keys only here      | Approval gate depends on ADR 0007       |

## Common tasks

| Task                 | Command                                                   |
| -------------------- | --------------------------------------------------------- |
| Local dev            | `npm run dev`                                             |
| Full local gate      | `npm run check`                                           |
| Roll back production | `npx wrangler rollback --env production`                  |
| Kill a risky feature | Flip its flag in `src/flags.ts` (provider TBD) and deploy |
| Health check         | `curl -fsS "$PRODUCTION_URL/healthz"`                     |

## Event-window rules (dates unconfirmed, OQ-004)

- Code freeze from M7 (2027-06-01). Only LEAD-approved critical fixes.
- Two named responders on call at all times. Contact details TBD.
- Cloudflare budget alerts at 50, 80 and 100 percent for Workers, D1, Durable Objects and R2.

## Monitoring

To be defined: uptime probe on `/healthz`, error-rate alert, Durable Object connection count, payment webhook failure alert.
