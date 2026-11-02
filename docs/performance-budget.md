# Performance budget

Network at the event is expected to be poor and saturated. Budgets below are **proposed starting points** to be validated in M5 and M8 on a real low-end Android device.

| Metric                                        | Budget (proposed)   |
| --------------------------------------------- | ------------------- |
| First load, JS + CSS (compressed)             | 150 KB              |
| First load, total transferred                 | 300 KB              |
| Time to interactive on a throttled 3G profile | 5 s                 |
| Repeat load from cache                        | Works fully offline |
| API response payloads                         | Under 10 KB typical |
| Telugu font                                   | Subset, under 60 KB |

## Enforcement

Not yet automated. A bundle-size check joins CI in M1, and Lighthouse or WebPageTest runs against the preview in M5.

## Principles

Ship less. Cache aggressively but never personal data. Degrade gracefully when the network drops.
