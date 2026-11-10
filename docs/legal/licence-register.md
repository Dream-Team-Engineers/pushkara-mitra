# Licence register

Allow-list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, Unlicense, BlueOak-1.0.0. Anything else fails `licence-check` unless it is a reviewed exception in [licence-exceptions.json](licence-exceptions.json). The Worker backend has no server runtime dependencies. The package manifest now declares three frontend runtime dependencies for a future Preact build; they are not yet part of the deployed static assets.

The npm inventory below comes from the installed packages and their metadata via `license-checker-rseidelsohn`, matched to the current lockfile. The four direct Preact package licences were also checked at their upstream sources on 2026-11-10 (IST), as linked below. Other metadata has not been independently verified. Regenerate this table whenever dependencies change. Status `NEEDS REVIEW` stays until the owners or counsel sign off.

## CI tools and actions

| Tool                                                        | Type          | Licence                                                  | Scope                  | Status       |
| ----------------------------------------------------------- | ------------- | -------------------------------------------------------- | ---------------------- | ------------ |
| actions/checkout, setup-node, setup-python, upload-artifact | GitHub Action | MIT (per upstream repository)                            | CI only                | NEEDS REVIEW |
| github/codeql-action (and the CodeQL CLI it downloads)      | GitHub Action | MIT for the action. CodeQL CLI has separate GitHub terms | CI only, public repos  | NEEDS REVIEW |
| googleapis/release-please-action                            | GitHub Action | Apache-2.0 (per upstream repository)                     | CI only                | NEEDS REVIEW |
| ossf/scorecard-action                                       | GitHub Action | Apache-2.0 (per upstream repository)                     | CI only, public repos  | NEEDS REVIEW |
| gitleaks 8.30.1 (CLI binary)                                | CI tool       | MIT (per upstream repository)                            | CI only                | NEEDS REVIEW |
| osv-scanner 2.7.0 (CLI binary)                              | CI tool       | Apache-2.0 (per upstream repository)                     | CI only                | NEEDS REVIEW |
| actionlint 1.7.12, zizmor 1.31.1                            | CI tool       | MIT (per upstream repositories)                          | CI only                | NEEDS REVIEW |
| Semgrep CE 1.183.0 and its registry rules                   | CI tool       | Engine LGPL-2.1. Registry rule licence terms need review | CI only, private repos | NEEDS REVIEW |

## Project licence

Source licence for this repository: undecided. `LICENSE` is an "All rights reserved" placeholder (OQ-008).

## Direct Preact licence evidence

| Package               | Installed version | Upstream licence                                                 |
| --------------------- | ----------------- | ---------------------------------------------------------------- |
| `preact`              | 11.2.0            | [MIT](https://github.com/preactjs/preact/blob/main/LICENSE)      |
| `@preact/signals`     | 2.11.4            | [MIT](https://github.com/preactjs/signals/blob/main/LICENSE)     |
| `preact-iso`          | 2.12.2            | [MIT](https://github.com/preactjs/preact-iso/blob/main/LICENSE)  |
| `@preact/preset-vite` | 2.10.6            | [MIT](https://github.com/preactjs/preset-vite/blob/main/LICENSE) |

This source check does not measure bundled size or constitute legal sign-off. Preserve applicable licence notices when the frontend is distributed.

## Direct Preact licence evidence

| Package               | Installed version | Upstream licence                                                 |
| --------------------- | ----------------- | ---------------------------------------------------------------- |
| `preact`              | 11.2.0            | [MIT](https://github.com/preactjs/preact/blob/main/LICENSE)      |
| `@preact/signals`     | 2.11.4            | [MIT](https://github.com/preactjs/signals/blob/main/LICENSE)     |
| `preact-iso`          | 2.12.2            | [MIT](https://github.com/preactjs/preact-iso/blob/main/LICENSE)  |
| `@preact/preset-vite` | 2.10.6            | [MIT](https://github.com/preactjs/preset-vite/blob/main/LICENSE) |

This source check does not measure bundled size or constitute legal sign-off. Preserve applicable licence notices when the frontend is distributed.

## npm packages (431)

| Package                                       | Version           | Licence                                  | Scope                   | Status                                      |
| --------------------------------------------- | ----------------- | ---------------------------------------- | ----------------------- | ------------------------------------------- |
| @babel/code-frame                             | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/compat-data                            | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/core                                   | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/generator                              | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-annotate-as-pure                | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-compilation-targets             | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-globals                         | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-module-imports                  | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-module-transforms               | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-plugin-utils                    | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-string-parser                   | 7.29.11           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-validator-identifier            | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helper-validator-option                | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/helpers                                | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/parser                                 | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/plugin-syntax-jsx                      | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/plugin-transform-react-jsx             | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/plugin-transform-react-jsx-development | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/template                               | 7.29.7            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/traverse                               | 7.29.13           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @babel/types                                  | 7.29.11           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @cacheable/memory                             | 2.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @cacheable/utils                              | 2.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @cloudflare/kv-asset-handler                  | 0.5.0             | MIT OR Apache-2.0                        | transitive dev          | ACCEPTED (allow-list)                       |
| @cloudflare/unenv-preset                      | 2.16.2            | MIT OR Apache-2.0                        | transitive dev          | ACCEPTED (allow-list)                       |
| @cloudflare/vitest-plugin                     | 1.6.0             | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @cloudflare/workerd-windows-64                | 1.20261104.1      | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @cloudflare/workers-types                     | 5.20261106.1      | MIT OR Apache-2.0                        | direct dev              | ACCEPTED (allow-list)                       |
| @commitlint/cli                               | 21.2.4            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @commitlint/config-conventional               | 21.2.4            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @commitlint/config-validator                  | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/ensure                            | 21.2.4            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/execute-rule                      | 21.0.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/format                            | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/is-ignored                        | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/lint                              | 21.2.4            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/load                              | 21.2.4            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/message                           | 21.2.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/parse                             | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/read                              | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/resolve-extends                   | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/rules                             | 21.2.4            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/to-lines                          | 21.0.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/top-level                         | 21.2.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @commitlint/types                             | 21.2.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @conventional-changelog/git-client            | 3.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @conventional-changelog/template              | 1.4.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @cspotcode/source-map-support                 | 0.8.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @emnapi/runtime                               | 1.11.3            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @esbuild/win32-x64                            | 0.28.2            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint-community/eslint-utils                | 4.10.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint-community/regexpp                     | 4.12.2            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint/config-array                          | 0.23.5            | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint/config-helpers                        | 0.7.0             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint/core                                  | 1.2.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint/js                                    | 10.0.1            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @eslint/object-schema                         | 3.0.5             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @eslint/plugin-kit                            | 0.7.3             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @gar/promise-retry                            | 1.0.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @humanfs/core                                 | 0.19.2            | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @humanfs/node                                 | 0.16.8            | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @humanfs/types                                | 0.15.0            | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @humanwhocodes/module-importer                | 1.0.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @humanwhocodes/retry                          | 0.4.3             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @img/colour                                   | 1.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @img/sharp-wasm32                             | 0.35.5            | Apache-2.0 AND LGPL-3.0-or-later AND MIT | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| @img/sharp-win32-x64                          | 0.35.5            | Apache-2.0 AND LGPL-3.0-or-later         | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| @isaacs/fs-minipass                           | 4.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @isaacs/nonrecursive-glob-match               | 1.0.3             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| @isaacs/string-locale-compare                 | 1.1.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @istanbuljs/schema                            | 0.1.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/gen-mapping                       | 0.3.13            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/remapping                         | 2.3.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/resolve-uri                       | 3.1.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/sourcemap-codec                   | 1.6.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/trace-mapping                     | 0.3.31            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @jridgewell/trace-mapping                     | 0.3.9             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @keyv/bigmap                                  | 1.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @keyv/serialize                               | 1.1.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/agent                                 | 4.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/arborist                              | 9.6.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/fs                                    | 5.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/git                                   | 7.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/installed-package-contents            | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/map-workspaces                        | 5.0.3             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/metavuln-calculator                   | 9.0.3             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/name-from-folder                      | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/node-gyp                              | 5.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/package-json                          | 7.0.5             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/promise-spawn                         | 9.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/query                                 | 5.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/redact                                | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @npmcli/run-script                            | 10.0.4            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @oxc-project/types                            | 0.156.0           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @poppinss/colors                              | 4.1.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @poppinss/dumper                              | 0.6.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @poppinss/exception                           | 1.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @preact/preset-vite                           | 2.10.6            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @preact/signals                               | 2.11.4            | MIT                                      | direct frontend runtime | ACCEPTED (allow-list)                       |
| @preact/signals-core                          | 1.14.5            | MIT                                      | transitive runtime      | ACCEPTED (allow-list)                       |
| @prefresh/babel-plugin                        | 0.5.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @prefresh/core                                | 1.5.11            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @prefresh/utils                               | 1.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @prefresh/vite                                | 2.4.12            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @rolldown/binding-win32-x64-msvc              | 1.2.16            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @rolldown/pluginutils                         | 1.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @rollup/pluginutils                           | 4.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @rollup/pluginutils                           | 5.5.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/bundle                              | 4.0.0             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/core                                | 3.2.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/protobuf-specs                      | 0.5.2             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/sign                                | 4.1.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/tuf                                 | 4.0.2             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @sigstore/verify                              | 3.1.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| @simple-libs/child-process-utils              | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @simple-libs/stream-utils                     | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @sindresorhus/is                              | 7.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @speed-highlight/core                         | 1.2.24            | CC0-1.0                                  | transitive dev          | ACCEPTED (allow-list)                       |
| @tufjs/canonical-json                         | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @tufjs/models                                 | 4.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/chai                                   | 5.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/deep-eql                               | 4.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/esrecurse                              | 4.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/estree                                 | 1.0.10            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/json-schema                            | 7.0.15            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @types/node                                   | 26.6.6            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @typescript-eslint/eslint-plugin              | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/parser                     | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/project-service            | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/scope-manager              | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/tsconfig-utils             | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/type-utils                 | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/types                      | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/typescript-estree          | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/utils                      | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @typescript-eslint/visitor-keys               | 8.72.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/coverage-istanbul                     | 5.1.0             | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @vitest/istanbul-lib-coverage                 | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/istanbul-lib-instrument               | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/istanbul-lib-report                   | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/istanbul-lib-source-maps              | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/mocker                                | 5.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/pretty-format                         | 5.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/snapshot                              | 5.1.0             | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| @vitest/spy                                   | 5.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| @vitest/utils                                 | 5.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| abbrev                                        | 2.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| abbrev                                        | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| acorn                                         | 8.19.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| acorn-jsx                                     | 5.3.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| agent-base                                    | 7.1.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ajv                                           | 6.15.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ajv                                           | 8.20.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ansi-regex                                    | 6.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ansi-styles                                   | 4.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ansi-styles                                   | 6.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| argparse                                      | 2.0.1             | Python-2.0                               | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| argue-cli                                     | 3.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| array-find-index                              | 1.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| assertion-error                               | 2.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| babel-plugin-transform-hook-names             | 1.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| balanced-match                                | 4.0.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| baseline-browser-mapping                      | 2.11.35           | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| bin-links                                     | 6.0.3             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| blake3-wasm                                   | 2.1.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| boolbase                                      | 1.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| brace-expansion                               | 5.0.12            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| browserslist                                  | 4.29.5            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cacache                                       | 20.0.4            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cacheable                                     | 2.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| callsites                                     | 3.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| caniuse-lite                                  | 1.0.30001823      | CC-BY-4.0                                | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| chai                                          | 6.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| chalk                                         | 4.1.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| chownr                                        | 3.0.0             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| cjs-module-lexer                              | 1.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cliui                                         | 9.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cmd-shim                                      | 8.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| color-convert                                 | 2.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| color-name                                    | 1.1.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| common-ancestor-path                          | 2.0.0             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| content-type                                  | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| conventional-changelog-angular                | 9.4.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| conventional-changelog-conventionalcommits    | 10.4.1            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| conventional-commits-parser                   | 7.1.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| convert-source-map                            | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cookie                                        | 1.1.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cosmiconfig                                   | 9.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| cross-spawn                                   | 7.0.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| css-select                                    | 5.2.2             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| css-what                                      | 6.2.2             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| cssesc                                        | 3.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| debug                                         | 4.4.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| deep-is                                       | 0.1.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| detect-libc                                   | 2.1.2             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| dom-serializer                                | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| domelementtype                                | 2.3.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| domhandler                                    | 5.0.3             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| domutils                                      | 3.2.2             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| electron-to-chromium                          | 1.5.479           | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| emoji-regex                                   | 10.6.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| entities                                      | 4.5.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| env-paths                                     | 2.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| error-ex                                      | 1.3.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| error-stack-parser-es                         | 1.0.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| es-module-lexer                               | 2.3.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| es-toolkit                                    | 1.53.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| esbuild                                       | 0.28.2            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| escalade                                      | 3.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| escape-string-regexp                          | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| eslint                                        | 10.14.0           | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| eslint-scope                                  | 9.1.2             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| eslint-visitor-keys                           | 3.4.3             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| eslint-visitor-keys                           | 5.0.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| espree                                        | 11.2.0            | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| esquery                                       | 1.7.0             | BSD-3-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| esrecurse                                     | 4.3.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| estraverse                                    | 5.3.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| estree-walker                                 | 2.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| estree-walker                                 | 3.0.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| esutils                                       | 2.0.3             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| expect-type                                   | 1.4.0             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| exponential-backoff                           | 3.1.3             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| fast-deep-equal                               | 3.1.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| fast-json-stable-stringify                    | 2.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| fast-levenshtein                              | 2.0.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| fast-uri                                      | 3.1.9             | BSD-3-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| fdir                                          | 6.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| file-entry-cache                              | 11.1.5            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| find-up                                       | 5.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| flat-cache                                    | 6.1.23            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| flatted                                       | 3.4.4             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| fs-minipass                                   | 3.0.3             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| gensync                                       | 1.0.0-beta.2      | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| get-caller-file                               | 2.0.5             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| get-east-asian-width                          | 1.7.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| glob                                          | 14.0.3            | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| glob-parent                                   | 6.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| global-directory                              | 5.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| graceful-fs                                   | 4.2.11            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| has-flag                                      | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| hashery                                       | 1.5.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| he                                            | 1.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| hookified                                     | 1.15.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| hookified                                     | 2.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| hosted-git-info                               | 9.0.3             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| http-cache-semantics                          | 4.3.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| http-proxy-agent                              | 7.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| https-proxy-agent                             | 7.0.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| iconv-lite                                    | 0.7.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ignore                                        | 5.3.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ignore                                        | 7.0.14            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ignore-walk                                   | 8.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| import-fresh                                  | 3.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| imurmurhash                                   | 0.1.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ini                                           | 6.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ip-address                                    | 10.7.5            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| is-arrayish                                   | 0.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| is-extglob                                    | 2.1.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| is-glob                                       | 4.0.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| is-plain-obj                                  | 4.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| isexe                                         | 2.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| isexe                                         | 4.0.0             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| jiti                                          | 2.7.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| js-tokens                                     | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| js-yaml                                       | 4.3.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| jsesc                                         | 3.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-parse-even-better-errors                 | 2.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-parse-even-better-errors                 | 5.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-schema-traverse                          | 0.4.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-schema-traverse                          | 1.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-stable-stringify-without-jsonify         | 1.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json-stringify-nice                           | 1.1.4             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| json5                                         | 2.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| jsonparse                                     | 1.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| just-diff                                     | 6.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| just-diff-apply                               | 5.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| keyv                                          | 5.6.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| kleur                                         | 4.1.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| kolorist                                      | 1.8.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| levn                                          | 0.4.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| license-checker-rseidelsohn                   | 5.0.1             | BSD-3-Clause                             | direct dev              | ACCEPTED (allow-list)                       |
| lightningcss                                  | 1.33.0            | MPL-2.0                                  | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| lightningcss-win32-x64-msvc                   | 1.33.0            | MPL-2.0                                  | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| lines-and-columns                             | 1.2.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| locate-path                                   | 6.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| lodash.clonedeep                              | 4.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| lru-cache                                     | 11.5.3            | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| lru-cache                                     | 5.1.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| magic-string                                  | 0.30.21           | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| magic-string                                  | 1.4.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| magicast                                      | 0.5.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| make-fetch-happen                             | 15.0.6            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| miniflare                                     | 5.20261104.0-beta | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minimatch                                     | 11.0.4            | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| minipass                                      | 3.3.6             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minipass                                      | 7.1.3             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| minipass-collect                              | 2.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minipass-fetch                                | 5.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minipass-flush                                | 1.0.7             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| minipass-pipeline                             | 1.2.4             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minipass-sized                                | 2.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| minizlib                                      | 3.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| mkdirp                                        | 1.0.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ms                                            | 2.1.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| nanoid                                        | 3.3.20            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| natural-compare                               | 1.4.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| negotiator                                    | 1.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| node-gyp                                      | 12.4.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| node-html-parser                              | 6.1.13            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| node-releases                                 | 2.0.63            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| nopt                                          | 7.2.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| nopt                                          | 9.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-bundled                                   | 5.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-install-checks                            | 8.0.0             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| npm-normalize-package-bin                     | 5.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-package-arg                               | 13.0.2            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-packlist                                  | 10.0.4            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-pick-manifest                             | 11.0.3            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| npm-registry-fetch                            | 19.1.1            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| nth-check                                     | 2.1.1             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| obug                                          | 3.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| optionator                                    | 0.9.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| p-limit                                       | 3.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| p-locate                                      | 5.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| p-map                                         | 7.1.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| pacote                                        | 21.5.2            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| parent-module                                 | 1.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| parse-conflict-json                           | 5.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| parse-json                                    | 5.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| path-exists                                   | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| path-key                                      | 3.1.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| path-scurry                                   | 3.0.0             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| path-to-regexp                                | 6.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| pathe                                         | 2.0.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| picocolors                                    | 1.1.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| picomatch                                     | 2.3.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| picomatch                                     | 4.0.7             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| postcss                                       | 8.5.32            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| postcss-selector-parser                       | 7.1.7             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| preact                                        | 11.2.0            | MIT                                      | direct frontend runtime | ACCEPTED (allow-list)                       |
| preact-iso                                    | 2.12.2            | MIT                                      | direct frontend runtime | ACCEPTED (allow-list)                       |
| prelude-ls                                    | 1.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| prettier                                      | 3.9.10            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| proc-log                                      | 6.1.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| proggy                                        | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| promise-all-reject-late                       | 1.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| promise-call-limit                            | 3.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| punycode                                      | 2.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| qified                                        | 0.10.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| read-cmd-shim                                 | 6.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| require-from-string                           | 2.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| resolve-from                                  | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| resolve-from                                  | 5.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| rolldown                                      | 1.2.16            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| safer-buffer                                  | 2.1.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| semver                                        | 6.3.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| semver                                        | 7.8.5             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| sharp                                         | 0.35.5            | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| shebang-command                               | 2.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| shebang-regex                                 | 3.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| signal-exit                                   | 4.1.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| sigstore                                      | 4.1.1             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| simple-code-frame                             | 1.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| smart-buffer                                  | 4.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| socks                                         | 2.8.10            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| socks-proxy-agent                             | 8.0.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| source-map                                    | 0.7.6             | BSD-3-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| source-map-js                                 | 1.2.2             | BSD-3-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-compare                                  | 1.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-correct                                  | 3.2.0             | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-exceptions                               | 2.5.0             | CC-BY-3.0                                | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| spdx-expression-parse                         | 3.0.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-expression-parse                         | 4.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-license-ids                              | 3.0.24            | CC0-1.0                                  | transitive dev          | ACCEPTED (allow-list)                       |
| spdx-ranges                                   | 2.1.1             | (MIT AND CC-BY-3.0)                      | transitive dev          | NEEDS REVIEW (reviewed exception, dev only) |
| spdx-satisfies                                | 6.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ssri                                          | 13.0.1            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| stack-trace                                   | 1.0.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| std-env                                       | 4.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| string-width                                  | 7.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| string-width                                  | 8.3.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| strip-ansi                                    | 7.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| supports-color                                | 10.2.2            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| supports-color                                | 7.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| tar                                           | 7.5.22            | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| tinybench                                     | 6.2.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| tinyexec                                      | 1.3.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| tinyglobby                                    | 0.2.17            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| tinyrainbow                                   | 3.2.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| treeify                                       | 1.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| treeverse                                     | 3.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ts-api-utils                                  | 2.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| tslib                                         | 2.9.1             | 0BSD                                     | transitive dev          | ACCEPTED (allow-list)                       |
| tuf-js                                        | 4.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| type-check                                    | 0.4.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| typescript                                    | 6.0.3             | Apache-2.0                               | direct dev              | ACCEPTED (allow-list)                       |
| typescript-eslint                             | 8.72.1            | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| undici                                        | 6.29.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| undici                                        | 7.30.1            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| undici-types                                  | 8.9.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| unenv                                         | 2.0.0-rc.24       | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| update-browserslist-db                        | 1.3.4             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| uri-js                                        | 4.4.1             | BSD-2-Clause                             | transitive dev          | ACCEPTED (allow-list)                       |
| util-deprecate                                | 1.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| validate-npm-package-name                     | 7.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| verkit                                        | 0.5.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| vite                                          | 8.3.6             | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| vite-prerender-plugin                         | 0.5.14            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| vitest                                        | 5.1.0             | MIT                                      | direct dev              | ACCEPTED (allow-list)                       |
| walk-up-path                                  | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| which                                         | 2.0.2             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| which                                         | 6.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| why-is-node-running                           | 3.2.1             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| word-wrap                                     | 1.2.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| workerd                                       | 1.20261104.1      | Apache-2.0                               | transitive dev          | ACCEPTED (allow-list)                       |
| wrangler                                      | 4.158.0           | MIT OR Apache-2.0                        | direct dev              | ACCEPTED (allow-list)                       |
| wrap-ansi                                     | 9.0.2             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| write-file-atomic                             | 7.0.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| ws                                            | 8.21.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| y18n                                          | 5.0.8             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| yallist                                       | 3.1.1             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| yallist                                       | 4.0.0             | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| yallist                                       | 5.0.0             | BlueOak-1.0.0                            | transitive dev          | ACCEPTED (allow-list)                       |
| yargs                                         | 18.2.0            | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| yargs-parser                                  | 22.0.0            | ISC                                      | transitive dev          | ACCEPTED (allow-list)                       |
| yocto-queue                                   | 0.1.0             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| youch                                         | 4.1.0-beta.10     | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| youch-core                                    | 0.3.3             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| zimmerframe                                   | 1.1.5             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
| zod                                           | 4.6.6             | MIT                                      | transitive dev          | ACCEPTED (allow-list)                       |
