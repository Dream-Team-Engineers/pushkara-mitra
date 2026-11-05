# Standards adoption: human decision checklist

Status: **DRAFT — adoption is not approved.** Prepared 2026-11-04 (IST) against main `cc26ee271e7b961bcd90900c0e8a043774cde406`.

This checklist accompanies the corrected [standards candidate](ENGINEERING_STANDARDS_v3_DRAFT.md). It supplies concrete choices and record fields, not approval. `docs/ENGINEERING_STANDARDS.md` remains the authoritative placeholder. G0/G1 and the V2 stop gate remain in force; no application implementation, production path, resource, settings or paid action is authorized here.

## 1. Authority decision — LEAD and owners

Record exactly one disposition, with reasons:

- **Recover the original:** supply the authoritative original Master Engineering Instructions v3.0, provenance and intended section references; reconcile this candidate against it before adoption.
- **Adopt a newly authored replacement:** explicitly acknowledge that this candidate is not recovered original text, accept its provenance limitations, approve the reconciled replacement requirements and identify the exact adopted revision.
- **Request revision or reject:** name the remaining requirements and keep dependent implementation blocked.

No option is selected by this checklist. A merge of the draft or source archival is not an authority decision. Keep the [uploaded DOCX](sources/Pushkara_Mitra_Engineering_Standards_v3_DRAFT.docx) unchanged; its recorded SHA-256 is `69c26da8a53cdc6c06d26fd9e633e06ee88c66a01dc6042d5ce7db7684277c4e`. The corrected candidate intentionally differs from that source.

## 2. Scope decision — G0, with later gates preserved

The current user direction sets the full product target to Kumbh-Sathi feature/user-flow parity adapted independently for Pushkara Mitra. The separate reference-parity proposal records the concrete matrix; reference reuse rights are not inferred. Record the approved implementation tranche and gated exclusions without silently reducing that full target:

| Choice for humans                                                                | Concrete boundary                                                                                                                                                                              | Additional evidence required                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation-only V2 first tranche (candidate recommendation; not the full target) | Admin auth, approved sessions/RBAC, abuse controls, safe logging, minimal D1 audit/consent, multilingual accessible PWA/static offline/notices                                                 | Foundation acceptance criteria, G1 decisions, technical/privacy review and staged verification plan                                          |
| Later full-parity tranches                                                       | Retain and enumerate all full-target features explicitly; never infer groups, directory, lost-and-found, location, missing persons, children, payments or notifications from a sprint schedule | Feature-specific threat model, data/retention contract, acceptance criteria and applicable G1–G3 human/legal decisions before implementation |
| Continue stabilization/design only                                               | CI/security/release controls, evidence and decision-ready proposals; no blocked product implementation                                                                                         | List the decisions still outstanding and owners                                                                                              |

No scope choice authorizes location persistence, production deployment, spending, DNS or access/permission changes. Children/dependents remain blocked under ADR 0006 unless its required counsel decision is actually recorded. Production retains its separate stop gate and G4 requirements even if foundation scope is approved.

## 3. Concrete corrections to review

- [ ] **Signing:** section 3 requires signed commits, including platform-signed commits. No implicit exemption for unconfigured team signing; any exception is explicit, scoped, owned, risk-reviewed and time-limited.
- [ ] **Independent approval:** confirm proposed human reviewers and competence/independence; no author or agent self-approval. Under a plan without enforcement, specify the human integrator's exact head-SHA/review/check/gate verification record and residual-risk owner. CODEOWNERS alone does not enforce this.
- [ ] **Location/SQLite:** section 7 preserves ADR 0004 Amendment 1's staging-only provisioned-but-unused SQLite Durable Object exception; it authorizes no storage, SQL, KV, alarms, attachments or D1 location history. Preview/production remain unchanged.
- [ ] **Deployment truth:** section 12 distinguishes optional preview orchestration success from a deployed preview, requires explicit NOT DEPLOYED/reason when skipped and real URL/commit/functional evidence before a deployment claim. Required deployments fail on missing credentials or underlying failure.
- [ ] **Production safety:** section 12 preserves the merged fail-closed stop gate and decoupled release automation. Standards adoption itself cannot re-enable production; no agent merges or deploys production.
- [ ] **Version/history:** section 16 uses only a prospective owner-approved staging foundation release decision. No fixed stale target, reset, recreated tag or rewritten release history is authorized.
- [ ] **Legal state:** applicability, effective dates, notices and retention remain human/counsel decisions; registers stay NEEDS REVIEW where evidence is missing.
- [ ] **Contracts:** approve or explicitly defer each pending backend decision under the separate G1 record; standards approval alone does not choose auth, roles, sessions, identity, consent or logging defaults.

A checked box must point to a human review record; do not precheck based on this agent-authored correction.

## 4. Reference and ADR reconciliation record

Use the candidate's reference mapping as a starting proposal. Search all normative references and record one row for each. Original numbering is not known to be equivalent.

| Affected record                                             | Historical reference / requirement                         | Proposed disposition                                                                                                                      | Required human reviewer                                        | Actual decision / link |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------- |
| `docs/compliance/children-data-safety.md`, ADR 0006, OQ-002 | Original section 5 / child review                          | Evaluate candidate sections 6, 7, 13; reconcile questions and implementation block                                                        | Counsel, privacy reviewer, LEAD                                | PENDING                |
| ADR 0004                                                    | Original section 6 / location controls                     | Evaluate candidate section 7 and preserve staging-only Amendment 1                                                                        | Independent security reviewer, LEAD                            | PENDING                |
| `docs/compliance/legal-register.md`, OQ-002                 | Original section 9 / law inventory                         | Evaluate candidate sections 6, 11, 13; verify completeness against authoritative sources                                                  | Counsel                                                        | PENDING                |
| Standards placeholder and historical status                 | Original section 14                                        | Recover intended requirement or approve explicit replacement; do not assert equivalence with candidate section 14                         | LEAD, technical/security reviewers                             | PENDING                |
| Standards placeholder and historical status                 | Original section 18, absent from source                    | Recover intended requirement or record explicit acceptance of source limitation and replacement requirements; do not fabricate section 18 | LEAD and all required domain reviewers                         | PENDING                |
| ADR 0007                                                    | Visibility/plan and effective governance                   | Record chosen plan/control model and residual risk; no paid or settings action through adoption                                           | Owners, LEAD                                                   | PENDING                |
| ADRs 0005/0006 and backend decisions                        | Logging/residency, child block and identity/data contracts | Accept, revise or defer each explicitly; do not accept unrelated ADRs by implication                                                      | Domain owner, security/privacy reviewer, counsel as applicable | PENDING                |

Historical status entries remain history; prepend a newer timestamped correction with evidence. The adoption PR must list all normative documents it will update and the exact approved replacements; this candidate edits neither the placeholder nor those records.

## 5. Human review record fields

Create a separate record for each actual human reviewer. Proposed nominees in candidate section 17 must first confirm their role; nomination is not review or consent. A qualified independent security/privacy reviewer and counsel have not been identified by this draft.

| Field                 | Required content                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewer              | Actual human name/GitHub identity, role and competence where relevant; no agent signature                                               |
| Independence          | Authorship/conflict declaration and how required independent review is satisfied                                                        |
| Reviewed artifact     | Candidate path plus exact full content commit SHA and durable PR/review URL; not only a moving branch                                   |
| Decision              | Approve, reject or request changes; no default value                                                                                    |
| Scope                 | Authority choice, implementation boundary, explicit exclusions and reviewed domains                                                     |
| Findings / conditions | Each condition with owner, required evidence and blocking/nonblocking disposition; unresolved mandatory conditions block dependent work |
| Gate disposition      | G0 and each G1 subdecision separately; legal scope separately; explicit statements of what is not approved                              |
| Date                  | Actual review date and timezone; never a fabricated or backdated approval                                                               |
| Evidence              | Human review/comment/decision links, referenced ADRs, test/CI evidence and required legal-source evidence                               |
| Follow-up             | Owner and due date for deferred items; exception expiry and compensating controls where applicable                                      |

LEAD `@amruthamudunuru39` is the proposed document/scope owner; DEV2 `@siddhu949` is the proposed independent technical reviewer if independence is confirmed; DEV3 `@gkmraju` is a backend contributor and cannot self-approve authored work. LEAD must nominate the missing qualified security/privacy and legal reviewers. These are proposed responsibilities, not evidence that any person accepted or approved them.

## 6. G1 implementation decisions to record separately

For every BF-01 through BF-10 row in [BACKEND_FOUNDATION_DECISIONS.md](BACKEND_FOUNDATION_DECISIONS.md), record the selected contract, rationale, owner, review links and exact revision. At minimum:

- User-auth model and ADR 0008; admin Access trust configuration and principal mapping; human-owned permissions and assignment/revocation process.
- Session mechanism, expiry/rotation/revocation/recovery, cookie/CSRF or bearer controls; rate/body limits and safe errors.
- Minimal identity/audit/consent fields, access scopes, retention/deletion/restore behavior and processor/residency review.
- Reviewed purpose/notice versions, affirmative consent and withdrawal enforcement; optional purposes remain off until approved.
- ADR 0010 logging/error-tracking choice; scrubbed event fields, sink/retention and operational failure policies, reconciled with proposed ADR 0005.
- Negative test matrix and independent security/privacy review of the location/data threat boundaries.

Do not select numeric lifetimes, role names, identity providers, log sinks or consent notices merely to fill fields. No real personal data processing or remote D1 binding/migration is authorized by an incomplete decision record.

## 7. Adoption change and verification

After humans record the required authority/scope/reference/ADR decisions, prepare a separate adoption PR containing the exact approved normative text, reconciled references, decision evidence and an explicit disposition of the placeholder and V2 stop gate. Human approvals must refer to its final reviewed content revision; substantive changes after review require renewed review.

Check the following before claiming adoption complete:

- Approved text and evidence agree on scope and revision; required human reviewers are independent and actual; no unresolved mandatory condition is represented as passed.
- Referenced files/anchors resolve; formatting, documentation checks and required CI pass. CI verifies engineering checks, not authority or legal compliance.
- G0 adoption and dependent G1 authorization are stated separately; deferred contracts still block their implementation.
- Production stop-gate tests and location privacy guards remain intact. No version/tag/history reset, settings/paid action or feature enablement is bundled into the adoption PR.
- `PROJECT_STATUS.md` receives a new entry prepended at the top, timestamped in IST, with agent/owner accountability, the exact adopted revision, human evidence, tests, outstanding gates and next authorized task. Preserve older entries as history. Until that evidence exists, report DRAFT/PENDING.

This checklist is preparation for human review. It does not replace review, approve its own proposed corrections, or ask agents to merge the adoption change.
