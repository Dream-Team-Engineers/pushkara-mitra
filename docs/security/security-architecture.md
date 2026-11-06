# Security architecture

Status: baseline for M1. See [threat-model.md](threat-model.md) for the reasoning.

## Principles

1. Data minimisation first. What is never collected cannot leak.
2. Location is ephemeral: memory only, never stored, never logged ([ADR 0004](../decisions/0004-ephemeral-location.md)).
3. Fail closed. Risky features sit behind kill switches that default to off (`src/flags.ts`).
4. Least privilege in code, CI tokens and Cloudflare API tokens (one token per environment).
5. No secrets in the repository. Secrets live in GitHub environment secrets and Cloudflare.

## Controls in place (verified by tests or CI)

| Control                                                                       | Where                                                 | Evidence                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| Strict CSP, HSTS, nosniff, `Referrer-Policy: no-referrer`, geolocation denied | `src/security/headers.ts`, Worker-first asset routing | Header unit tests and `npm run test:routing` |
| Location persistence and coordinate-logging guard                             | `tests/guards/`                                       | EV-002                                       |
| Pinned third-party actions, `permissions: {}` by default                      | `.github/workflows/`                                  | zizmor, actionlint                           |
| Secret scanning of history                                                    | `secrets-scan`                                        | EV-003                                       |
| Dependency and licence gates, SBOM                                            | `sca`, `licence-check`, `sbom`                        | EV-004, EV-005                               |
| Code owners on security-critical paths                                        | `.github/CODEOWNERS`                                  | review required                              |

## Controls planned

Authentication and session design (M1), rate limiting and bot defence, payment webhook verification (M4), logging pipeline with scrubbing (ADR 0005), independent penetration test (M5).

## Worker-first asset delivery

Each configured asset table explicitly sets `run_worker_first = true`. Static files,
asset redirects, method rejections and missing routes therefore pass through the
Worker's security-header wrapper rather than bypassing it through asset-first delivery.
This changes no binding, migration, namespace backend or plan and enables no application
feature. It does not authorize a deployment.

Run `npm run test:routing` after a frozen install. The command starts actual local Wrangler
servers for default, preview, staging and production-named configurations, always with
`--local` and remote bindings disabled. Twenty method/path cases per configuration check
the seven security headers, static bodies, redirects, health caching, method denial and
reserved-path non-HTML errors. These are scaffold routing tests, not authentication,
feature or deployed-environment verification. The CI test job runs them after coverage.

Worker-first delivery may increase Worker invocations and consume Free-plan request
quota for traffic previously served directly as assets. No paid setting is changed.
Measure real workload/quota headroom and cache behavior before capacity claims; these
local checks establish neither event-scale throughput nor production readiness. Any
future asset bypass or provider/cache optimization needs review and equivalent real
security-boundary tests.

## Reviewed allow-list for persistence APIs

`tests/guards/no-location-persistence.test.ts` keeps `REVIEWED_ALLOW_LIST`. It is empty. Adding a path needs CODEOWNER approval and an entry here:

| Path   | Reason | Approved by | Date |
| ------ | ------ | ----------- | ---- |
| (none) |        |             |      |
