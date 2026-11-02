# Security test evidence

Records of security tooling results. Output is trimmed, not paraphrased. Dates are 2026-11-02 unless stated.

## Workflow security (Phase 1 acceptance)

Tools: actionlint 1.7.12 (`actionlint-py==1.7.12.25`), zizmor 1.31.1, run locally against `.github/workflows/`.

```text
$ actionlint
(no output, exit 0)

$ zizmor --format plain .github/workflows        (config: .github/zizmor.yml)
No findings to report. Good job! (1 ignored, 4 suppressed)
```

`zizmor --persona=pedantic` additionally asked for explanatory comments on elevated permissions. Those comments were added, so the pedantic run is the one to repeat after the next workflow change.

### Justified findings

| ID     | Finding                                                                                                      | Decision                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ZF-001 | `self-repository` (low): zizmor prefers `$/` over `./` for the local reusable workflow call in `release.yml` | Ignored in `.github/zizmor.yml`. `./` is the long-established syntax, accepted by actionlint. Revisit when `$/` is verified against GitHub documentation |

## Dependency audit

```text
$ npm audit --omit=dev
found 0 vulnerabilities
```

`npm audit` (all dependencies) reported 17 advisories in dev tooling (11 moderate, 6 high), for example `zod` through Wrangler. Not shipped. Tracked in [vulnerability-management.md](vulnerability-management.md).

## Not yet run

| Tool                         | Reason                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| osv-scanner (local)          | Downloading and running an external binary was blocked in the authoring session. It runs in CI (`sca`) |
| gitleaks (local)             | Same reason. Runs in CI (`secrets-scan`)                                                               |
| CodeQL or Semgrep            | Run in CI only                                                                                         |
| Independent penetration test | Scheduled for M5                                                                                       |
