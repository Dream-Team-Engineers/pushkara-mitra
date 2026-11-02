# Accessibility compliance

Target: WCAG 2.2 AA, Telugu-first, usable at 200% text size and with a screen reader. Pilgrims include elderly and low-literacy users.

> Engineering is not legal advice. Every status below is `NEEDS REVIEW` until evidence exists in the repo or CI and counsel has reviewed it. Record schema: Kickoff Prompt V1, section 6.4. Sources marked "unverified" are listed in [OPEN_QUESTIONS](../decisions/OPEN_QUESTIONS.md).

## Controls

| ID      | Obligation                                                            | Applies? (Y/N/TBD + reason) | Authoritative source (URL + date retrieved)                      | Effective date | Owner | Implementation                    | Verification method                             | Evidence ref | Legal review status | Status       |
| ------- | --------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------- | -------------- | ----- | --------------------------------- | ----------------------------------------------- | ------------ | ------------------- | ------------ |
| A11Y-01 | WCAG 2.2 AA conformance for all user flows                            | Y: design target            | unverified: not retrieved (see OPEN_QUESTIONS)                   | NEEDS REVIEW   | LEAD  | Component and page checks from M1 | automated a11y test + manual screen-reader test | none yet     | NOT STARTED         | NEEDS REVIEW |
| A11Y-02 | Works at 200% text size and in high-contrast and reduced-motion modes | Y                           | unverified: not retrieved (see OPEN_QUESTIONS)                   | NEEDS REVIEW   | LEAD  | PR checklist item on every PR     | manual test                                     | none yet     | NOT STARTED         | NEEDS REVIEW |
| A11Y-03 | All strings externalised; Telugu is the default language              | Y                           | unverified: not retrieved (see OPEN_QUESTIONS)                   | NEEDS REVIEW   | LEAD  | docs/i18n.md                      | automated lint of hard-coded strings (to add)   | none yet     | NOT STARTED         | NEEDS REVIEW |
| A11Y-04 | Telugu and English text reviewed by a native speaker                  | Y                           | unverified: not retrieved (see OPEN_QUESTIONS)                   | NEEDS REVIEW   | LEAD  | Review task per release           | document review                                 | none yet     | NOT STARTED         | NEEDS REVIEW |
| A11Y-05 | Legal duties on accessibility (RPwD Act 2016, GIGW if relevant)       | TBD                         | unverified: not retrieved. Primary: https://www.indiacode.nic.in | NEEDS REVIEW   | LEAD  | Counsel to confirm                | counsel review                                  | none yet     | NOT STARTED         | NEEDS REVIEW |
