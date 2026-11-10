import type { PublicMeta, SponsoredMeta } from './contracts';

/**
 * Synthetic fixtures for the Home screen. They are placeholders, not news or advertising.
 * docs/content/*.json is NEEDS_REVIEW and is never imported here.
 */
const SYNTHETIC: PublicMeta = {
  source: 'Synthetic fixture',
  sourceUrl: null,
  updatedAt: '2026-11-10T00:00:00+05:30',
  status: 'unverified',
  synthetic: true,
};

export interface HeadlineFixture extends PublicMeta {
  readonly id: string;
  readonly text: string;
}

export interface AdFixture extends PublicMeta, SponsoredMeta {
  readonly id: string;
  readonly text: string;
}

export const HEADLINES: readonly HeadlineFixture[] = [
  {
    ...SYNTHETIC,
    id: 'n1',
    text: '[Sample headline 1 · verified official source and time go here]',
  },
  { ...SYNTHETIC, id: 'n2', text: '[Sample headline 2 · source · time]' },
  { ...SYNTHETIC, id: 'n3', text: '[Sample headline 3 · source · time]' },
];

export const ADS: readonly AdFixture[] = [
  { ...SYNTHETIC, id: 'a1', sponsored: true, text: '[Sample partner ad: local vendor offer]' },
  { ...SYNTHETIC, id: 'a2', sponsored: true, text: '[Sample partner ad: verified stay partner]' },
  { ...SYNTHETIC, id: 'a3', sponsored: true, text: '[Sample partner ad: transport partner]' },
];
