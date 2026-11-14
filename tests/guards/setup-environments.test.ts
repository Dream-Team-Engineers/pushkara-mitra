import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '../../scripts/setup-github.sh');
const mainPolicy = { id: 1, name: 'main', type: 'branch' };

// No real gh process or credential is inherited. All writes are to this test's
// temporary JSON state; unexpected commands fail instead of reaching GitHub.
const mockGh = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(process.env.MOCK_STATE, 'utf8'));
const mode = process.env.MOCK_MODE;
const methodIndex = args.indexOf('-X');
const method = methodIndex < 0 ? 'GET' : args[methodIndex + 1];
const path = methodIndex < 0 ? args[1] : args[methodIndex + 2];
const body = args.includes('--input') ? JSON.parse(fs.readFileSync(0, 'utf8')) : null;
fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify({args, method, path, body}) + '\\n');
const fail = () => { console.error('mock API denied or unavailable'); process.exit(1); };
const out = (value) => process.stdout.write(JSON.stringify(value));
const save = () => fs.writeFileSync(process.env.MOCK_STATE, JSON.stringify(state));
if (args[0] !== 'api') fail();
if (path.startsWith('users/')) {
  const ids = {amruthamudunuru39:10,siddhu949:20,gkmraju:30};
  const id = ids[path.slice(6)]; if (!id) fail(); process.stdout.write(String(id));
} else if (path === 'repos/Dream-Team-Engineers/pushkara-mitra/rulesets') {
  if (method === 'GET') {
    if (mode === 'ruleset-query-fail') fail();
    if (args.includes('--jq')) {
      const match=/name=="([^"]+)"/.exec(args[args.indexOf('--jq')+1]);
      const found=state.rulesets.find(r=>r.name===match?.[1]);
      if (found) process.stdout.write(String(found.id));
    } else out(state.rulesets);
  } else if (method === 'POST') {
    state.rulesets.push({id:state.rulesets.length+1,...body}); save(); out(state.rulesets.at(-1));
  } else fail();
} else if (path.includes('/rulesets/')) {
  const id=Number(path.split('/').at(-1));
  const index=state.rulesets.findIndex(r=>r.id===id);
  if(index<0)fail();
  if(method==='GET')out(mode==='ruleset-disabled'?{...state.rulesets[index],enforcement:'disabled'}:state.rulesets[index]);
  else if(method==='PUT'){state.rulesets[index]={id,...body};save();out(state.rulesets[index]);}
  else fail();
} else if (path === 'repos/Dream-Team-Engineers/pushkara-mitra/branches/main') {
  const protectedBranch=mode!=='unprotected-main'&&state.rulesets.some(r=>r.name==='protect-main'&&r.enforcement==='active');
  if(method!=='GET')fail();
  if(args.includes('--jq'))process.stdout.write(String(protectedBranch));
  else out({protected:protectedBranch});
} else if (path.includes('/deployment-branch-policies')) {
  const env = /environments\\/([^/]+)/.exec(path)[1];
  if (method === 'GET') {
    if (mode === 'query-fail') fail();
    if (!args.includes('--paginate') || !args.includes('--slurp')) fail();
    if (mode === 'bad-json') process.stdout.write('{invalid');
    else if (mode === 'bad-shape') out([{branch_policies:null}]);
    else out(mode === 'pages' ? [{branch_policies:[]},{branch_policies:state.policies[env]}] : [{branch_policies:state.policies[env]}]);
  } else if (method === 'POST') {
    if (mode === 'create-fail') fail();
    if (mode !== 'not-persisted') state.policies[env].push({id:99,...body});
    save(); out({id:99,...body});
  } else fail();
} else if (path.includes('/environments/')) {
  const env = path.split('/').at(-1);
  if (method === 'PUT') {
    if (env === 'production' && mode === 'reviewers-rejected') fail();
    state.environments[env] = body; save(); out({name:env,...body});
  } else if (method === 'GET') {
    if (mode === 'environment-query-fail') fail();
    const requested=state.environments[env]; if (!requested) fail();
    const observed={name:env,can_admins_bypass:requested.can_admins_bypass??true,deployment_branch_policy:requested.deployment_branch_policy,protection_rules:[]};
    if (env === 'production') {
      observed.protection_rules=[{type:'required_reviewers',prevent_self_review:requested.prevent_self_review,reviewers:requested.reviewers.map(r=>({type:r.type,reviewer:{id:r.id}}))}];
      if(mode==='no-reviewers')observed.protection_rules=[];
      if(mode==='self-review')observed.protection_rules[0].prevent_self_review=true;
      if(mode==='admin-bypass')observed.can_admins_bypass=true;
      if(mode==='wrong-reviewer')observed.protection_rules[0].reviewers[0].reviewer.id=999;
    }
    if(mode==='wide-environment')observed.deployment_branch_policy=null;
    out(observed);
  } else fail();
} else if (path === 'repos/Dream-Team-Engineers/pushkara-mitra') {
  if(method==='PATCH'){state.repository=body;save();out(body);}
  else if(method==='GET'){out(mode==='auto-merge-enabled'?{...state.repository,allow_auto_merge:true}:state.repository);}
  else fail();
} else fail();
`;

interface Call {
  args: string[];
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

function run(command: string, mode = 'ok', policies: unknown[] = [mainPolicy], dry = false) {
  const dir = mkdtempSync(join(tmpdir(), 'setup-settings-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'gh'), mockGh, { mode: 0o755 });
    const state = join(dir, 'state.json');
    const calls = join(dir, 'calls.jsonl');
    writeFileSync(
      state,
      JSON.stringify({
        policies: { preview: policies, staging: policies, production: policies },
        environments: {},
        rulesets: [],
      }),
    );
    writeFileSync(calls, '');
    const result = spawnSync('bash', ['-c', 'source "$1"; eval "$2"', '--', script, command], {
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
        MOCK_MODE: mode,
        MOCK_STATE: state,
        MOCK_CALLS: calls,
        DRY_RUN: dry ? '1' : '0',
      },
    });
    if (result.error) throw result.error;
    if (result.status === 127) throw new Error(`Setup command unavailable: ${result.stderr}`);
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      calls: readFileSync(calls, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Call),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('deployment branch policy verification with mocked GitHub', () => {
  it('verifies exact existing main branch policy without creating it', () => {
    const result = run('add_branch_policy preview main branch');
    expect(result.status).toBe(0);
    expect(result.calls.every((call) => call.method === 'GET')).toBe(true);
    expect(result.stdout).toContain('verified existing branch policy main');
  });

  it('handles later pages and does not assume the first page is complete', () => {
    const result = run('add_branch_policy preview main branch', 'pages');
    expect(result.status).toBe(0);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]?.args).toEqual(expect.arrayContaining(['--paginate', '--slurp']));
  });

  it('creates once, verifies read-back and is idempotent on a second call', () => {
    const result = run(
      'add_branch_policy preview main branch; add_branch_policy preview main branch',
      'ok',
      [],
    );
    expect(result.status).toBe(0);
    expect(result.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
    expect(result.calls.filter((call) => call.method === 'GET')).toHaveLength(3);
  });

  it.each(['query-fail', 'bad-json', 'bad-shape', 'create-fail', 'not-persisted'])(
    'does not claim an existing/created policy on %s',
    (mode) => {
      const result = run('add_branch_policy preview main branch', mode, []);
      expect(result.status).toBe(1);
      expect(result.stdout).not.toMatch(/verified|already present/);
    },
  );

  it.each([
    [{ id: 2, name: 'main-*', type: 'branch' }],
    [{ id: 2, name: 'main', type: 'tag' }],
    [mainPolicy, { id: 2, name: '*', type: 'branch' }],
    [mainPolicy, mainPolicy],
  ])(
    'rejects unmatched, extra or duplicate policies rather than claiming main-only',
    (...policies) => {
      const result = run('add_branch_policy preview main branch', 'ok', policies);
      expect(result.status).toBe(1);
      expect(result.calls.every((call) => call.method === 'GET')).toBe(true);
      expect(result.stderr).toContain('unexpected or duplicate');
      expect(result.stdout).not.toContain('verified');
    },
  );
});

describe('environment controls are verified, not assumed', () => {
  it('requests and confirms main-only environments plus owner-operated production review', () => {
    const result = run('environments');
    expect(result.status).toBe(0);
    const writes = result.calls.filter((call) => call.method === 'PUT');
    expect(writes).toHaveLength(3);
    for (const call of writes) {
      expect(call.body?.deployment_branch_policy).toEqual({
        protected_branches: false,
        custom_branch_policies: true,
      });
    }
    const production = writes.find((call) => call.path.endsWith('/production'));
    expect(production?.body).toMatchObject({
      prevent_self_review: false,
      can_admins_bypass: false,
      reviewers: [{ type: 'User', id: 30 }],
    });
    expect(result.stdout).toContain('verified production');
    expect(result.calls.every((call) => call.method !== 'DELETE')).toBe(true);
  });

  it.each([
    'reviewers-rejected',
    'environment-query-fail',
    'wide-environment',
    'no-reviewers',
    'self-review',
    'admin-bypass',
    'wrong-reviewer',
  ])('fails without a production success claim when %s', (mode) => {
    const result = run('environments', mode);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('verified production');
    expect(result.calls.every((call) => call.method !== 'DELETE')).toBe(true);
  });

  it('stops on a main-plus-wildcard policy before reporting the environment main-only', () => {
    const result = run('environments', 'ok', [mainPolicy, { id: 2, name: '*', type: 'branch' }]);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('verified preview');
  });

  it('dry run never invokes gh or claims live verification', () => {
    const result = run('main', 'ok', [mainPolicy], true);
    expect(result.status).toBe(0);
    expect(result.calls).toHaveLength(0);
    expect(result.stdout).toContain('not verified');
    expect(result.stdout).toContain('preview main-only planned');
  });
});

describe('repository auto-merge stays disabled', () => {
  it('requests and reads back disabled auto-merge', () => {
    const result = run('repo_settings');
    expect(result.status).toBe(0);
    expect(result.calls[0]?.body?.allow_auto_merge).toBe(false);
    expect(result.calls.map((call) => call.method)).toEqual(['PATCH', 'GET']);
    expect(result.stdout).toContain('verified squash-only');
  });

  it('fails if read-back still allows automatic merging', () => {
    const result = run('repo_settings', 'auto-merge-enabled');
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('verified squash-only');
  });
});

describe('solo-maintainer ruleset with mocked GitHub', () => {
  it('requires PR and current checks without an impossible human approval', () => {
    const result = run('rulesets');
    expect(result.status).toBe(0);
    const main = result.calls.find(
      (call) => call.method === 'POST' && call.body?.name === 'protect-main',
    );
    const rules = main?.body?.rules as Array<{
      type: string;
      parameters?: Record<string, unknown>;
    }>;
    expect(rules.find((rule) => rule.type === 'pull_request')?.parameters).toMatchObject({
      required_approving_review_count: 0,
      require_code_owner_review: false,
      require_last_push_approval: false,
      required_review_thread_resolution: true,
    });
    expect(rules.find((rule) => rule.type === 'required_status_checks')?.parameters).toMatchObject({
      strict_required_status_checks_policy: true,
    });
    expect(main?.body?.bypass_actors).toEqual([]);
    expect(result.stdout).toContain('verified active ruleset protect-main');
  });

  it.each(['ruleset-query-fail', 'ruleset-disabled', 'unprotected-main'])(
    'does not claim protection when %s',
    (mode) => {
      const result = run('rulesets', mode);
      expect(result.status).toBe(1);
    },
  );
});
