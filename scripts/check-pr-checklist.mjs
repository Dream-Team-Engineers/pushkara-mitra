// Reads PR_BODY, never argv. A checkbox is an attestation, not approval evidence.
import { pathToFileURL } from 'node:url';

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
  const open = findUnchecked(body),
    contradictory = findPendingReviewClaims(body);
  if (open.length || contradictory.length) {
    console.error(
      'Unfinished or contradictory checklist items remain. Leave pending reviews unticked; obtain the actual independent review first.',
    );
    for (const item of [...open, ...contradictory]) console.error(item);
    process.exit(1);
  }
  console.log(
    'Checklist attestations are consistent. Actual approvals require independent GitHub review evidence.',
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
