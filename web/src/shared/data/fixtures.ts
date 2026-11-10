import type { PublicMeta, SponsoredMeta } from './contracts';

/**
 * Synthetic fixtures for the public modules. They are shaped like real listings so the screens
 * can be built and tested, and every one says so (synthetic, unverified). None of this is
 * verified information. docs/content/*.json is NEEDS_REVIEW and is never imported here.
 */
const SYNTHETIC: PublicMeta = {
  source: 'Synthetic fixture',
  sourceUrl: null,
  updatedAt: '2026-11-10T00:00:00+05:30',
  status: 'unverified',
  synthetic: true,
};

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'noData';
export type District = 'east' | 'west' | 'other';
export type Facility = 'water' | 'toilets' | 'firstAid' | 'ramp' | 'parking';

export interface GhatFixture extends PublicMeta {
  readonly id: string;
  readonly name: string;
  readonly district: District;
  readonly town: string;
  readonly crowd: CrowdLevel;
  readonly facilities: readonly Facility[];
}

export const GHATS: readonly GhatFixture[] = [
  {
    ...SYNTHETIC,
    id: 'g1',
    name: '[Sample ghat 1]',
    district: 'east',
    town: '[Town]',
    crowd: 'low',
    facilities: ['water', 'toilets', 'firstAid', 'ramp'],
  },
  {
    ...SYNTHETIC,
    id: 'g2',
    name: '[Sample ghat 2]',
    district: 'west',
    town: '[Town]',
    crowd: 'moderate',
    facilities: ['water', 'toilets', 'parking'],
  },
  {
    ...SYNTHETIC,
    id: 'g3',
    name: '[Sample ghat 3]',
    district: 'other',
    town: '[Town]',
    crowd: 'high',
    facilities: ['water', 'firstAid'],
  },
  {
    ...SYNTHETIC,
    id: 'g4',
    name: '[Sample ghat 4]',
    district: 'east',
    town: '[Town]',
    crowd: 'noData',
    facilities: [],
  },
];

export type StayKind = 'hotel' | 'dharmashala' | 'govt';

export interface StayFixture extends PublicMeta, SponsoredMeta {
  readonly id: string;
  readonly kind: StayKind;
  readonly name: string;
  readonly distanceKm: number;
  readonly priceNote: string;
}

export const STAYS: readonly StayFixture[] = [
  {
    ...SYNTHETIC,
    id: 's1',
    kind: 'hotel',
    sponsored: true,
    name: '[Sample partner hotel]',
    distanceKm: 1.2,
    priceNote: '[price range]',
  },
  {
    ...SYNTHETIC,
    id: 's2',
    kind: 'dharmashala',
    sponsored: false,
    name: '[Sample dharmashala]',
    distanceKm: 0.8,
    priceNote: '[free / donation]',
  },
  {
    ...SYNTHETIC,
    id: 's3',
    kind: 'govt',
    sponsored: false,
    name: '[Sample government camp]',
    distanceKm: 2.5,
    priceNote: '[official source]',
  },
  {
    ...SYNTHETIC,
    id: 's4',
    kind: 'hotel',
    sponsored: false,
    name: '[Sample hotel]',
    distanceKm: 3.1,
    priceNote: '[price range]',
  },
];

export type TravelMode = 'train' | 'bus' | 'flight';

export interface TravelFixture extends PublicMeta {
  readonly id: string;
  readonly mode: TravelMode;
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly departs: string;
  readonly arrives: string;
}

export const TRAVEL: readonly TravelFixture[] = [
  {
    ...SYNTHETIC,
    id: 't1',
    mode: 'train',
    name: '[Sample train 1]',
    from: 'Hyderabad',
    to: 'Rajamahendravaram',
    departs: '[hh:mm]',
    arrives: '[hh:mm]',
  },
  {
    ...SYNTHETIC,
    id: 't2',
    mode: 'train',
    name: '[Sample train 2]',
    from: 'Chennai',
    to: 'Rajamahendravaram',
    departs: '[hh:mm]',
    arrives: '[hh:mm]',
  },
  {
    ...SYNTHETIC,
    id: 't3',
    mode: 'bus',
    name: '[Sample bus 1]',
    from: 'Hyderabad',
    to: 'Rajamahendravaram',
    departs: '[hh:mm]',
    arrives: '[hh:mm]',
  },
  {
    ...SYNTHETIC,
    id: 't4',
    mode: 'flight',
    name: '[Sample flight 1]',
    from: 'Hyderabad',
    to: 'Rajamahendravaram',
    departs: '[hh:mm]',
    arrives: '[hh:mm]',
  },
];

export type UpdateKind = 'advisory' | 'news' | 'event' | 'ritual';

export interface UpdateFixture extends PublicMeta {
  readonly id: string;
  readonly kind: UpdateKind;
  readonly title: string;
  readonly detail: string;
}

export const UPDATES: readonly UpdateFixture[] = [
  {
    ...SYNTHETIC,
    id: 'u1',
    kind: 'advisory',
    title: '[Sample advisory headline]',
    detail: '[official source · time]',
  },
  {
    ...SYNTHETIC,
    id: 'u2',
    kind: 'news',
    title: '[Sample news headline]',
    detail: '[source · time]',
  },
  {
    ...SYNTHETIC,
    id: 'u3',
    kind: 'event',
    title: '[Sample event: evening harathi]',
    detail: '[ghat · organiser]',
  },
  {
    ...SYNTHETIC,
    id: 'u4',
    kind: 'event',
    title: '[Sample event: cultural programme]',
    detail: '[venue · organiser]',
  },
  {
    ...SYNTHETIC,
    id: 'u5',
    kind: 'ritual',
    title: '[Sample ritual: holy dip window]',
    detail: '[ghat · temple or official source]',
  },
];
