import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const isGeneratedReleasePr = (pr: unknown, files: unknown[], repository: string) => {
  const code = `import { isGeneratedReleasePr } from ${JSON.stringify(pathToFileURL(script).href)}; console.log(isGeneratedReleasePr(${JSON.stringify(pr)}, ${JSON.stringify(files)}, ${JSON.stringify(repository)}));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim() === 'true';
};

describe('check-pr-checklist', () => {
  it('accepts the prior CI wording after the submission attestations are complete', () => {
    const body = `${completeBody}\n- [x] Required CI checks verified before merge`;
    expect(run(body).status).toBe(0);
  });

  it('does not require merge-time review before CI has finished', () => {
    const body = `${completeBody}\n- [ ] CI and staging functional tests reviewed; rollback documented\n- [ ] Required CI checks verified before merge (a checked box alone is not evidence)`;
    expect(run(body).status).toBe(0);
  });

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

  it('accepts only the release bot and the four version files', () => {
    const repository = 'Dream-Team-Engineers/pushkara-mitra';
    const pr = {
      user: { login: 'github-actions[bot]' },
      base: { ref: 'main', repo: { full_name: repository } },
      head: {
        ref: 'release-please--branches--main--components--pushkara-mitra',
        repo: { full_name: repository },
      },
      title: 'chore(main): release 1.9.2',
      body: 'This PR was generated with [Release Please](https://github.com/googleapis/release-please).',
    };
    const files = [
      '.release-please-manifest.json',
      'CHANGELOG.md',
      'package-lock.json',
      'package.json',
    ].map((filename) => ({ filename }));
    expect(isGeneratedReleasePr(pr, files, repository)).toBe(true);
    expect(isGeneratedReleasePr({ ...pr, user: { login: 'someone' } }, files, repository)).toBe(
      false,
    );
    expect(
      isGeneratedReleasePr(pr, [...files.slice(0, 3), { filename: 'src/index.ts' }], repository),
    ).toBe(false);
    expect(
      isGeneratedReleasePr(
        { ...pr, head: { ...pr.head, repo: { full_name: 'other/repo' } } },
        files,
        repository,
      ),
    ).toBe(false);
  });
});
