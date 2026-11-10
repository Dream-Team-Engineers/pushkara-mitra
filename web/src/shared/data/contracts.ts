/**
 * Public-content contract used by every list in the app (docs/frontend/architecture-blueprint.md).
 * Mirrors the public-information contract; any mismatch with
 * docs/contracts/public-information.openapi.yaml is reported, not silently fixed.
 */
export type VerificationStatus = 'verified' | 'unverified' | 'stale';

export interface PublicMeta {
  readonly source: string;
  readonly sourceUrl: string | null;
  /** ISO 8601 with offset. */
  readonly updatedAt: string;
  readonly status: VerificationStatus;
  /** True for every fixture until a reviewed real source replaces it. */
  readonly synthetic: boolean;
}

export interface SponsoredMeta {
  readonly sponsored: boolean;
}

export function hasPublicMeta(value: unknown): value is PublicMeta {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['source'] === 'string' &&
    record['source'].length > 0 &&
    (record['sourceUrl'] === null || typeof record['sourceUrl'] === 'string') &&
    typeof record['updatedAt'] === 'string' &&
    !Number.isNaN(Date.parse(record['updatedAt'])) &&
    (record['status'] === 'verified' ||
      record['status'] === 'unverified' ||
      record['status'] === 'stale') &&
    typeof record['synthetic'] === 'boolean'
  );
}
