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
 * Official part: ghat names and groupings exactly as listed on the East Godavari district "Ghats
 * Details" page (updated 28.11.2025; checked 2026-11-14). That page states no facilities, mandals,
 * access or opening status, so `facilities` is empty and the app shows them as not stated.
 * Rajamahendravaram and Kovvur are filed under East Godavari, as the page header says; the last four
 * are "Other Nearby Ghats" without a district, so they use `other`.
 *
 * Telugu and Hindi names (`nameTe`, `nameHi`) for these 15 come from the owner's trilingual guide
 * (Ghats.pdf, 2026-11-15), an unofficial compilation, and are shown as unverified. The owner, a
 * native Telugu speaker, corrected common spellings (Dowleswaram, Seethanagaram). They stay primary
 * until the government publishes an official list.
 */
const EAST_GODAVARI_GHATS_SOURCE = {
  source: 'East Godavari District, Govt. of Andhra Pradesh: Ghats Details (updated 28.11.2025)',
  sourceUrl: 'https://eastgodavari.ap.gov.in/ghats/',
  updatedAt: '2026-11-14T22:55:00+05:30',
  status: 'verified',
  synthetic: false,
  crowd: 'noData',
} as const;

/**
 * Unofficial part: further ghats from the owner's trilingual guide. No official source is cited, so
 * they are marked `unverified` (the app shows an "Unverified" badge) and carry no source URL.
 * Replace each with the official entry once a government list is published.
 */
const GUIDE_GHATS_SOURCE = {
  source: 'Owner-supplied Godavari Pushkaralu trilingual guide (unofficial)',
  sourceUrl: null,
  updatedAt: '2026-11-15T12:00:00+05:30',
  status: 'unverified',
  synthetic: false,
  crowd: 'noData',
} as const;

type GhatDistrict = 'east' | 'west' | 'other' | 'telangana';

const make =
  (meta: typeof EAST_GODAVARI_GHATS_SOURCE | typeof GUIDE_GHATS_SOURCE) =>
  (
    id: string,
    name: string,
    nameTe: string,
    nameHi: string,
    district: GhatDistrict,
    town: string,
  ) => ({ ...meta, facilities: [], id, name, nameTe, nameHi, district, town });

const ghat = make(EAST_GODAVARI_GHATS_SOURCE);
const guideGhat = make(GUIDE_GHATS_SOURCE);

const GHATS_ENTRY: ContentEntry = {
  dataset: {
    kind: 'ghats',
    revision: 'eg-ghats-2025-11-28-guide-1',
    items: [
      ghat(
        'kotilingala-revu',
        'Kotilingala Revu',
        'కోటిలింగాల రేవు',
        'कोटिलिंगाल रेवू',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'pushkar-ghat',
        'Pushkar Ghat',
        'పుష్కర్ ఘాట్',
        'पुष्कर घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'saraswati-ghat',
        'Saraswati Ghat',
        'సరస్వతీ ఘాట్',
        'सरस्वती घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'gowthami-ghat',
        'Gowthami Ghat',
        'గౌతమీ ఘాట్',
        'गौतमी घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'tummalapalli-vari-revu',
        'Tummalapalli Vari Revu',
        'తుమ్మలపల్లి వారి రేవు',
        'तुम्मलपल्लि वारि रेवू',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'sri-narasimha-nagar-ghat',
        'Sri Narasimha Nagar Ghat',
        'శ్రీ నరసింహ నగర్ ఘాట్',
        'श्री नरसिंह नगर घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'dowleswaram-barrage-ghat',
        'Dowleswaram Barrage Ghat',
        'ధవళేశ్వరం బ్యారేజీ ఘాట్',
        'धवलेश्वरम बैराज घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'venkateswara-ghat',
        'Venkateswara Ghat',
        'వేంకటేశ్వర ఘాట్',
        'वेंकटेश्वर घाट',
        'east',
        'Rajamahendravaram',
      ),
      ghat(
        'goshpada-kshetram',
        'Goshpada Kshetram (Main Kovvur Ghat)',
        'గోష్పాద క్షేత్ర ఘాట్',
        'गोष्पाद क्षेत्र घाट',
        'east',
        'Kovvur',
      ),
      ghat(
        'subrahmanyeswara-ghat',
        'Subrahmanyeswara Ghat',
        'సుబ్రహ్మణ్యేశ్వర ఘాట్',
        'सुब्रह्मण्येश्वर घाट',
        'east',
        'Kovvur',
      ),
      ghat(
        'nagareswaram-ghat',
        'Nagareswaram Ghat',
        'నాగరేశ్వరం ఘాట్',
        'नागरेश्वरम घाट',
        'east',
        'Kovvur',
      ),
      ghat(
        'purushottapatnam-ghat',
        'Purushottapatnam Ghat',
        'పురుషోత్తపట్నం ఘాట్',
        'पुरुषोत्तपट्नम घाट',
        'other',
        'Other nearby ghats',
      ),
      ghat(
        'seethanagaram-ghat',
        'Seethanagaram Ghat',
        'సీతానగరం ఘాట్',
        'सीतानगरम घाट',
        'other',
        'Other nearby ghats',
      ),
      ghat(
        'pattiseema-ghat',
        'Pattiseema Ghat',
        'పట్టిసీమ ఘాట్',
        'पट्टिसीम घाट',
        'other',
        'Other nearby ghats',
      ),
      ghat(
        'vangalapudi-ghat',
        'Vangalapudi Ghat',
        'వంగలపూడి ఘాట్',
        'वंगलपूडि घाट',
        'other',
        'Other nearby ghats',
      ),
      guideGhat(
        'bhadrachalam-ghat',
        'Bhadrachalam Ghat',
        'భద్రాచలం ఘాట్',
        'भद्राचलम घाट',
        'telangana',
        'Bhadradri Kothagudem',
      ),
      guideGhat('basara-ghat', 'Basara Ghat', 'బాసర ఘాట్', 'बासर घाट', 'telangana', 'Nirmal'),
      guideGhat(
        'dharmapuri-ghat',
        'Dharmapuri Ghat',
        'ధర్మపురి ఘాట్',
        'धर्मपुरी घाट',
        'telangana',
        'Jagtial',
      ),
      guideGhat(
        'kaleshwaram-ghat',
        'Kaleshwaram Ghat',
        'కాళేశ్వరం ఘాట్',
        'कालेश्वरम घाट',
        'telangana',
        'Jayashankar Bhupalpally',
      ),
      guideGhat(
        'kotilingala-ghat-jagtial',
        'Kotilingala Ghat, Jagtial',
        'కోటిలింగాల ఘాట్, జగిత్యాల',
        'कोटिलिंगाल घाट, जगतियाल',
        'telangana',
        'Jagtial',
      ),
      guideGhat(
        'kandakurthi-ghat',
        'Kandakurthi Ghat',
        'కందకుర్తి ఘాట్',
        'कंदकुर्ति घाट',
        'telangana',
        'Nizamabad',
      ),
      guideGhat(
        'tadpakal-ghat',
        'Tadpakal Ghat',
        'తడపాకల్ ఘాట్',
        'तडपाकल घाट',
        'telangana',
        'Nizamabad',
      ),
      guideGhat(
        'pochampad-sriram-sagar-ghat',
        'Pochampad / Sriram Sagar Ghat',
        'పోచంపాడ్ / శ్రీరాంసాగర్ ఘాట్',
        'पोचमपाड / श्रीरामसागर घाट',
        'telangana',
        'Nizamabad',
      ),
      guideGhat(
        'gudem-gutta-ghat',
        'Gudem Gutta Ghat',
        'గూడెం గుట్ట ఘాట్',
        'गूडेम गुट्टा घाट',
        'telangana',
        'Mancherial',
      ),
      guideGhat(
        'manthani-ghat',
        'Manthani Ghat',
        'మంథని ఘాట్',
        'मंथनी घाट',
        'telangana',
        'Peddapalli',
      ),
      guideGhat(
        'manuguru-ghat',
        'Manuguru Ghat',
        'మణుగూరు ఘాట్',
        'मणुगूरु घाट',
        'telangana',
        'Bhadradri Kothagudem',
      ),
      guideGhat(
        'polavaram-ghat',
        'Polavaram Ghat',
        'పోలవరం ఘాట్',
        'पोलावरम घाट',
        'west',
        'Polavaram (Eluru district)',
      ),
      guideGhat(
        'narasapuram-ghat',
        'Narasapuram Ghat',
        'నరసాపురం ఘాట్',
        'नरसापुरम घाट',
        'west',
        'Narasapuram',
      ),
      guideGhat(
        'antarvedi-ghat',
        'Antarvedi Ghat',
        'అంతర్వేది ఘాట్',
        'अंतर्वेदी घाट',
        'other',
        'Konaseema',
      ),
      guideGhat(
        'mummidivaram-ghat',
        'Mummidivaram Ghat',
        'ముమ్మిడివరం ఘాట్',
        'मुम्मिडिवरम घाट',
        'other',
        'Konaseema',
      ),
    ],
  },
  review: {
    status: 'approved',
    reviewer: 'gkmraju',
    reviewedRevision: 'aaea9b5',
    reviewedOn: '2026-11-15',
    scope:
      "Items 1-15: English names and groupings compared by the owner with https://eastgodavari.ap.gov.in/ghats/ (2026-11-14). Telugu and Hindi names of all items, and items 16-30, come from an owner-supplied unofficial guide: shown as unverified by the owner's direction on 2026-11-15; Telugu spellings corrected by the owner as a native speaker.",
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
