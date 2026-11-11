/**
 * Repository-controlled public information (docs/contracts/public-information.openapi.yaml).
 *
 * Nothing here is served until a named human has reviewed it. A document is served only when its
 * entry carries an `approved` review record and passes validation; draft entries are never served
 * and the runtime never creates or edits a review. Approving copy is a reviewed code change that
 * adds the review record; native-language and counsel review are separate human decisions
 * (OQ-019) that this file cannot represent as done.
 */
export const LOCALES = ['te', 'en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'te';

export interface PublicInformation {
  readonly locale: Locale;
  readonly revision: string;
  readonly independentApplication: true;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface ApprovedReview {
  readonly status: 'approved';
  /** Public GitHub login of the human who reviewed this exact copy. */
  readonly reviewer: string;
  /** Repository commit SHA of the reviewed content. */
  readonly reviewedRevision: string;
  /** ISO date (YYYY-MM-DD) of the review. */
  readonly reviewedOn: string;
  /** What was reviewed, for example "native Telugu copy" or "legal wording". */
  readonly scope: string;
}

export interface DraftReview {
  readonly status: 'draft';
}

export interface InformationEntry {
  readonly document: PublicInformation;
  readonly review: DraftReview | ApprovedReview;
}

/**
 * Draft copy for human review. These strings reuse the draft `app.disclaimer` wording of the
 * frontend catalogues and are NOT approved. Do not change `status` to `approved` without the
 * required human review and a recorded review link.
 */
export const INFORMATION_ENTRIES: Readonly<Record<Locale, InformationEntry>> = {
  te: {
    document: {
      locale: 'te',
      revision: 'draft-1',
      independentApplication: true,
      title: 'పుష్కర మిత్ర గురించి',
      paragraphs: ['స్వతంత్ర యాప్ · ప్రభుత్వ అధికారిక సేవ కాదు'],
    },
    review: { status: 'draft' },
  },
  en: {
    document: {
      locale: 'en',
      revision: 'draft-1',
      independentApplication: true,
      title: 'About Pushkara Mitra',
      paragraphs: ['Independent app · not an official government service'],
    },
    review: { status: 'draft' },
  },
  hi: {
    document: {
      locale: 'hi',
      revision: 'draft-1',
      independentApplication: true,
      title: 'पुष्कर मित्र के बारे में',
      paragraphs: ['स्वतंत्र ऐप · सरकारी आधिकारिक सेवा नहीं'],
    },
    review: { status: 'draft' },
  },
};

const REVISION = /^[a-zA-Z0-9._-]{1,64}$/;
const GITHUB_LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const SHA = /^[0-9a-f]{40}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a list of problems; an empty list means the entry may be published when approved. */
export function validateEntry(locale: Locale, entry: InformationEntry): string[] {
  const problems: string[] = [];
  const { document, review } = entry;
  if (document.locale !== locale) problems.push('locale does not match its slot');
  if (!REVISION.test(document.revision)) problems.push('revision is not 1-64 safe characters');
  if (document.title.length < 1 || document.title.length > 120) problems.push('title length');
  if (document.paragraphs.length < 1 || document.paragraphs.length > 12) {
    problems.push('paragraph count');
  }
  for (const paragraph of document.paragraphs) {
    if (paragraph.length < 1 || paragraph.length > 600) problems.push('paragraph length');
  }
  if (review.status === 'approved') {
    if (!GITHUB_LOGIN.test(review.reviewer)) problems.push('reviewer');
    if (!SHA.test(review.reviewedRevision)) problems.push('reviewed revision');
    if (!ISO_DATE.test(review.reviewedOn)) problems.push('review date');
    if (review.scope.trim() === '') problems.push('review scope');
  }
  return problems;
}

/** The only way to read servable copy: approved and valid, otherwise null (fail closed). */
export function approvedDocument(
  locale: Locale,
  entries: Readonly<Record<Locale, InformationEntry>> = INFORMATION_ENTRIES,
): PublicInformation | null {
  const entry = entries[locale];
  if (entry.review.status !== 'approved') return null;
  return validateEntry(locale, entry).length === 0 ? entry.document : null;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
