// The reviewed validator is loaded from the trusted base revision by its workflow.
// No writes, deployment credentials, untrusted checkout, or success on unknown evidence.
import { pathToFileURL } from 'node:url';
export const APPROVERS = Object.freeze(['amruthamudunuru39', 'siddhu949', 'gkmraju']);
const shaPattern = /^[a-f0-9]{40}$/;
export function evaluateReviews(pr, reviews) {
  if (
    !pr ||
    pr.state !== 'open' ||
    pr.draft !== false ||
    !shaPattern.test(pr.head?.sha ?? '') ||
    typeof pr.user?.login !== 'string' ||
    !Array.isArray(reviews)
  )
    return { ok: false, reason: 'PR or review evidence is incomplete, closed, or draft.' };
  const author = pr.user.login.toLowerCase(),
    latest = new Map();
  for (const review of reviews) {
    if (
      !review ||
      typeof review.user?.login !== 'string' ||
      typeof review.state !== 'string' ||
      !['User', 'Bot'].includes(review.user?.type)
    )
      return { ok: false, reason: 'Malformed reviewer evidence.' };
    const login = review.user.login.toLowerCase();
    if (!APPROVERS.includes(login) || login === author || review.user.type !== 'User') continue;
    if (['COMMENTED', 'PENDING'].includes(review.state)) continue;
    if (
      !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state) ||
      !Number.isSafeInteger(review.id) ||
      !Number.isFinite(Date.parse(review.submitted_at))
    )
      return { ok: false, reason: 'Review decision evidence is incomplete.' };
    const previous = latest.get(login);
    if (!previous || review.id > previous.id) latest.set(login, review);
  }
  if ([...latest.values()].some((r) => r.state === 'CHANGES_REQUESTED'))
    return { ok: false, reason: 'A named independent reviewer still requests changes.' };
  const approved = [...latest.entries()]
    .filter(([, r]) => r.state === 'APPROVED' && r.commit_id === pr.head.sha)
    .map(([login]) => login);
  return approved.length
    ? { ok: true, head: pr.head.sha, approvers: approved }
    : { ok: false, reason: 'No named independent human has approved the current head revision.' };
}
export async function collectEvidence({ repository, number, token, fetchImpl = globalThis.fetch }) {
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') ||
    !/^[1-9]\d*$/.test(String(number)) ||
    !token
  )
    throw new Error('Repository, positive PR number and read-only GitHub token are required.');
  const request = async (path) => {
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${repository}${path}`, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: globalThis.AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error('GitHub evidence request failed or timed out.');
    }
    if (!response.ok) throw new Error(`GitHub evidence unavailable (HTTP ${response.status}).`);
    try {
      return await response.json();
    } catch {
      throw new Error('GitHub returned invalid evidence JSON.');
    }
  };
  const pr = await request(`/pulls/${number}`);
  const reviews = [];
  let complete = false;
  for (let page = 1; page <= 20; page++) {
    const batch = await request(`/pulls/${number}/reviews?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length > 100)
      throw new Error('Invalid review pagination evidence.');
    reviews.push(...batch);
    if (batch.length < 100) {
      complete = true;
      break;
    }
  }
  if (!complete) throw new Error('Review pagination limit reached; manual investigation required.');
  const current = await request(`/pulls/${number}`);
  if (
    current.head?.sha !== pr.head?.sha ||
    current.state !== pr.state ||
    current.draft !== pr.draft
  )
    throw new Error('PR changed while collecting evidence. Refresh the check.');
  return { pr: current, reviews };
}
async function main() {
  try {
    const evidence = await collectEvidence({
      repository: process.env.GITHUB_REPOSITORY,
      number: process.env.PR_NUMBER,
      token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    });
    const result = evaluateReviews(evidence.pr, evidence.reviews);
    if (!result.ok) throw new Error(result.reason);
    console.log(
      `Independent review verified for ${result.head}: ${result.approvers.join(', ')}. Legal/domain approval and native protection checks remain separate.`,
    );
  } catch (error) {
    // Never print tokens, API response bodies, or stack traces containing request options.
    console.error(
      error instanceof Error ? error.message : 'Review evidence could not be verified.',
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
