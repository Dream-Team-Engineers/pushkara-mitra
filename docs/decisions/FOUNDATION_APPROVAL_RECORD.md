# Foundation approval record — issue #24

Recorded 2026-11-05 (IST). Base: `d4f33d150ac499c9eae92c2f247c369a15693d4f`. This record separates actual instructions from approvals still required. It is not an independent review or legal certification.

## Owner updates — 2026-11-14 (IST)

- **Repository visibility:** The owner selected public for now, with a possible private-repository decision after project completion. This supersedes item 2 of the 5 Nov instructions below. Protection enforcement and independent review still require live verification; see ADR 0007.
- **Prelaunch identity decision:** The data fiduciary legal entity and named nodal/grievance contact are **UNDECIDED**. The owner asked that this question not be raised again during project completion. Record it as an important prelaunch gate and revisit it before launch; do not invent names, notices or legal approval. Work that depends on identified legal responsibility or live personal-data processing remains gated until the decision is recorded and reviewed.

## Actual LEAD instructions received

The requesting human identified themselves as LEAD in the Codex conversation and authorized engineering remediation and preparation of the issue's closure evidence. They explicitly selected:

1. Adopt the corrected standards replacement, **subject to final independent review**.
2. Keep the repository private; the owner will arrange a plan supporting enforced protections. No purchase, public visibility change or manual-bypass exception was authorized.
3. Any one of the three named maintainers may independently review: `amruthamudunuru39`, `siddhu949`, `gkmraju`, **excluding the author of the change**. This nominates eligible reviewers; it does not say a review occurred.

Recorded by the engineering agent. The connected GitHub identity and the author of the remediation PR must remain accurately attributed. Do not impersonate a maintainer, backdate a review, or turn these conversation instructions into a submitted GitHub Approve review. Final approval must identify the actual reviewed revision.

## Current gate evidence

| Gate                             | Actual evidence                                                              | Remaining requirement                                                                                                        | State                |
| -------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| G0 standards source              | Corrected replacement selected by requesting LEAD                            | Final independent technical/domain review, reference reconciliation and approved content revision                            | PENDING REVIEW       |
| G0 repository governance         | Private/enforced model selected; owner to arrange plan                       | Native control availability, reviewed setup and read-back verification; no self-approval or bypass                           | PENDING OWNER SETUP  |
| G0 scope/backlog                 | Full original-product target and foundation-first sequence remain documented | Confirm current tranche, acceptance and approved exclusions against the final revision                                       | PENDING CONFIRMATION |
| G1 identity/permissions/sessions | Existing BF-01–BF-04 proposal and draft ADR 0008                             | Concrete contract choices, configured trust boundary, actual security/privacy review                                         | PENDING              |
| G1 data/audit/consent            | Existing BF-05–BF-08 proposal                                                | Approved fields, purposes/basis, notice text, retention durations, withdrawal/deletion/restore behavior and qualified review | PENDING              |
| G1 operations                    | BF-09–BF-10 proposal and draft ADR 0010                                      | Exact logging/abuse/failure policies, assigned operators, approved review/test evidence                                      | PENDING              |
| Independent human review         | Any named non-author maintainer is eligible                                  | Actual Approve review on final head; no unresolved blocking changes                                                          | PENDING              |
| Legal and specialist competence  | No appointment/qualification evidence supplied in this session               | Name actual reviewer and scope; required counsel conclusions stay NEEDS REVIEW                                               | PENDING              |
| G4 production                    | Existing fail-closed production path                                         | Separate authorized launch decision, later evidence and controls                                                             | BLOCKED — unchanged  |

A normal code-owner review is not automatically security/privacy competence or counsel approval. An agent review cannot fill the human approval cells.

## Reference reconciliation for the selected replacement

The candidate is a replacement, not a verbatim recovery. Review each affected normative reference before adoption:

- Original section 5: children/dependents → replacement sections 6, 7, 13; ADR 0006 and child-safety review remain blocked pending the required domain decision.
- Original section 6: location → replacement section 7; preserve the staging-only provisioned-but-unused namespace exception, and all storage/logging prohibitions.
- Original section 9: law inventory → replacement sections 6, 11, 13; counsel must verify sources, scope and applicability separately.
- Original section 14: no equivalence asserted. Replacement section 14 explicitly defines testing evidence; independent review must confirm the replacement requirement.
- Original section 18: absent from uploaded source; do not invent text. The LEAD selection acknowledges using a replacement; final independent review must explicitly disposition the missing-source limitation and required replacement controls.

Do not rewrite historical status entries. Correct stale current summaries with a new timestamped entry and evidence. Original source bytes remain unchanged.

## BF decisions still needed

Use BF-01–BF-10 in BACKEND_FOUNDATION_DECISIONS.md. A concrete proposal may be prepared, but no numerical session lifetime, retention period, identity attribute, legal basis, notice text, provider setting or log sink is approved merely by this record. Optional processing remains off. Each required decision needs its human owner, rationale, artifact SHA, actual review link, date and conditions.

## Completion rule

Close #24 as completed only after its required decisions are resolved, independent final-head review and applicable domain review are evidenced, the selected private enforcement is verified, and the delivery backlog has owners, dependencies and acceptance tests. Link all evidence in the closure comment. Draft PRs, passing scanners and LEAD's general authorization do not themselves establish those remaining facts. No automatic issue-closing keyword belongs on an incomplete decision PR.
