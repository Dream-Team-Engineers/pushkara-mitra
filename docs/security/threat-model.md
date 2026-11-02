# Threat model v1 (draft)

Method: STRIDE per component, plus abuse cases. Status: `NEEDS REVIEW`. Update this file whenever a trust boundary changes (PR checklist item).

## Components and trust boundaries

```mermaid
flowchart LR
  user([Pilgrim device: PWA + service worker]) -- HTTPS --> edge[Cloudflare edge: Worker]
  edge --> assets[(Static assets)]
  edge --> do[GroupLocation Durable Object: memory only]
  edge --> d1[(D1 database)]
  edge --> r2[(R2 storage)]
  edge -- webhooks --> rz[Razorpay]
  edge --> sentry[Sentry]
```

Boundaries: device to edge (untrusted client), edge to third parties (processors), and CI to Cloudflare (deploy credentials).

## STRIDE per component

| Component              | Spoofing                        | Tampering                       | Repudiation                               | Information disclosure                                    | Denial of service             | Elevation of privilege       |
| ---------------------- | ------------------------------- | ------------------------------- | ----------------------------------------- | --------------------------------------------------------- | ----------------------------- | ---------------------------- |
| PWA and service worker | Fake official clone of the app  | Cache poisoning of shell        | n/a                                       | Personal data in cache or storage                         | Large cache exhaustion        | XSS via injected content     |
| Worker (edge)          | Forged requests or tokens       | Parameter tampering             | Missing audit trail for sensitive actions | Verbose errors, headers leaking info                      | Request floods at event scale | Missing authorisation checks |
| GroupLocation DO       | Joining a group as someone else | Spoofed position updates        | Disputed sharing                          | Leaking locations to non-members, persistence of location | Connection floods             | Cross-group access           |
| D1 and R2              | Stolen credentials              | SQL injection, object overwrite | Untracked admin changes                   | Over-collection, public buckets                           | Query abuse                   | Over-broad bindings          |
| Payments (Razorpay)    | Fake webhook                    | Amount tampering                | Disputed payments                         | Card data exposure (must never touch us)                  | Webhook replay storms         | Refund abuse                 |
| CI/CD                  | Malicious PR or action          | Workflow injection, tag move    | Unsigned commits                          | Secret exfiltration                                       | Runner abuse                  | Token over-permission        |

Mitigations that exist today: strict CSP and security headers (tested), pinned third-party actions, least-privilege workflow permissions, secret scanning, no `pull_request_target`, and a location-persistence guard test. All others are planned.

## Abuse cases

| ID    | Abuse case                                         | Primary mitigations (planned unless noted)                                               |
| ----- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AB-01 | Stalking or coercion through location sharing      | Opt-in per session, visible indicator, instant stop, auto-expiry, no history (ADR 0004)  |
| AB-02 | Coercion to share location within a family         | Per-person controls, quiet-exit design, no hidden mode                                   |
| AB-03 | Compromised account used to track others           | Re-authentication for sharing, session limits, anomaly alerts                            |
| AB-04 | Fake official groups or fake "government" accounts | Never look official, government disclaimer, verified-organiser path decided with counsel |
| AB-05 | Vendor fraud (fake or look-alike vendors)          | Vendor verification, report button, takedown path                                        |
| AB-06 | Missing-person impersonation or false report       | Verification with authorities, rate limits, review                                       |
| AB-07 | Payment phishing using our brand                   | Fixed payment domains, no payment links in messages, user education                      |
| AB-08 | Directory scraping                                 | Rate limits, bot controls, no bulk export                                                |
| AB-09 | Supply-chain attack on dependencies or actions     | SHA-pinned actions, lockfile, licence and vulnerability checks, SBOM                     |

## Open items

Risk ratings and the review sign-off are pending (M0 exit criterion: "threat model v1").
