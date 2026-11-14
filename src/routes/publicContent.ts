import {
  isContentKind,
  publishableProblems,
  type PublishedDataset,
} from '../content/publicContentSchema';
import {
  PUBLISHED_CONTENT,
  type ContentEntry,
  type ContentReview,
} from '../content/publishedContent';
import { publicError } from '../http/errors';
import { parseStrictQuery } from '../http/query';
import type { ContentKind } from '../content/publicContentSchema';

export const PUBLIC_CONTENT_PREFIX = '/api/public/content/';

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const SHA = /^[0-9a-f]{7,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function reviewOk(review: ContentReview): boolean {
  return (
    LOGIN.test(review.reviewer) &&
    SHA.test(review.reviewedRevision) &&
    DAY.test(review.reviewedOn) &&
    !Number.isNaN(Date.parse(review.reviewedOn)) &&
    review.scope.trim().length > 0
  );
}

/** The dataset to serve, or null when it is a draft, has an incomplete review or fails validation. */
export function approvedDataset(
  kind: ContentKind,
  entries: Readonly<Record<ContentKind, ContentEntry>> = PUBLISHED_CONTENT,
): PublishedDataset | null {
  const entry = entries[kind];
  if (entry.review.status !== 'approved' || !reviewOk(entry.review)) return null;
  if (entry.dataset.kind !== kind || publishableProblems(entry.dataset).length > 0) return null;
  return entry.dataset;
}

/**
 * GET /api/public/content/{kind}
 * Reads repository content only: no database, cookies, identity or side effect. Always no-store,
 * so a correction reaches people on their next refresh.
 */
export function handlePublicContent(
  url: URL,
  entries: Readonly<Record<ContentKind, ContentEntry>> = PUBLISHED_CONTENT,
): Response {
  if (parseStrictQuery(url, []) === null) return publicError('INVALID_QUERY', 400);
  const kind = url.pathname.slice(PUBLIC_CONTENT_PREFIX.length);
  if (!isContentKind(kind)) return publicError('NOT_FOUND', 404);
  const dataset = approvedDataset(kind, entries);
  if (dataset === null) return publicError('CONTENT_UNAVAILABLE', 404);
  return Response.json(
    { kind: dataset.kind, revision: dataset.revision, items: dataset.items },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
