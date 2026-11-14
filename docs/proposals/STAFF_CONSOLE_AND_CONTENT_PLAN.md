# Staff console and content intake plan

Status: **PROPOSED — design only.** Prepared 2026-11-14 (IST). Creates no screen, route, role or data. Builds on [CONTENT_WORKFLOW](CONTENT_WORKFLOW.md), [RBAC_MATRIX](RBAC_MATRIX.md), [Access verifier](../security/access-jwt-verification.md) and [ADR 0012](../decisions/0012-backend-architecture-and-d1.md).

## 1. Part A: Staff console (open decision, with a recommendation)

| Option                                                                                       | Pros                                                                                                                | Cons                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A1. Separate small admin bundle served under `/admin`, same Worker, behind Cloudflare Access | Keeps staff code out of the public bundle and its size budget; one deploy path; reuses the Access verifier and RBAC | Second front-end entry to build and test                                                                              |
| A2. Screens inside the public app, hidden by a role flag                                     | Least code                                                                                                          | Staff code ships to every visitor; a role flag must never grant authority; larger attack surface. **Not recommended** |
| A3. Off-the-shelf headless CMS or no-code tool behind Access                                 | Fastest to stand up                                                                                                 | New vendor, data residency and licence review, harder four-eyes and audit guarantees, possible personal-data transfer |

**Recommendation: A1, kept minimal.** Screens: sign-in state (from Access), my drafts, review queue, item editor with a source field, approve/send back, withdraw, audit view for approvers. Plain forms, no live features, Telugu/English UI optional for staff but the content fields are per-locale. Server enforces everything; the UI only reflects it.

Until A1 exists and BF-02/BF-03 are decided, **no staff screen is built**.

## 2. Part B: Content intake that needs no backend (can start now)

The slowest dependency is real, sourced, reviewed content, not code. The content team can collect it in a shared spreadsheet now, and it later imports into the workflow as drafts (never straight to approved).

### Columns (one row per item per language)

| Column                     | Rule                                                                             |
| -------------------------- | -------------------------------------------------------------------------------- |
| `kind`                     | ghat, stay, travel, update, notice                                               |
| `locale`                   | te, en, hi; one row per language, no machine-filled gaps                         |
| `title`                    | up to 120 characters                                                             |
| `body`                     | up to 12 short paragraphs of up to 600 characters each, plain text               |
| `source_name`              | Who published it (an official body, an operator, an eyewitness team)             |
| `source_url`               | https link if one exists                                                         |
| `retrieved_on`             | Date the collector checked it                                                    |
| `licence_or_permission`    | Own work, permission obtained (reference), public licence (name), or **unknown** |
| `collector`                | Initials only, not full names                                                    |
| `reviewer` / `reviewed_on` | Filled only after an independent check                                           |
| `status`                   | candidate, checked, needs permission, rejected                                   |

### Rules for collectors

1. No item is "checked" until a second person confirmed it against its source.
2. Unknown licence means do not use. Do not copy text, photos, maps or directory entries without permission (copyright policy).
3. No personal phone numbers, home addresses, photos of people, or child or missing-person details.
4. Contacts, helplines and timings stay `candidate` until verified with the owner of the number or schedule, with the date recorded. Never present a candidate as guidance.
5. No claims of official status or government endorsement.
6. Translation is reviewed by a native speaker of that language; machine translation is a draft only.
7. Sensitive or safety-related items are flagged for the safety moderator.

### What the spreadsheet is not

It is not the system of record for any personal data, and it must not hold secrets or location. Because it lives outside the app, it needs an owner, restricted sharing and a deletion date.

## 3. Hand-over from spreadsheet to app

1. Counsel and owners approve the content data contract (tier 1 of the data model).
2. A reviewed import script (synthetic test data first) validates rows against the contract and creates **drafts** only.
3. Approvers review and approve in the console; nothing becomes public by import.

## 4. Open items

- Who owns the content team and the safety moderator role (OWNER_DECISION_PACK questions 6 and 7).
- Where the intake spreadsheet lives and who may access it.
- Licence and provenance rules for map-derived facts (asset register).
- Whether staff UI needs Telugu.
- Counsel review of the "unknown licence" and permission process.
