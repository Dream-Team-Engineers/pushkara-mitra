import type { ContentKind } from '../../../../src/content/publicContentSchema';
import { loadPublic } from './client';
import type { PublicMeta } from './contracts';
import { fetchPublicContent } from './publicContent';
import type { Locale } from '../i18n/i18n';
import { fetchPublicInformation, type PublicInformation } from './publicInformation';
import { GHATS, HELP_POINTS, HELPLINES, STAYS, TRAVEL, UPDATES } from './fixtures';
import { createResource, type Resource } from './resource';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Approved data from the Worker when it exists; otherwise the built-in samples, each labelled
 * "Sample" on screen. A network or contract failure is an error (the resource keeps its last good
 * data), never a silent switch to samples.
 */
function publishedOr<T extends PublicMeta>(kind: ContentKind, samples: readonly T[]) {
  return async (): Promise<readonly T[]> =>
    (await fetchPublicContent<T>(kind)) ?? loadPublic(samples);
}

/** Stale thresholds come from docs/frontend/architecture-blueprint.md and are proposals pending owner review. */
export const ghatsResource = createResource(publishedOr('ghats', GHATS), 24 * HOUR);
export const stayResource = createResource(publishedOr('stays', STAYS), 24 * HOUR);
export const travelResource = createResource(publishedOr('travel', TRAVEL), 6 * HOUR);
export const updatesResource = createResource(publishedOr('updates', UPDATES), 30 * MINUTE);
/** Crowd levels share the ghat records and go stale faster than the ghat listing itself. */
export const crowdResource = createResource(publishedOr('ghats', GHATS), 10 * MINUTE);
export const helplinesResource = createResource(publishedOr('helplines', HELPLINES), 24 * HOUR);
export const helpPointsResource = createResource(
  publishedOr('help-points', HELP_POINTS),
  24 * HOUR,
);

const informationResources = new Map<Locale, Resource<PublicInformation | null>>();

/** One in-memory resource per language. Null data means no approved copy is published yet. */
export function informationResource(lang: Locale): Resource<PublicInformation | null> {
  let resource = informationResources.get(lang);
  if (resource === undefined) {
    resource = createResource(() => fetchPublicInformation(lang), 6 * HOUR);
    informationResources.set(lang, resource);
  }
  return resource;
}
