# Disaster recovery

Status: skeleton. Recovery targets are TBD and must be agreed with the owners.

| Scenario                               | Impact                   | Response                                                                                                                |
| -------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Bad deploy                             | Errors or outage         | `npx wrangler rollback --env production`; kill switch                                                                   |
| Cloudflare regional or service outage  | App unreachable online   | Offline-first PWA keeps working for cached features ([ADR 0003](../decisions/0003-offline-first-pwa.md)); status notice |
| D1 data loss or corruption             | Lost records             | Restore from D1 time travel or export. Frequency and drill TBD                                                          |
| Credential compromise                  | Unauthorised deploys     | Rotate the per-environment Cloudflare token; review the audit log                                                       |
| Payment provider outage                | No payments              | Disable payments flag; show retry guidance                                                                              |
| Mobile network saturation at the event | Slow or failing requests | Offline-first design, small payloads, [performance budget](../performance-budget.md)                                    |

| Target | Value |
| ------ | ----- |
| RTO    | TBD   |
| RPO    | TBD   |

Drill: at least one restore rehearsal in M8 with the result recorded here.
