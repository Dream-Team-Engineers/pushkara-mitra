# Frontend platform decision matrix

Proposal for owner review, 2026-11-10. Ratings are qualitative engineering judgements, not measurements. Size and performance claims must be measured on the reference device before they are relied on.

| Criterion                          | Responsive PWA                          | PWA as Trusted Web Activity (Play Store)  | Capacitor                                | React Native (Expo)               | Flutter                               | Native Kotlin                         |
| ---------------------------------- | --------------------------------------- | ----------------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------------- | ------------------------------------- |
| Install friction and size          | Lowest: open a link; optional install   | Store install; small wrapper over the PWA | Store install; bundles web app + runtime | Store install; ships a JS runtime | Store install; ships an engine        | Store install; smallest native binary |
| Cold start, memory, battery        | Good if budgets are held                | Same as PWA                               | Similar to PWA plus native shell         | Good; extra runtime cost          | Good; engine cost                     | Best achievable                       |
| Rendering and animation            | Good for this UI; map is the heavy part | Same as PWA                               | Same as PWA (webview)                    | Native views; smooth              | Very smooth custom rendering          | Best                                  |
| Offline                            | Service worker + IndexedDB              | Same as PWA                               | Same, plus native storage                | Native storage                    | Native storage                        | Native storage                        |
| Foreground / background location   | Foreground only                         | Foreground only                           | Background possible via plugins          | Background possible               | Background possible                   | Full control                          |
| Push notifications                 | Web Push (Android); limited on iOS      | Web Push                                  | Native push                              | Native push                       | Native push                           | Native push                           |
| iOS limitations                    | Install and push are limited            | Android only                              | Needs separate iOS build                 | Needs iOS build                   | Needs iOS build                       | Android only                          |
| Updates and store review           | Instant deploys, no review              | Web content updates instantly             | Web updates fast; native needs review    | Store review (OTA options exist)  | Store review                          | Store review                          |
| Accessibility and Telugu shaping   | Browser shaping is mature               | Same as PWA                               | Same as PWA                              | Platform text; verify Telugu      | Own text stack; verify Telugu shaping | Platform text                         |
| Team skill (web, TypeScript)       | Direct fit                              | Direct fit                                | Direct fit                               | Partial fit                       | New language (Dart)                   | New language and platform             |
| Fit with existing repo and $0 goal | Direct; current shell is a PWA          | Adds a Play listing (one-off fee applies) | Adds native tooling                      | New codebase                      | New codebase                          | New codebase                          |

## Recommendation

**PWA first.** It reuses the existing shell and pipeline, deploys instantly during the event, needs no store review, and matches the privacy model (foreground-only location; ADR 0004 forbids background tracking anyway).

**Optional later step:** wrap the same PWA as a Trusted Web Activity for a Play Store listing if discovery or install rates demand it. Consider Capacitor only if an approved feature truly needs a native capability the web cannot provide. Neither is an automatic migration; each needs its own ADR.
