// Read-only GitHub review proof. No credentials or network requests in this helper.
import { readFileSync } from 'node:fs';

try {
  const [prPath, reviewsPath, expectedSha, repository, requestedNumber] = process.argv.slice(2);
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? '') || !/^\d{1,10}$/.test(requestedNumber ?? '')) {
    throw new Error('Invalid bootstrap review context.');
  }
  const readJson = (path) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error('Missing or invalid JSON review evidence.');
    }
  };
  const pr = readJson(prPath);
  const pages = readJson(reviewsPath);
  if (!Array.isArray(pages)) throw new Error('Review pages unavailable.');
  const reviews = pages.flat();
  if (reviews.length > 10000) throw new Error('Review evidence exceeds supported limit.');
  if (
    pr.number !== Number(requestedNumber) ||
    !pr.merged_at ||
    pr.state !== 'closed' ||
    pr.merge_commit_sha !== expectedSha ||
    pr.base?.ref !== 'main' ||
    pr.base?.repo?.full_name !== repository ||
    pr.head?.repo?.full_name !== repository ||
    !/^[a-f0-9]{40}$/.test(pr.head?.sha ?? '')
  ) {
    throw new Error(
      'Bootstrap requires the reviewed PR merge commit at the immutable main run SHA.',
    );
  }
  const owners = new Set(['amruthamudunuru39', 'siddhu949', 'gkmraju']);
  const latest = new Map();
  const actionable = reviews.filter((r) =>
    ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state),
  );
  for (const review of actionable) {
    if (!Number.isFinite(Date.parse(review.submitted_at)))
      throw new Error('Invalid review timestamp.');
  }
  actionable.sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at));
  for (const review of actionable) {
    const login = review.user?.login?.toLowerCase();
    if (
      review.user?.type === 'User' &&
      owners.has(login) &&
      login !== pr.user?.login?.toLowerCase()
    ) {
      latest.set(login, review);
    }
  }
  if ([...latest.values()].some((r) => r.state === 'CHANGES_REQUESTED')) {
    throw new Error('Independent changes-requested review remains unresolved.');
  }
  const approved = [...latest.entries()].filter(
    ([, r]) =>
      r.state === 'APPROVED' &&
      r.commit_id === pr.head.sha &&
      /^APPROVE_PREVIEW_BOOTSTRAP\r?$/m.test(r.body ?? ''),
  );
  if (approved.length === 0) {
    throw new Error(
      'Need an independent owner approval on the final PR head with APPROVE_PREVIEW_BOOTSTRAP on its own line.',
    );
  }
  console.log(
    `Verified PR #${pr.number}, final head ${pr.head.sha}, independent reviewer: ${approved.map(([login]) => login).join(', ')}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid review evidence.');
  process.exitCode = 1;
}
