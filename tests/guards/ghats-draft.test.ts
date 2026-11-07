import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

type DraftGhat = { name: string; district: string; mandal: string; locality: string };
type Submitted = { sha256: string; rows: Record<string, string>[] };
const source = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../docs/content/user-ghats-candidate.json'), 'utf8'),
) as Submitted;
const draftUrl = pathToFileURL(
  join(import.meta.dirname, '../../public/assets/ghats-draft.v1.mjs'),
).href;
const viewUrl = pathToFileURL(
  join(import.meta.dirname, '../../public/assets/ghats-draft-view.v1.mjs'),
).href;
const { GHATS_DRAFT_SOURCE_HASH, GHATS_DRAFT_STATUS, submittedGhats } = (await import(
  draftUrl
)) as { GHATS_DRAFT_SOURCE_HASH: string; GHATS_DRAFT_STATUS: string; submittedGhats: DraftGhat[] };
const { mountGhatsDraft } = (await import(viewUrl)) as {
  mountGhatsDraft: (panel: FakeNode, language: string) => FakeNode;
};

class FakeNode {
  tagName: string;
  children: FakeNode[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, () => void>();
  textContent = '';
  className = '';
  value = '';
  hidden = false;
  open = false;
  id = '';
  type = '';
  autocomplete = '';
  htmlFor = '';

  constructor(tagName: string) {
    this.tagName = tagName;
  }
  append(...nodes: FakeNode[]) {
    this.children.push(...nodes);
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  addEventListener(key: string, listener: () => void) {
    this.listeners.set(key, listener);
  }
  querySelectorAll(selector: string): FakeNode[] {
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll('*')]);
    if (selector === '*') return descendants;
    if (selector.startsWith('.'))
      return descendants.filter((node) => node.className.split(' ').includes(selector.slice(1)));
    return descendants.filter((node) => node.tagName === selector);
  }
}

const previousDocument = Reflect.get(globalThis, 'document') as unknown;
afterEach(() => {
  if (previousDocument === undefined) Reflect.deleteProperty(globalThis, 'document');
  else Reflect.set(globalThis, 'document', previousDocument);
});

describe('unverified ghat draft in team review branch', () => {
  it('exports all submitted rows with only names and localities', () => {
    expect(GHATS_DRAFT_STATUS).toBe('NEEDS_REVIEW');
    expect(GHATS_DRAFT_SOURCE_HASH).toBe(source.sha256);
    expect(submittedGhats).toHaveLength(159);
    expect(submittedGhats).toEqual(
      source.rows.map((row: Record<string, string>) => ({
        name: row['Ghat name'],
        district: row['District (2027)'],
        mandal: row['Mandal / Taluk'],
        locality: row['Village / Location'],
      })),
    );
    const first = submittedGhats[0];
    if (!first) throw new Error('Missing first submitted ghat');
    expect(Object.keys(first)).toEqual(['name', 'district', 'mandal', 'locality']);
  });

  it('labels the list as unverified and filters without location or network access', () => {
    Reflect.set(globalThis, 'document', { createElement: (tag: string) => new FakeNode(tag) });
    const panel = new FakeNode('section');
    const wrapper = mountGhatsDraft(panel, 'en');
    expect(wrapper.attributes.get('data-review-status')).toBe('unverified');
    expect(wrapper.querySelectorAll('li')).toHaveLength(159);
    expect(
      wrapper.querySelectorAll('p').some((node) => node.textContent.includes('UNVERIFIED DRAFT')),
    ).toBe(true);
    const search = wrapper.querySelectorAll('input')[0];
    expect(search?.type).toBe('search');
    if (!search) throw new Error('Missing draft search');
    search.value = 'zzzxxyy-no-match';
    search.listeners.get('input')?.();
    expect(wrapper.querySelectorAll('li').filter((node) => !node.hidden)).toHaveLength(0);
    search.value = '';
    search.listeners.get('input')?.();
    expect(wrapper.querySelectorAll('li').filter((node) => !node.hidden)).toHaveLength(159);
  });
});
