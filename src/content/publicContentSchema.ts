/**
 * Shape of the public listing datasets served by GET /api/public/content/{kind}
 * (docs/contracts/public-content.openapi.yaml). Pure TypeScript with no runtime dependencies, so
 * the Worker (before serving) and the web client (after fetching) apply the same checks.
 *
 * Every item carries source metadata. Unknown, missing or extra fields make the item invalid.
 */
export const CONTENT_KINDS = [
  'ghats',
  'stays',
  'travel',
  'updates',
  'helplines',
  'help-points',
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export function isContentKind(value: string): value is ContentKind {
  return (CONTENT_KINDS as readonly string[]).includes(value);
}

type Field =
  | { readonly type: 'text'; readonly max: number }
  | { readonly type: 'enum'; readonly values: readonly string[] }
  | { readonly type: 'enumList'; readonly values: readonly string[] }
  | { readonly type: 'number'; readonly min: number; readonly max: number }
  | { readonly type: 'boolean' }
  | { readonly type: 'httpsUrlOrNull' }
  | { readonly type: 'phoneOrNull' }
  | { readonly type: 'isoDateTime' };

const text = (max: number): Field => ({ type: 'text', max });
const oneOf = (...values: string[]): Field => ({ type: 'enum', values });

const META: Readonly<Record<string, Field>> = {
  source: text(200),
  sourceUrl: { type: 'httpsUrlOrNull' },
  updatedAt: { type: 'isoDateTime' },
  status: oneOf('verified', 'unverified', 'stale'),
  synthetic: { type: 'boolean' },
};

const ID = text(40);

export const CONTENT_FIELDS: Readonly<Record<ContentKind, Readonly<Record<string, Field>>>> = {
  ghats: {
    ...META,
    id: ID,
    name: text(120),
    district: oneOf('east', 'west', 'other'),
    town: text(80),
    crowd: oneOf('low', 'moderate', 'high', 'noData'),
    facilities: { type: 'enumList', values: ['water', 'toilets', 'firstAid', 'ramp', 'parking'] },
  },
  stays: {
    ...META,
    id: ID,
    kind: oneOf('hotel', 'dharmashala', 'govt'),
    sponsored: { type: 'boolean' },
    name: text(120),
    distanceKm: { type: 'number', min: 0, max: 500 },
    priceNote: text(80),
  },
  travel: {
    ...META,
    id: ID,
    mode: oneOf('train', 'bus', 'flight'),
    name: text(120),
    from: text(80),
    to: text(80),
    departs: text(20),
    arrives: text(20),
  },
  updates: {
    ...META,
    id: ID,
    kind: oneOf('advisory', 'news', 'event', 'ritual'),
    title: text(160),
    detail: text(400),
  },
  helplines: {
    ...META,
    id: ID,
    kind: oneOf('emergency', 'ambulance', 'police', 'control'),
    number: { type: 'phoneOrNull' },
  },
  'help-points': {
    ...META,
    id: ID,
    kind: oneOf('firstAid', 'police', 'lost'),
    ghat: text(120),
    distance: text(40),
  },
};

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const PHONE = /^[0-9+][0-9 -]{1,18}[0-9]$/;

function fieldOk(field: Field, value: unknown): boolean {
  switch (field.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0 && value.length <= field.max;
    case 'enum':
      return typeof value === 'string' && field.values.includes(value);
    case 'enumList':
      return (
        Array.isArray(value) &&
        value.length <= field.values.length &&
        new Set(value).size === value.length &&
        value.every((entry) => typeof entry === 'string' && field.values.includes(entry))
      );
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= field.min &&
        value <= field.max
      );
    case 'boolean':
      return typeof value === 'boolean';
    case 'httpsUrlOrNull':
      if (value === null) return true;
      if (typeof value !== 'string' || value.length > 500) return false;
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    case 'phoneOrNull':
      return value === null || (typeof value === 'string' && PHONE.test(value));
    case 'isoDateTime':
      return (
        typeof value === 'string' && ISO_WITH_OFFSET.test(value) && !Number.isNaN(Date.parse(value))
      );
  }
}

/** True when `value` has exactly the fields of `kind`, each valid. */
export function isContentItem(kind: ContentKind, value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const fields = CONTENT_FIELDS[kind];
  const keys = Object.keys(record);
  if (keys.length !== Object.keys(fields).length) return false;
  return keys.every((key) => {
    const field = fields[key];
    return field !== undefined && fieldOk(field, record[key]);
  });
}

export const MAX_ITEMS = 500;
export const REVISION = /^[a-zA-Z0-9._-]{1,64}$/;

export interface PublishedDataset {
  readonly kind: ContentKind;
  readonly revision: string;
  readonly items: readonly Readonly<Record<string, unknown>>[];
}

/**
 * Rules for a dataset that may be served as real information, on top of the item shape:
 * no synthetic items, every item cites an https source, ids are unique, and ghats carry no
 * crowd level (a repository file cannot know live crowds, so it must say `noData`).
 */
export function publishableProblems(dataset: PublishedDataset): string[] {
  const problems: string[] = [];
  if (!REVISION.test(dataset.revision)) problems.push('revision is not a valid token');
  if (dataset.items.length === 0) problems.push('dataset has no items');
  if (dataset.items.length > MAX_ITEMS) problems.push(`more than ${String(MAX_ITEMS)} items`);
  const ids = new Set<unknown>();
  dataset.items.forEach((item, index) => {
    const at = `item ${String(index)}`;
    if (!isContentItem(dataset.kind, item))
      problems.push(`${at} does not match the ${dataset.kind} shape`);
    if (item['synthetic'] !== false) problems.push(`${at} is synthetic`);
    if (typeof item['sourceUrl'] !== 'string') problems.push(`${at} has no https source URL`);
    if (ids.has(item['id'])) problems.push(`${at} repeats id ${String(item['id'])}`);
    ids.add(item['id']);
    if (dataset.kind === 'ghats' && item['crowd'] !== 'noData') {
      problems.push(`${at} states a crowd level; static data must use noData`);
    }
  });
  return problems;
}

/** Client-side check of the response envelope and every item. */
export function isPublishedDataset(
  value: unknown,
  expected: ContentKind,
): value is PublishedDataset {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'items,kind,revision') return false;
  const items = record['items'];
  return (
    record['kind'] === expected &&
    typeof record['revision'] === 'string' &&
    REVISION.test(record['revision']) &&
    Array.isArray(items) &&
    items.length >= 1 &&
    items.length <= MAX_ITEMS &&
    items.every((item) => isContentItem(expected, item))
  );
}
