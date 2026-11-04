# One-time preview bootstrap on Workers Free

**Status:** reviewed-change candidate; not run or deployment approval. Applies only to the missing `pushkara-mitra-preview` Worker. Production and staging are not targets. The owner supplied evidence that Workers Free is active; no upgrade, paid setting or credential reset is required merely for that fact.

## Why version upload failed

PR #34 now reports upload failures honestly. Wrangler attempt 3 reached `versions upload` and reported that the Worker does not exist: an initial deployment is required before version uploads. Earlier absent-secret output and this missing-Worker error are different prerequisites; do not blindly recreate credentials or repeatedly run the unchanged job.

Free-plan Durable Objects need SQLite-backed namespace provisioning. [ADR 0004 proposed Amendment 2](../decisions/0004-ephemeral-location.md#amendment-2-initial-preview-namespace-on-confirmed-workers-free-2026-11-04) proposes preview-only `new_sqlite_classes`, keeping the initial `v1` tag and the store unused. Staging/top-level/production and the storage prohibition are unchanged. Human review of this amendment is required before use; a proposal merge is not independently verified approval.

## Required human preflight — do not guess

An authorized owner must check all of the following and retain evidence without sharing secret values:

1. The account selected by preview's saved `CLOUDFLARE_ACCOUNT_ID` is the intended Workers Free account. The GitHub `preview` environment has the correctly named non-production token/account secrets. Confirm actual account/token scope securely; the workflow does not query billing or change permissions/plans.
2. Cloudflare Workers & Pages shows no `pushkara-mitra-preview`, and Durable Objects shows no existing namespace belonging to that preview script/class. A missing Worker alone does not prove an orphan namespace is absent. If existing/uncertain, stop for read-only investigation; do not delete, convert or reset anything.
3. Establish a **single-writer window**: no other preview creation, deployment, version upload or dashboard change during bootstrap. Workflow concurrency serializes this workflow only. The script's GET-before-deploy check is **not an atomic create-if-absent guarantee** against external actors. If that window cannot be established, do not run.
4. Review the exact final PR head, configuration amendment, scripts and tests. Required technical checks must pass. The ordinary Preview job can be blocked solely by the missing initial Worker; explicitly record this one-time bootstrap precondition exception rather than claiming a successful preview.
5. An independent named code owner (`amruthamudunuru39`, `siddhu949` or `gkmraju`, excluding the PR author) submits an actual GitHub **Approve** review on the final PR head. The approval body must contain this exact line:

   ```text
   APPROVE_PREVIEW_BOOTSTRAP
   ```

   Include the preflight evidence, Free-plan unused-store amendment decision, limited preview run authorization and any accepted initial-preview exception in the review. A comment, self-approval, stale-head approval, dismissed approval or unresolved changes-requested review does not satisfy the script.

## Merge and manually run once

After actual independent approval and authorized human merge, run immediately before further main changes. The merged PR's `merge_commit_sha` must equal the immutable workflow run SHA and current main. The workflow checks current main before dependency installation and again before deployment; if main moved, stop and obtain a fresh reviewed revision. Never reset main or select an arbitrary old ref to make the check pass.

In GitHub **Actions → Bootstrap preview (manual, one time) → Run workflow**:

- Branch: **main**.
- `confirmation`: **BOOTSTRAP_PREVIEW**.
- `preflight_confirmed`: checked only after the account, namespace and single-writer checks above are actually completed. This is a human attestation, not automatic namespace/account-plan discovery.
- `reviewed_pr`: the number of the independently approved, merged PR matching current main.

The workflow does not run on push, PR or release. It has read-only GitHub permissions and uses the normal workflow token only to read review/main evidence. Cloudflare credentials are exposed only to its final preview step. It checks manual/main intent and actual approval, runs frozen install and all local checks, then the deployment helper:

1. Reads the exact preview Worker via Cloudflare API. Existing Worker, non-404/auth failures, malformed data or anything except the expected single Worker-not-found error stops without a deployment.
2. Runs exactly `npx wrangler deploy --env preview`. No production/staging target, migration reset, namespace deletion, force flag or automatic retry.
3. Validates a unique HTTPS origin exactly under `pushkara-mitra-preview.<account-subdomain>.workers.dev`; lookalike hosts, userinfo, nondefault ports and arbitrary paths are rejected.
4. Checks the final `/healthz` HTTP response only: 200 and exact `{ "status": "ok" }`, `no-store` and required security-header presence. Earlier retry/proxy header blocks cannot satisfy final-response checks. It also checks POST 405 and `Allow: GET, HEAD`.
5. Reports scaffold health evidence, not full feature/UAT readiness. Current asset-header issue #38 remains separate; this health test does not claim all static assets are fixed.

## After the run

- **Success:** retain actor, immutable run SHA, reviewed PR/head, actual reviewer and workflow URL. Then update/rebase PR #34 to reviewed current configuration before retrying its version upload; do not validate Free preview using an obsolete branch still declaring the old backend. Run only the necessary failed job, not every workflow.
- **Deploy or health failure:** stop. A Worker may already have been created even if health/URL verification failed. Inspect the actual state before another action; do not delete, reset, recreate or blindly rerun bootstrap. The helper intentionally stops once a Worker exists.
- **Approval/main mismatch:** obtain actual current-head review/authorization. Do not weaken the verification or tick a human review on another person's behalf.
- **Token/account failure:** diagnose the specific response; do not request a broad/global token or print values. Secrets stay in GitHub environment settings.

No bootstrap was performed while authoring/testing this change. Tests mock all external commands. Namespace absence, account/plan and single-writer window are explicit human preconditions; no platform-enforced approval or atomic existence guarantee is invented. No location persistence or feature activation is authorized.
