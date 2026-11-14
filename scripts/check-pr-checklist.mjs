// Reads PR_BODY, never argv. A checkbox is an attestation, not approval evidence.
import { pathToFileURL } from 'node:url';

// Keep this list in step with .github/pull_request_template.md. A PR body with
// no checklist must never satisfy the required check.
export const requiredItems = [
  "Tested on this PR's preview",
  'Tests added',
  'No location persisted anywhere (N/A if untouched)',
  'Data inventory and notices updated if personal data changed',
  'Threat model updated if a trust boundary changed',
  'New dependency or asset added to the licence register / asset permissions (N/A if none)',
  'Risky feature behind a kill switch (N/A if none)',
  'Strings externalised; works at 200% text size and with a screen reader',
  '`needs-owner-review` label added if payments, donations, location, children or audit code is touched',
  'No secrets',
  'Human owner and independent reviewer identified',
  'Privacy/security/child-safety impact and required approvals recorded',
  'No unapproved production deployment, live payments, location persistence or public missing-person feature',
  'CI and staging functional tests reviewed; rollback documented',
  'Independent human review and required checks verified (CODEOWNERS alone is not enforcement)',
];

export function findMissingItems(body) {
  const checked = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\[x\]\s+/i.test(line))
    .map((line) => line.replace(/^[-*]\s+\[x\]\s+/i, ''));
  return requiredItems.filter(
    (item) =>
      !checked.some(
        (line) =>
          line === item ||
          line.startsWith(`${item}:`) ||
          line.startsWith(`${item} —`) ||
          line.startsWith(`${item} (`),
      ),
  );
}

export function findUnchecked(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\[ \]/.test(line));
}
export function findPendingReviewClaims(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!/^[-*]\s+\[x\]/i.test(line)) return false;
      const claimsCompletedReview =
        /\b(?:manual|independent)(?:\s+human)?\s+(?:final[- ]head\s+)?review\b.*\b(?:verified|completed|obtained)\b/i.test(
          line,
        );
      const admitsPendingReview =
        /\bpending\b|\bnot\s+(?:yet\s+)?(?:approved|reviewed|verified)\b|\bawaiting\b/i.test(line);
      return claimsCompletedReview && admitsPendingReview;
    });
}
function main() {
  const body = process.env.PR_BODY ?? '';
  if (!body.trim()) {
    console.error('PR body is empty. Fill in the pull request template.');
    process.exit(1);
  }
  const missing = findMissingItems(body),
    open = findUnchecked(body),
    contradictory = findPendingReviewClaims(body);
  if (missing.length || open.length || contradictory.length) {
    console.error(
      'Unfinished or contradictory checklist items remain. Leave pending reviews unticked; obtain the actual independent review first.',
    );
    for (const item of missing) console.error(`Missing checked item: ${item}`);
    for (const item of [...open, ...contradictory]) console.error(item);
    process.exit(1);
  }
  console.log(
    'Checklist attestations are consistent. Actual approvals require independent GitHub review evidence.',
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
