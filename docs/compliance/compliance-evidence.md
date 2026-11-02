# Compliance evidence index

A register row may be marked PASS only if it points here (or to CI) at evidence that exists. Engineering readiness and legal sign-off are tracked separately.

| Evidence ID | What it shows                                                                                | Where                                                               | Supports         |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------- |
| EV-001      | Security headers set on every response (CSP, HSTS, nosniff, no-referrer, geolocation denied) | tests/worker/headers.test.ts, CI job `ci-test`                      | DPDP-09, LR-04   |
| EV-002      | No location persistence or coordinate logging in src/ (coarse static guard)                  | tests/guards/no-location-persistence.test.ts, CI job `ci-test`      | CON-02, ADR 0004 |
| EV-003      | Secret scanning of the full history on push                                                  | CI job `secrets-scan`                                               | DPDP-09          |
| EV-004      | Dependency licences on the allow-list or a reviewed exception                                | CI job `licence-check`, docs/legal/licence-exceptions.json          | LR-12            |
| EV-005      | Software bill of materials per build                                                         | CI job `sbom`                                                       | DPDP-09          |
| EV-006      | Workflow security lint (actionlint, zizmor)                                                  | CI job `workflow-security`, docs/security/security-test-evidence.md | DPDP-09          |

No register row is `PASS` yet. Status of every row stays `NEEDS REVIEW` until its own evidence and review exist.
