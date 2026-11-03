#!/usr/bin/env bash
# setup-github.sh — idempotent GitHub configuration for Pushkara Mitra (Kickoff Prompt V1).
#
# Usage:
#   GH_REPO=<repo> LEAD=<user> DEV2=<user> DEV3=<user> DRY_RUN=1 ./scripts/setup-github.sh
#   GH_REPO=<repo> LEAD=<user> DEV2=<user> DEV3=<user> ./scripts/setup-github.sh
#
# Requires: gh (authenticated as a repo admin, with `project` scope), jq.
# Run AFTER the first commit is pushed to main (rulesets would otherwise block it).
# Secrets are never set here; the script prints the commands for humans to run.

set -euo pipefail

GH_OWNER="${GH_OWNER:-Dream-Team-Engineers}"
GH_REPO="${GH_REPO:?Set GH_REPO to the repository name (not the project board)}"
PROJECT_NUMBER="${PROJECT_NUMBER:-2}"
LEAD="${LEAD:?Set LEAD to the lead GitHub username}"
DEV2="${DEV2:?Set DEV2 to a GitHub username}"
DEV3="${DEV3:?Set DEV3 to a GitHub username}"
REQUIRE_SIGNED_COMMITS="${REQUIRE_SIGNED_COMMITS:-1}"
DRY_RUN="${DRY_RUN:-0}"

REPO="$GH_OWNER/$GH_REPO"
# Must match job names in .github/workflows exactly (Kickoff Prompt V1, section 6.3).
REQUIRED_CHECKS=(ci-lint ci-typecheck ci-test sast sca secrets-scan licence-check sbom workflow-security pr-checklist pr-title)
GITHUB_ACTIONS_APP_ID=15368   # GitHub Actions app, so release-please can create tags
ADMIN_ROLE_ID=5               # built-in "Repository admin" role

log()  { printf '\n==> %s\n' "$*"; }
warn() { printf '   ! %s\n' "$*" >&2; }
ok()   { printf '   ok %s\n' "$*"; }

# gh api wrapper. Always reads a JSON body from stdin.
api() {
  local method="$1" path="$2"
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '   [dry-run] %s %s\n' "$method" "$path"
    jq -c . | sed 's/^/     /'
    return 0
  fi
  gh api -X "$method" "$path" --input - >/dev/null
}

# Body-less call (PUT toggles such as vulnerability-alerts).
api_nobody() {
  if [[ "$DRY_RUN" == 1 ]]; then printf '   [dry-run] %s %s\n' "$1" "$2"; return 0; fi
  gh api -X "$1" "$2" >/dev/null
}

# Read-only query; returns empty output in dry-run.
query() {
  if [[ "$DRY_RUN" == 1 ]]; then return 0; fi
  gh api "$@"
}

user_id() {
  if [[ "$DRY_RUN" == 1 ]]; then echo 0; return; fi
  gh api "users/$1" --jq .id
}

# ---------------------------------------------------------------- preflight
preflight() {
  log "Preflight"
  command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
  if [[ "$DRY_RUN" == 1 ]]; then ok "dry run: no changes will be made"; return; fi
  command -v gh >/dev/null || { echo "gh CLI is required" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login" >&2; exit 1; }
  gh repo view "$REPO" >/dev/null || { echo "Cannot access $REPO" >&2; exit 1; }
  gh api "repos/$REPO/branches/main" >/dev/null 2>&1 \
    || { echo "main has no commits yet. Push Phase 1 first." >&2; exit 1; }
  ok "authenticated, $REPO reachable, main exists"
}

# ---------------------------------------------------------------- repo settings
repo_settings() {
  log "Repository merge settings"
  jq -n '{
    allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false,
    squash_merge_commit_title: "PR_TITLE", squash_merge_commit_message: "PR_BODY",
    delete_branch_on_merge: true, allow_auto_merge: true, allow_update_branch: true
  }' | api PATCH "repos/$REPO"
  ok "squash-only, auto-delete branches, auto-merge"
}

# release-please opens the release pull request with GITHUB_TOKEN, which GitHub
# blocks unless this is on. The default token stays read-only; each workflow
# declares the permissions it needs.
actions_permissions() {
  log "GitHub Actions workflow permissions"
  jq -n '{default_workflow_permissions: "read", can_approve_pull_request_reviews: true}' \
    | api PUT "repos/$REPO/actions/permissions/workflow"
  ok "read-only default token, Actions may create pull requests"
}

security_features() {
  log "Security features"
  api_nobody PUT "repos/$REPO/vulnerability-alerts" && ok "Dependabot alerts"
  api_nobody PUT "repos/$REPO/automated-security-fixes" && ok "Dependabot security updates"
  if api_nobody PUT "repos/$REPO/private-vulnerability-reporting"; then
    ok "private vulnerability reporting"
  else
    warn "private vulnerability reporting not available for this repo"
  fi
  if jq -n '{security_and_analysis: {
      secret_scanning: {status: "enabled"},
      secret_scanning_push_protection: {status: "enabled"}}}' | api PATCH "repos/$REPO"; then
    ok "secret scanning + push protection"
  else
    warn "secret scanning not enabled (private repos may need GitHub Advanced Security)"
  fi
}

# ---------------------------------------------------------------- rulesets
upsert_ruleset() {
  local name="$1" body="$2" id
  id="$(query "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$name\") | .id" || true)"
  if [[ -n "$id" ]]; then
    printf '%s' "$body" | api PUT "repos/$REPO/rulesets/$id"; ok "updated ruleset $name"
  else
    printf '%s' "$body" | api POST "repos/$REPO/rulesets"; ok "created ruleset $name"
  fi
}

rulesets() {
  log "Rulesets"
  local checks main tags
  checks="$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R '{context: .}' | jq -s .)"

  main="$(jq -n --argjson checks "$checks" --arg signed "$REQUIRE_SIGNED_COMMITS" '{
    name: "protect-main", target: "branch", enforcement: "active",
    conditions: {ref_name: {include: ["~DEFAULT_BRANCH"], exclude: []}},
    bypass_actors: [],
    rules: ([
      {type: "deletion"},
      {type: "non_fast_forward"},
      {type: "required_linear_history"},
      {type: "pull_request", parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: true,
        require_code_owner_review: true,
        require_last_push_approval: true,
        required_review_thread_resolution: true,
        allowed_merge_methods: ["squash"]}},
      {type: "required_status_checks", parameters: {
        strict_required_status_checks_policy: true,
        do_not_enforce_on_create: false,
        required_status_checks: $checks}}
    ] + (if $signed == "1" then [{type: "required_signatures"}] else [] end))
  }')"
  upsert_ruleset protect-main "$main"

  tags="$(jq -n --argjson app "$GITHUB_ACTIONS_APP_ID" --argjson admin "$ADMIN_ROLE_ID" '{
    name: "protect-release-tags", target: "tag", enforcement: "active",
    conditions: {ref_name: {include: ["refs/tags/v*"], exclude: []}},
    bypass_actors: [
      {actor_id: $admin, actor_type: "RepositoryRole", bypass_mode: "always"},
      {actor_id: $app, actor_type: "Integration", bypass_mode: "always"}
    ],
    rules: [{type: "creation"}, {type: "update"}, {type: "deletion"}]
  }')"
  upsert_ruleset protect-release-tags "$tags"
}

# ---------------------------------------------------------------- environments
add_branch_policy() {
  local env="$1" pattern="$2" type="$3"
  jq -n --arg n "$pattern" --arg t "$type" '{name: $n, type: $t}' \
    | api POST "repos/$REPO/environments/$env/deployment-branch-policies" 2>/dev/null \
    || ok "policy $pattern already present on $env"
}

environments() {
  log "Environments"
  jq -n '{deployment_branch_policy: null}' | api PUT "repos/$REPO/environments/preview"
  ok "preview (any branch, test keys only)"

  jq -n '{deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}}' \
    | api PUT "repos/$REPO/environments/staging"
  add_branch_policy staging main branch
  ok "staging (main only)"

  local reviewers
  reviewers="$(jq -n \
    --argjson a "$(user_id "$LEAD")" --argjson b "$(user_id "$DEV2")" --argjson c "$(user_id "$DEV3")" \
    '[{type:"User",id:$a},{type:"User",id:$b},{type:"User",id:$c}]')"
  jq -n --argjson r "$reviewers" '{
      wait_timer: 0, prevent_self_review: true, reviewers: $r,
      deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}}' \
    | api PUT "repos/$REPO/environments/production" \
    || warn "production reviewers rejected (private repos need a paid plan for this)"
  add_branch_policy production main branch
  ok "production (main only, 1 of 3 reviewers, no self-review)"
}

# ---------------------------------------------------------------- labels
labels() {
  log "Labels"
  local spec=(
    "compliance|5319e7|Touches DPDP, CERT-In, RBI or e-commerce obligations"
    "payment|b60205|Razorpay, refunds, webhooks"
    "donations|d93f0b|Donation flows; blocked until counsel sign-off"
    "core-location|0e8a16|Real-time group location / Durable Objects"
    "offline|006b75|Offline-first, sync, degraded network"
    "i18n|c5def5|Telugu-first localisation"
    "a11y|bfdadc|Accessibility (WCAG 2.2 AA)"
    "frontend|1d76db|PWA / Pages"
    "backend|0052cc|Workers / D1 / R2"
    "infra|fbca04|CI/CD, GitHub, Cloudflare config"
    "security|ee0701|Security fix or hardening"
    "legal|5319e7|Needs legal input"
    "bug|d73a4a|Something is broken"
    "blocker|000000|Blocks a milestone"
    "needs-owner-review|e99695|Requires LEAD or DEV2 review"
    "event-critical|b60205|Must work during June 26 - July 7, 2027"
    "privacy|5319e7|Personal data, consent, retention or deletion"
    "children|b60205|Children's data or dependents; counsel review required"
    "ip-licence|fef2c0|Copyright, licence, trademark or asset rights"
    "public-safety|b60205|Missing persons or crowd-safety workflows"
  )
  local entry name color desc
  for entry in "${spec[@]}"; do
    IFS='|' read -r name color desc <<<"$entry"
    if [[ "$DRY_RUN" == 1 ]]; then
      printf '   [dry-run] label %s\n' "$name"
    else
      gh label create "$name" --color "$color" --description "$desc" --force -R "$REPO" >/dev/null
    fi
  done
  ok "${#spec[@]} labels"
}

# ---------------------------------------------------------------- milestones
milestones() {
  log "Milestones"
  local spec=(
    "M0: Legal discovery|2026-11-30|Legal discovery, DPIA, threat model, branding and copyright review"
    "M1: Secure foundation|2026-12-20|Secure repo, CI/CD, authentication foundations, privacy architecture"
    "M2: Ephemeral location + offline|2027-02-15|Secure ephemeral location sharing and offline operation"
    "M3: Directory, lost & found, safety|2027-03-15|Vendor directory, lost-and-found, missing-person safety controls"
    "M4: Payments, notices, consent|2027-04-10|Payments, legal notices, consent and grievance workflows"
    "M5: Independent security testing|2027-04-30|Independent security testing, remediation, performance testing"
    "M6: DPDP and legal readiness|2027-05-13|DPDP and legal go-live readiness, evidence and counsel review"
    "M7: Release and code freeze|2027-06-01|Release, production hardening and code freeze"
    "M8: Field rehearsal|2027-06-20|Field rehearsal, accessibility, offline and incident drills"
    "M9: Event operations|2027-07-07|Event monitoring, safety and incident response"
    "M10: Post-event deletion|2027-07-31|Verified post-event deletion, retention exceptions and retrospective"
  )
  local existing entry title due desc number body
  existing="$(query "repos/$REPO/milestones?state=all&per_page=100" || echo '[]')"
  [[ -z "$existing" ]] && existing='[]'
  for entry in "${spec[@]}"; do
    IFS='|' read -r title due desc <<<"$entry"
    body="$(jq -n --arg t "$title" --arg d "${due}T18:29:59Z" --arg s "$desc" \
      '{title: $t, due_on: $d, description: $s}')"   # 23:59:59 IST
    number="$(jq -r --arg t "$title" '.[] | select(.title==$t) | .number' <<<"$existing")"
    if [[ -n "$number" ]]; then
      printf '%s' "$body" | api PATCH "repos/$REPO/milestones/$number"
    else
      printf '%s' "$body" | api POST "repos/$REPO/milestones"
    fi
  done
  ok "${#spec[@]} milestones"
}

# ---------------------------------------------------------------- project
project() {
  log "Project board #$PROJECT_NUMBER"
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '   [dry-run] link %s to project %s; create fields Priority, Size, Compliance risk\n' \
      "$REPO" "$PROJECT_NUMBER"
    return
  fi
  if gh project link "$PROJECT_NUMBER" --owner "$GH_OWNER" --repo "$GH_REPO" >/dev/null 2>&1; then
    ok "repo linked"
  else
    warn "link skipped: already linked, or token lacks 'project' scope (gh auth refresh -s project)"
  fi

  local fields
  fields="$(gh project field-list "$PROJECT_NUMBER" --owner "$GH_OWNER" --format json \
    --jq '.fields[].name' 2>/dev/null || true)"
  create_field() {
    local name="$1" options="$2"
    if grep -qx "$name" <<<"$fields"; then ok "field $name exists"; return; fi
    if gh project field-create "$PROJECT_NUMBER" --owner "$GH_OWNER" --name "$name" \
      --data-type SINGLE_SELECT --single-select-options "$options" >/dev/null; then
      ok "field $name created"
    else
      warn "could not create field $name"
    fi
  }
  create_field "Priority" "P0 event-critical,P1,P2,P3"
  create_field "Size" "XS,S,M,L"
  create_field "Compliance risk" "None,DPDP,CERT-In,Payments,E-commerce,Children,IP / licence,Public safety"
}

# ---------------------------------------------------------------- manual steps
manual_steps() {
  log "Manual steps (not automated on purpose)"
  cat <<EOF
   1. Environment secrets (values never go in the repo or this script):
        for env in preview staging production; do
          gh secret set CLOUDFLARE_API_TOKEN   --env "\$env" -R $REPO
          gh secret set CLOUDFLARE_ACCOUNT_ID  --env "\$env" -R $REPO
          gh secret set RAZORPAY_KEY_ID        --env "\$env" -R $REPO
          gh secret set RAZORPAY_KEY_SECRET    --env "\$env" -R $REPO
          gh secret set RAZORPAY_WEBHOOK_SECRET --env "\$env" -R $REPO
          gh secret set JWT_SIGNING_KEY        --env "\$env" -R $REPO
          gh secret set SENTRY_DSN             --env "\$env" -R $REPO
        done
      Use Razorpay TEST keys for preview and staging; LIVE keys only in production.
      Use a separate, least-privilege Cloudflare API token per environment.
   2. Project UI: set Status options (Backlog, This Week, In Progress, In Review, Done),
      column limit 2 per person on In Progress, add a weekly Iteration field, and
      create Board + Roadmap views.
   3. Each developer: enable SSH commit signing (see CONTRIBUTING.md) before their first PR.
   4. Cloudflare: budget alerts at 50 / 80 / 100% for Workers, D1, Durable Objects, R2.
EOF
}

main() {
  preflight
  repo_settings
  actions_permissions
  security_features
  rulesets
  environments
  labels
  milestones
  project
  manual_steps
  if [[ "$DRY_RUN" == 1 ]]; then log "Dry run complete. Re-run without DRY_RUN=1 to apply."; else log "Done"; fi
}

main "$@"
