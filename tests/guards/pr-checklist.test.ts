import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '..', '..', 'scripts', 'check-pr-checklist.mjs');
const run = (body: string) =>
  spawnSync(process.execPath, [script], {
    env: { ...process.env, PR_BODY: body },
    encoding: 'utf8',
  });

describe('check-pr-checklist', () => {
  it('passes when everything is ticked', () => {
    expect(run('- [x] Tests added\n- [x] No location persisted: N/A').status).toBe(0);
  });

  it('fails on an unticked item', () => {
    const res = run('- [x] Tests added\n- [ ] No secrets');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('No secrets');
  });

  it('fails on an empty body', () => {
    expect(run('').status).toBe(1);
  });
});
