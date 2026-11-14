## What and why

<!-- One or two sentences. Link the issue. -->

## Checklist

Tick every item. For a conditional item that does not apply, tick it and write "N/A".

- [ ] Tested on this PR's preview
- [ ] Tests added
- [ ] No location persisted anywhere (N/A if untouched)
- [ ] Data inventory and notices updated if personal data changed
- [ ] Threat model updated if a trust boundary changed
- [ ] New dependency or asset added to the licence register / asset permissions (N/A if none)
- [ ] Risky feature behind a kill switch (N/A if none)
- [ ] Strings externalised; works at 200% text size and with a screen reader
- [ ] `needs-owner-review` label added if payments, donations, location, children or audit code is touched
- [ ] No secrets

## AI-assisted delivery safety gates

- [ ] Sole maintainer and risk acceptance recorded
- [ ] Privacy/security/child-safety impact and required approvals recorded
- [ ] No unapproved production deployment, live payments, location persistence or public missing-person feature

## Merge review

At merge time, review CI and staging functional results (or record N/A), confirm the rollback path, and verify the required checks on the current PR head in GitHub. The branch ruleset enforces required checks; the submission checklist does not attest to checks that have not run yet.
