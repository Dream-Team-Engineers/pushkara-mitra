# Third-party attributions

Notices that must ship with the app. The Worker has no runtime dependencies. The new frontend build (not yet served; see ADR 0011) bundles Preact packages (MIT) and self-hosts the fonts below. The current public shell serves the same fonts.

| Component                                        | Licence     | Required notice                                                           | Where shipped              | Status       |
| ------------------------------------------------ | ----------- | ------------------------------------------------------------------------- | -------------------------- | ------------ |
| Roboto (Latin subset)                            | SIL OFL 1.1 | Copyright notice and licence text, `web/public/fonts/Roboto-OFL.txt`      | `/fonts/` in the built app | NEEDS REVIEW |
| Noto Sans Telugu, Noto Sans Devanagari (subsets) | SIL OFL 1.1 | Licence texts beside the fonts                                            | `/fonts/` in the built app | NEEDS REVIEW |
| Preact, @preact/signals and related packages     | MIT         | Licence text in the bundle or a notices page (notices page not built yet) | Bundled JavaScript         | NEEDS REVIEW |

Rule: when a runtime dependency, font, icon set or dataset is added, add its notice here in the same pull request and update [licence-register.md](licence-register.md).
