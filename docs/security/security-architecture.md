# Security architecture

Status: baseline for M1. See [threat-model.md](threat-model.md) for the reasoning.

## Principles

1. Data minimisation first. What is never collected cannot leak.
2. Location is ephemeral: memory only, never stored, never logged ([ADR 0004](../decisions/0004-ephemeral-location.md)).
3. Fail closed. Risky features sit behind kill switches that default to off (`src/flags.ts`).
4. Least privilege in code, CI tokens and Cloudflare API tokens (one token per environment).
5. No secrets in the repository. Secrets live in GitHub environment secrets and Cloudflare.

## Controls in place (verified by tests or CI)

| Control                                                                       | Where                          | Evidence                       |
| ----------------------------------------------------------------------------- | ------------------------------ | ------------------------------ |
| Strict CSP, HSTS, nosniff, `Referrer-Policy: no-referrer`, geolocation denied | `src/security/headers.ts`      | `tests/worker/headers.test.ts` |
| Location persistence and coordinate-logging guard                             | `tests/guards/`                | EV-002                         |
| Pinned third-party actions, `permissions: {}` by default                      | `.github/workflows/`           | zizmor, actionlint             |
| Secret scanning of history                                                    | `secrets-scan`                 | EV-003                         |
| Dependency and licence gates, SBOM                                            | `sca`, `licence-check`, `sbom` | EV-004, EV-005                 |
| Code owners on security-critical paths                                        | `.github/CODEOWNERS`           | review required                |

## Controls planned

Authentication and session design (M1), rate limiting and bot defence, payment webhook verification (M4), logging pipeline with scrubbing (ADR 0005), independent penetration test (M5).

## Reviewed allow-list for persistence APIs

`tests/guards/no-location-persistence.test.ts` keeps `REVIEWED_ALLOW_LIST`. It is empty. Adding a path needs CODEOWNER approval and an entry here:

| Path   | Reason | Approved by | Date |
| ------ | ------ | ----------- | ---- |
| (none) |        |             |      |
