// Fails when a pull request body still has an unticked checklist item.
// Conditional items must be ticked and marked "N/A". Reads the body from PR_BODY (never from argv).
import { pathToFileURL } from 'node:url';

export function findUnchecked(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\[ \]/.test(line));
}

function main() {
  const body = process.env.PR_BODY ?? '';
  if (body.trim() === '') {
    console.error('PR body is empty. Fill in the pull request template.');
    process.exit(1);
  }
  const open = findUnchecked(body);
  if (open.length > 0) {
    console.error('Unchecked items remain. Tick each one, or tick it and mark it "N/A":');
    for (const item of open) console.error(`  ${item}`);
    process.exit(1);
  }
  console.log('All checklist items are ticked.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
