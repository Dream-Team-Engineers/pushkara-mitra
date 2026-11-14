import type { ContentKind, PublishedDataset } from './publicContentSchema';

/**
 * Real public listings, served by GET /api/public/content/{kind} only when approved.
 *
 * HOW TO PUBLISH (docs/operations/LAUNCH_APPROVALS.md, step 4):
 * 1. Put verified items in `items`: `synthetic: false`, an https `sourceUrl` to the official page,
 *    `updatedAt` = when you checked the source, `status: 'verified'`. Ghats use `crowd: 'noData'`.
 * 2. Commit, then set `review` to `approved` with your GitHub login, that commit's SHA, today's
 *    date and what you checked. The Worker refuses to serve anything that fails validation.
 *
 * While a kind is `draft`, the endpoint answers 404 CONTENT_UNAVAILABLE and the app shows its
 * built-in samples, each labelled "Sample". Approval is a human decision; never set it for
 * content you have not checked against the source.
 */
export interface ContentReview {
  readonly status: 'approved';
  /** GitHub login of the person who checked every item against its source. */
  readonly reviewer: string;
  /** Commit SHA containing exactly the reviewed items. */
  readonly reviewedRevision: string;
  /** YYYY-MM-DD. */
  readonly reviewedOn: string;
  readonly scope: string;
}

export interface ContentEntry {
  readonly dataset: PublishedDataset;
  readonly review: { readonly status: 'draft' } | ContentReview;
}

const draft = (kind: ContentKind): ContentEntry => ({
  dataset: { kind, revision: 'draft-0', items: [] },
  review: { status: 'draft' },
});

export const PUBLISHED_CONTENT: Readonly<Record<ContentKind, ContentEntry>> = {
  ghats: draft('ghats'),
  stays: draft('stays'),
  travel: draft('travel'),
  updates: draft('updates'),
  helplines: draft('helplines'),
  'help-points': draft('help-points'),
};
