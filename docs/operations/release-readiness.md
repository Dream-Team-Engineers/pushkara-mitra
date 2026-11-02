# Release readiness

Engineering readiness and legal sign-off are reported **separately**. Both must be green before go-live (M6, 2027-05-13).

## Engineering readiness

| Gate                                                               | Evidence                                                              | Status       |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------ |
| All required checks green on `main`                                | CI                                                                    | NEEDS REVIEW |
| Independent security test completed and findings closed            | M5 report                                                             | NOT STARTED  |
| Performance budget met on a low-end device and a throttled network | [performance-budget](../performance-budget.md)                        | NOT STARTED  |
| Accessibility audit (WCAG 2.2 AA)                                  | [accessibility-compliance](../compliance/accessibility-compliance.md) | NOT STARTED  |
| Offline, rollback and deletion drills done                         | M8                                                                    | NOT STARTED  |
| Kill switches tested                                               | Test output                                                           | NOT STARTED  |

## Legal sign-off

| Gate                                           | Owner   | Status      |
| ---------------------------------------------- | ------- | ----------- |
| DPDP position and notices approved             | Counsel | NOT STARTED |
| Children and missing-person workflows approved | Counsel | NOT STARTED |
| Donations (only if built) approved             | Counsel | NOT STARTED |
| Trademark and asset rights cleared             | Counsel | NOT STARTED |
| CERT-In applicability recorded                 | Counsel | NOT STARTED |

Nothing here is `PASS`. Engineering cannot certify legal compliance.
