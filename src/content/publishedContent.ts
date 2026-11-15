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

/**
 * Ghat names and groupings exactly as listed on the East Godavari district "Ghats Details" page
 * (page last updated 28.11.2025; checked 2026-11-14). The page states no facilities, mandals,
 * access or opening status, so `facilities` is empty and the app shows them as not stated.
 * Rajamahendravaram and Kovvur groups are filed under East Godavari, as the page header says.
 * `nameTe` (Telugu names) comes from the owner's trilingual guide (Ghats.pdf, 2026-11-15), an unofficial
 * compilation, used as the primary Telugu name until the government publishes an official list. The
 * owner reads Telugu natively; spellings of Dowleswaram and Seethanagaram follow that guide as supplied.
 * The page groups the last four as "Other Nearby Ghats" without a district, so they use `other`.
 */
const EAST_GODAVARI_GHATS_SOURCE = {
  source: 'East Godavari District, Govt. of Andhra Pradesh: Ghats Details (updated 28.11.2025)',
  sourceUrl: 'https://eastgodavari.ap.gov.in/ghats/',
  updatedAt: '2026-11-14T22:55:00+05:30',
  status: 'verified',
  synthetic: false,
  crowd: 'noData',
} as const;

const ghat = (
  id: string,
  name: string,
  nameTe: string,
  district: 'east' | 'other',
  town: string,
) => ({
  ...EAST_GODAVARI_GHATS_SOURCE,
  facilities: [],
  id,
  name,
  nameTe,
  district,
  town,
});

const GHATS_ENTRY: ContentEntry = {
  dataset: {
    kind: 'ghats',
    revision: 'eg-ghats-2025-11-28',
    items: [
      ghat('kotilingala-revu', 'Kotilingala Revu', 'కోటిలింగాల రేవు', 'east', 'Rajamahendravaram'),
      ghat('pushkar-ghat', 'Pushkar Ghat', 'పుష్కర్ ఘాట్', 'east', 'Rajamahendravaram'),
      ghat('saraswati-ghat', 'Saraswati Ghat', 'సరస్వతీ ఘాట్', 'east', 'Rajamahendravaram'),
      ghat('gowthami-ghat', 'Gowthami Ghat', 'గౌతమీ ఘాట్', 'east', 'Rajamahendravaram'),
      ghat(
        'tummalapalli-vari-revu',
        'Tummalapalli Vari Revu',
        'తుమ్మలపల్లి వారి రేవు',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'sri-narasimha-nagar-ghat',
        'Sri Narasimha Nagar Ghat',
        'శ్రీ నరసింహ నగర్ ఘాట్',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'dowleswaram-barrage-ghat',
        'Dowleswaram Barrage Ghat',
        'డౌలెస్వరం బ్యారేజీ ఘాట్',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'venkateswara-ghat',
        'Venkateswara Ghat',
        'వేంకటేశ్వర ఘాట్',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'goshpada-kshetram',
        'Goshpada Kshetram (Main Kovvur Ghat)',
        'గోష్పాద క్షేత్ర ఘాట్',
        'east',
        'Kovvur',
      ),
      ghat(
        'subrahmanyeswara-ghat',
        'Subrahmanyeswara Ghat',
        'సుబ్రహ్మణ్యేశ్వర ఘాట్',
        'east',
        'Kovvur',
      ),
      ghat('nagareswaram-ghat', 'Nagareswaram Ghat', 'నాగరేశ్వరం ఘాట్', 'east', 'Kovvur'),
      ghat(
        'purushottapatnam-ghat',
        'Purushottapatnam Ghat',
        'పురుషోత్తపట్నం ఘాట్',
        'other',
        'Other nearby ghats',
      ),
      ghat(
        'seethanagaram-ghat',
        'Seethanagaram Ghat',
        'సీతనగరం ఘాట్',
        'other',
        'Other nearby ghats',
      ),
      ghat('pattiseema-ghat', 'Pattiseema Ghat', 'పట్టిసీమ ఘాట్', 'other', 'Other nearby ghats'),
      ghat('vangalapudi-ghat', 'Vangalapudi Ghat', 'వంగలపూడి ఘాట్', 'other', 'Other nearby ghats'),
    ],
  },
  review: {
    status: 'approved',
    reviewer: 'gkmraju',
    reviewedRevision: 'e297725',
    reviewedOn: '2026-11-14',
    scope:
      'English names and groupings: owner compared all 15 with https://eastgodavari.ap.gov.in/ghats/ (2026-11-14). Telugu names (nameTe): owner-supplied trilingual guide, native-speaker review stated by owner 2026-11-15; not an official source.',
  },
};

/**
 * DRAFT, NOT APPROVED (review stays `draft`, so the endpoint still answers 404 and the app shows
 * "not yet available" tiles). Candidate numbers with the official page that states each one;
 * 2026-11-15. Police (100), ambulance (108), women (181) and tourist (1363) still need an official
 * source page before they are added. Owner: check each, then set `review` to approved.
 */
const HELPLINES_CANDIDATE = {
  updatedAt: '2026-11-15T10:00:00+05:30',
  status: 'verified',
  synthetic: false,
} as const;

const HELPLINES_ENTRY: ContentEntry = {
  dataset: {
    kind: 'helplines',
    revision: 'helplines-draft-1',
    items: [
      {
        ...HELPLINES_CANDIDATE,
        id: 'emergency-112',
        kind: 'emergency',
        number: '112',
        source:
          'Government of India: National Portal, Helpline directory (112, integrated emergency number)',
        sourceUrl: 'https://www.india.gov.in/directory/helpline',
      },
      {
        ...HELPLINES_CANDIDATE,
        id: 'child-1098',
        kind: 'child',
        number: '1098',
        source: 'Ministry of Women and Child Development: Child Helpline 1098',
        sourceUrl: 'https://www.spniwcd.wcd.gov.in/child-helpline',
      },
    ],
  },
  review: { status: 'draft' },
};

export const PUBLISHED_CONTENT: Readonly<Record<ContentKind, ContentEntry>> = {
  ghats: GHATS_ENTRY,
  stays: draft('stays'),
  travel: draft('travel'),
  updates: draft('updates'),
  helplines: HELPLINES_ENTRY,
  'help-points': draft('help-points'),
};
