import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
const checker = join(import.meta.dirname, '../../scripts/check-pr-checklist.mjs');
const verifier = join(import.meta.dirname, '../../scripts/verify-pr-review.mjs');
const completeChecklist = readFileSync(
  join(import.meta.dirname, '../../.github/pull_request_template.md'),
  'utf8',
)
  .split(/\r?\n/)
  .filter((line) => /^- \[ \] /.test(line))
  .map((line) => line.replace('- [ ] ', '- [x] '))
  .join('\n');
const runChecklist = (body: string) =>
  spawnSync(process.execPath, [checker], {
    env: { ...process.env, PR_BODY: body },
    encoding: 'utf8',
  });
function evaluate(pr: unknown, reviews: unknown[]) {
  const code = `import { evaluateReviews } from ${JSON.stringify(pathToFileURL(verifier).href)}; console.log(JSON.stringify(evaluateReviews(${JSON.stringify(pr)},${JSON.stringify(reviews)})));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as { ok: boolean; reason?: string; approvers?: string[] };
}
const head = 'a'.repeat(40),
  old = 'b'.repeat(40);
const pr = { state: 'open', draft: false, head: { sha: head }, user: { login: 'gkmraju' } };
const review = (id: number, state: string, login = 'siddhu949', sha = head, type = 'User') => ({
  id,
  state,
  user: { login, type },
  commit_id: sha,
  submitted_at: '2026-11-05T12:00:00Z',
});
describe('approval evidence regression', () => {
  it('rejects checked manual review claims that still admit pending approval', () => {
    for (const body of [
      '- [x] GitHub private Free manual review verified — pending independent human review',
      '- [x] GitHub private Free manual independent human review verified — pending actual final-head review.',
      '- [x] Independent human final-head review completed — not yet approved',
    ])
      expect(runChecklist(body).status).toBe(1);
    expect(
      runChecklist(
        completeChecklist.replace(
          '- [x] Sole maintainer and risk acceptance recorded',
          '- [x] Sole maintainer and risk acceptance recorded — optional review pending',
        ),
      ).status,
    ).toBe(0);
  });
  it('requires independent named human approval on the current head', () => {
    expect(evaluate(pr, []).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED', 'gkmraju')]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED', 'outsider')]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED', 'siddhu949', old)]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED', 'siddhu949', head, 'Bot')]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED')])).toMatchObject({
      ok: true,
      approvers: ['siddhu949'],
    });
  });
  it('keeps changes-requested blocking and rejects dismissed approvals or drafts', () => {
    expect(
      evaluate(pr, [review(1, 'APPROVED'), review(2, 'CHANGES_REQUESTED', 'amruthamudunuru39')]).ok,
    ).toBe(false);
    expect(evaluate(pr, [review(1, 'DISMISSED')]).ok).toBe(false);
    expect(evaluate({ ...pr, draft: true }, [review(1, 'APPROVED')]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'APPROVED'), review(2, 'COMMENTED')]).ok).toBe(true);
    expect(evaluate(pr, [review(1, 'APPROVED'), review(2, 'CHANGES_REQUESTED')]).ok).toBe(false);
    expect(evaluate(pr, [review(1, 'CHANGES_REQUESTED'), review(2, 'APPROVED')]).ok).toBe(true);
  });
  it('fails closed on malformed decision data', () => {
    expect(evaluate(pr, [{ state: 'APPROVED' }]).ok).toBe(false);
    expect(evaluate(pr, [{ ...review(1, 'APPROVED'), submitted_at: 'not-a-date' }]).ok).toBe(false);
    expect(evaluate({ ...pr, head: { sha: 'bad' } }, [review(1, 'APPROVED')]).ok).toBe(false);
  });
});

function collectScenario(scenario: string) {
  const code = `import { collectEvidence, evaluateReviews } from ${JSON.stringify(pathToFileURL(verifier).href)};
  const pr=${JSON.stringify(pr)}; const good=${JSON.stringify(review(1001, 'APPROVED'))};
  let calls=0, pages=0;
  const fetchImpl=async(url)=>{
    if(${JSON.stringify(scenario)}==='denied') return new Response(JSON.stringify({message:'private-fixture-must-not-leak'}),{status:403});
    if(${JSON.stringify(scenario)}==='network') throw new Error('private-fixture-must-not-leak');
    if(${JSON.stringify(scenario)}==='bad-json') return new Response('not-json',{status:200});
    if(url.includes('/reviews?')) {
      pages++;
      const body=${JSON.stringify(scenario)}==='bad-shape'?{}:pages===1?Array.from({length:100},(_,i)=>({...good,id:i+1,state:'COMMENTED'})):[good];
      return new Response(JSON.stringify(body),{status:200});
    }
    calls++; const body=calls===2&&${JSON.stringify(scenario)}==='moved'?{...pr,head:{sha:'c'.repeat(40)}}:pr;
    return new Response(JSON.stringify(body),{status:200});
  };
  try { const e=await collectEvidence({repository:'Dream-Team-Engineers/pushkara-mitra',number:24,token:'fake-token-for-test-only',fetchImpl}); console.log(JSON.stringify({...evaluateReviews(e.pr,e.reviews),pages})); }
  catch(error) { console.log(JSON.stringify({ok:false,error:error.message})); }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as { ok: boolean; pages?: number; error?: string };
}
it('collects every review page and rechecks the head before accepting evidence', () => {
  expect(collectScenario('pages')).toMatchObject({ ok: true, pages: 2 });
  expect(collectScenario('moved')).toMatchObject({ ok: false });
});
it('blocks unavailable or malformed API evidence without exposing response bodies', () => {
  for (const scenario of ['denied', 'network', 'bad-json', 'bad-shape']) {
    const result = collectScenario(scenario);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private-fixture-must-not-leak');
  }
});
