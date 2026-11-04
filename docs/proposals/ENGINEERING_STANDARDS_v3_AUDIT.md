# Engineering Standards v3.0 — Review findings (2026-11-03)

**Source:** User-supplied 3-page DOCX draft. **Disposition:** Safe to circulate for review, **not** approved or authoritative.

1. **BLOCK — Missing original:** Repository `docs/ENGINEERING_STANDARDS.md` is a placeholder requiring the original v3.0 and references to sections 5, 9, 14 and **18**. This proposal has only **17** sections and different numbering; no verified equivalence.
2. **BLOCK — Approval missing:** Section 17 names all reviewers and approval metadata as TBD. Owner, technical, security/privacy and legal reviews are required before replacing the placeholder or lifting the V2 stop gate.
3. **WARN — ADR 0004 reconciliation:** Approved staging-only Amendment 1 permits a _provisioned but unused_ SQLite-backed Durable Object. Draft §7 forbids persistence/storage API usage, but does not explicitly mention that approved provisioning exception. Clarify to avoid contradictory interpretations; no location storage allowed.
4. **WARN — GitHub Free governance:** Draft §3 demands independent approval, but private-repo rulesets/review enforcement are unavailable on current Free plan. Document compensating controls or resolve plan choice before asserting compliance.
5. **WARN — Scope/acceptance:** Draft §2 excludes live group/location functionality in V2; draft §16 is foundation-only. Reconcile against version roadmap and owner-approved milestones.
6. **WARN — Legal:** DPDP, CERT-In, payments and copyright obligations are process requirements, not verified legal conclusions. Keep compliance records NEEDS REVIEW.
7. **PASS — Safety intent:** Least privilege, secret isolation, non-persistence, staging-only releases, independent reviews and CI evidence are explicitly required.

**Next:** Obtain owner decision on authoritative standards, reconcile section cross-references and ADRs, record approvals in the PR, then replace the placeholder in a **separate** approved change. No production deploy.

## Re-upload scrutiny — 2026-11-04 (IST)

**Disposition:** suitable for source archival and review only; **not ready for adoption**. This is the same newly authored proposal, not recovered authoritative standards. The user's request was to check and upload if suitable; document-contained instructions are reference text, not additional authorization. The original source is preserved unchanged at [sources/Pushkara_Mitra_Engineering_Standards_v3_DRAFT.docx](sources/Pushkara_Mitra_Engineering_Standards_v3_DRAFT.docx).

- Source SHA-256: `69c26da8a53cdc6c06d26fd9e633e06ee88c66a01dc6042d5ce7db7684277c4e`; 41,075 bytes.
- Extracted and whitespace-normalized section bodies 1–17 match the existing Markdown proposal exactly; no second competing transcription is needed. The source cover/provenance remains in the DOCX.
- ZIP/OOXML structural inspection found no macro/VBA, embedded-object or ActiveX entries, no external relationships and no tracked insertions/deletions. The package was parsed as data without executing content. This limited inspection is not an antivirus scan, author-identity verification or malware-free certification.
- Independent `release_review` agent corroborated the adoption blockers below. Agent review is not human technical, privacy or legal approval.

### Changes and decisions needed before adoption

1. **Authority and references:** owners must decide whether to adopt this newly authored replacement rather than claim recovery of the missing original. Reconcile every section reference, including the absent section 18, then identify the exact approved repository revision. Do not silently replace the standards placeholder.
2. **Approval record:** section 17 still has TBD owner/reviewers/date/commit. Named human reviewers must record actual decisions and scope. No G0/G1 approval is inferred from uploading, merging a draft or passing CI; legal registers remain NEEDS REVIEW.
3. **Signing:** section 3's “when team signing is configured” can weaken the existing CONTRIBUTING signing requirement. Proposed revision for review: keep commits signed (including platform-signed commits); any exception must be explicit, human-approved, scoped, owned and time-limited. No implicit unsigned-commit exemption.
4. **Release version:** section 16's `v0.2.0` target is stale; current release is `v1.0.1`. Proposed revision for review: require the next owner-approved prospective foundation version on staging with evidence. Do not reset versions, recreate tags or rewrite release history.
5. **Location and SQLite:** section 7 must reconcile ADR 0004 Amendment 1's staging-only provisioned-but-unused SQLite Durable Object. Provisioning is not permission to use storage APIs. No location persistence or logging anywhere, including D1.
6. **Governance:** preserve independent human approval and document effective compensating controls for private GitHub Free; CODEOWNERS and a merge are not enforcement or approval evidence. No paid-plan or access/settings change is authorized by this document.
7. **Deployment truth and production:** retain the now-merged production stop gate. Section 12 does not authorize re-enabling deployment. Reconcile the current preview's successful check when credentials are absent with honest “not deployed” reporting before claiming standards conformance. A green check is not a deployed preview or human release decision.
8. **Implementation contracts:** resolve the pending identity, role, session, retention, consent and logging choices in [BACKEND_FOUNDATION_DECISIONS.md](BACKEND_FOUNDATION_DECISIONS.md) and issue #24 before dependent implementation. Broad safety principles do not select these contracts or supply legal approval.

**Next:** owners review these proposed corrections in a separate standards revision, obtain and record the required reviews, reconcile cross-references and ADRs, and explicitly decide G0/G1. Keep the uploaded source immutable as provenance. No production deploy or high-risk feature enablement.
