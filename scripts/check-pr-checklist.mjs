// Reads PR_BODY, never argv. A checkbox is an attestation, not approval evidence.
import { pathToFileURL } from 'node:url';

// Keep this list in step with the submission checklist in the PR template.
// Checks and staging review happen later, so requiring their completion here
// makes this required check fail while the other required checks are running.
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
  'Sole maintainer and risk acceptance recorded',
  'Privacy/security/child-safety impact and required approvals recorded',
  'No unapproved production deployment, live payments, location persistence or public missing-person feature',
];

// Earlier PR templates used checkboxes for these merge-time steps. Keep their
// pending state visible in old PR bodies without making the submission check
// depend on its own result. The ruleset enforces required CI at merge time.
const mergeTimeItems = [
  'CI and staging functional tests reviewed; rollback documented',
  'Required CI checks verified before merge',
];

// Release Please creates a PR body without this project's template. Its narrow
// version-only file scope is checked separately; all required CI and the human
// release review still run under the branch ruleset.
const releaseFiles = new Set([
  '.release-please-manifest.json',
  'CHANGELOG.md',
  'package-lock.json',
  'package.json',
]);

export function isGeneratedReleasePr(pr, files, repository) {
  return (
    pr?.user?.login === 'github-actions[bot]' &&
    pr?.base?.ref === 'main' &&
    pr?.base?.repo?.full_name === repository &&
    pr?.head?.repo?.full_name === repository &&
    pr?.head?.ref === 'release-please--branches--main--components--pushkara-mitra' &&
    /^chore\(main\): release \d+\.\d+\.\d+$/.test(pr?.title ?? '') &&
    pr?.body?.includes('This PR was generated with [Release Please]') &&
    Array.isArray(files) &&
    files.length === releaseFiles.size &&
    new Set(files.map((file) => file?.filename)).size === releaseFiles.size &&
    files.every((file) => releaseFiles.has(file?.filename))
  );
}

async function checkGeneratedReleasePr() {
  const repository = process.env.GITHUB_REPOSITORY ?? '';
  const number = process.env.PR_NUMBER ?? '';
  const token = process.env.GITHUB_TOKEN ?? '';
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
    !/^[1-9]\d*$/.test(number) ||
    !token
  )
    throw new Error('Release PR evidence is unavailable.');
  const request = async (path) => {
    const response = await globalThis.fetch(`https://api.github.com/repos/${repository}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      signal: globalThis.AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Release PR evidence is unavailable.');
    return response.json();
  };
  const [pr, files] = await Promise.all([
    request(`/pulls/${number}`),
    request(`/pulls/${number}/files?per_page=100`),
  ]);
  if (!isGeneratedReleasePr(pr, files, repository))
    throw new Error(
      'Generated release PR identity or file scope does not match the reviewed pattern.',
    );
  console.log(
    'Generated release PR identity and version-only file scope verified. Required CI and human release review remain pending.',
  );
}

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
    .filter((line) => /^[-*]\s+\[ \]/.test(line))
    .filter((line) => {
      const label = line.replace(/^[-*]\s+\[ \]\s+/, '');
      return !mergeTimeItems.some((item) => label.startsWith(item));
    });
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
async function main() {
  if (process.env.PR_AUTHOR === 'github-actions[bot]') {
    try {
      await checkGeneratedReleasePr();
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Release PR validation failed.');
      process.exitCode = 1;
    }
    return;
  }
  const body = process.env.PR_BODY ?? '';
  if (!body.trim()) {
    console.error('PR body is empty. Fill in the pull request template.');
    process.exit(1);
  }
  const missing = findMissingItems(body),
    open = findUnchecked(body),
    contradictory = findPendingReviewClaims(body);
  if (missing.length || open.length || contradictory.length) {
    console.error('Missing, unfinished or contradictory submission checklist items remain.');
    for (const item of missing) console.error(`Missing checked item: ${item}`);
    for (const item of [...open, ...contradictory]) console.error(item);
    process.exit(1);
  }
  console.log(
    'Submission checklist attestations are consistent. Required CI and merge-time review must still be verified on GitHub.',
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
