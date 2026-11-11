import { loadPublic } from './client';
import type { Locale } from '../i18n/i18n';
import { fetchPublicInformation, type PublicInformation } from './publicInformation';
import { GHATS, HELP_POINTS, HELPLINES, STAYS, TRAVEL, UPDATES } from './fixtures';
import { createResource, type Resource } from './resource';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Stale thresholds come from docs/frontend/architecture-blueprint.md and are proposals pending owner review. */
export const ghatsResource = createResource(() => loadPublic(GHATS), 24 * HOUR);
export const stayResource = createResource(() => loadPublic(STAYS), 24 * HOUR);
export const travelResource = createResource(() => loadPublic(TRAVEL), 6 * HOUR);
export const updatesResource = createResource(() => loadPublic(UPDATES), 30 * MINUTE);
/** Crowd levels share the ghat records and go stale faster than the ghat listing itself. */
export const crowdResource = createResource(() => loadPublic(GHATS), 10 * MINUTE);
export const helplinesResource = createResource(() => loadPublic(HELPLINES), 24 * HOUR);
export const helpPointsResource = createResource(() => loadPublic(HELP_POINTS), 24 * HOUR);

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
