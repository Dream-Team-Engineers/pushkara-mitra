# Engineering Standards v3.0 — Review findings (2026-11-03)

**Source:** User-supplied 3-page DOCX draft. **Disposition:** Safe to circulate for review, **not** approved or authoritative.

1. **BLOCK — Missing original:** Repository `docs/ENGINEERING_STANDARDS.md` is a placeholder requiring the original v3.0 and references to sections 5, 9, 14 and **18**. This proposal has only **17** sections and different numbering; no verified equivalence.
2. **BLOCK — Approval missing:** Section 17 names all reviewers and approval metadata as TBD. Owner, technical, security/privacy and legal reviews are required before replacing the placeholder or lifting the V2 stop gate.
3. **WARN — ADR 0004 reconciliation:** Approved staging-only Amendment 1 permits a *provisioned but unused* SQLite-backed Durable Object. Draft §7 forbids persistence/storage API usage, but does not explicitly mention that approved provisioning exception. Clarify to avoid contradictory interpretations; no location storage allowed.
4. **WARN — GitHub Free governance:** Draft §3 demands independent approval, but private-repo rulesets/review enforcement are unavailable on current Free plan. Document compensating controls or resolve plan choice before asserting compliance.
5. **WARN — Scope/acceptance:** Draft §2 excludes live group/location functionality in V2; draft §16 is foundation-only. Reconcile against version roadmap and owner-approved milestones.
6. **WARN — Legal:** DPDP, CERT-In, payments and copyright obligations are process requirements, not verified legal conclusions. Keep compliance records NEEDS REVIEW.
7. **PASS — Safety intent:** Least privilege, secret isolation, non-persistence, staging-only releases, independent reviews and CI evidence are explicitly required.

**Next:** Obtain owner decision on authoritative standards, reconcile section cross-references and ADRs, record approvals in the PR, then replace the placeholder in a **separate** approved change. No production deploy.
