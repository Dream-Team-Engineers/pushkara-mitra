import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '..', '..', 'scripts', 'check-pr-checklist.mjs');
const template = readFileSync(
  join(import.meta.dirname, '..', '..', '.github', 'pull_request_template.md'),
  'utf8',
);
const requiredItems = template
  .split(/\r?\n/)
  .filter((line) => /^- \[ \] /.test(line))
  .map((line) => line.replace(/^- \[ \] /, ''));
const completeBody = requiredItems.map((item) => `- [x] ${item}`).join('\n');
const run = (body: string) =>
  spawnSync(process.execPath, [script], {
    env: { ...process.env, PR_BODY: body },
    encoding: 'utf8',
  });

describe('check-pr-checklist', () => {
  it('passes when every template item is ticked', () => {
    expect(run(completeBody).status).toBe(0);
  });

  it('fails on an unticked item', () => {
    const res = run(completeBody.replace('- [x] No secrets', '- [ ] No secrets'));
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('No secrets');
  });

  it('fails on an empty body', () => {
    expect(run('').status).toBe(1);
  });

  it('fails when the checklist is absent or incomplete', () => {
    expect(run('Release notes only').stderr).toContain('Missing checked item:');
    expect(run(completeBody.replace('- [x] No secrets\n', '')).status).toBe(1);
  });

  it('requires every item from the PR template', () => {
    for (const item of requiredItems) {
      expect(run(completeBody.replace(`- [x] ${item}`, '')).status, item).toBe(1);
    }
  }, 15_000);
});
