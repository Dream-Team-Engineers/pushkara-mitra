// Legacy filename retained for existing references. This verifies that the
// owner-dispatched bootstrap targets the exact merged PR now on main.
import { readFileSync } from 'node:fs';

try {
  const [prPath, expectedSha, repository, requestedNumber] = process.argv.slice(2);
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? '') || !/^\d{1,10}$/.test(requestedNumber ?? '')) {
    throw new Error('Invalid bootstrap source context.');
  }
  let pr;
  try {
    pr = JSON.parse(readFileSync(prPath, 'utf8'));
  } catch {
    throw new Error('Missing or invalid PR evidence.');
  }
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
    throw new Error('Bootstrap requires the merged source PR at the immutable main run SHA.');
  }
  console.log(
    `Verified merged PR #${pr.number}, final head ${pr.head.sha}, main SHA ${expectedSha}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid PR evidence.');
  process.exitCode = 1;
}
