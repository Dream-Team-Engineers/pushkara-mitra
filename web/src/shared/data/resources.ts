import { loadPublic } from './client';
import { GHATS, STAYS, TRAVEL, UPDATES } from './fixtures';
import { createResource } from './resource';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Stale thresholds come from docs/frontend/architecture-blueprint.md and are proposals pending owner review. */
export const ghatsResource = createResource(() => loadPublic(GHATS), 24 * HOUR);
export const stayResource = createResource(() => loadPublic(STAYS), 24 * HOUR);
export const travelResource = createResource(() => loadPublic(TRAVEL), 6 * HOUR);
export const updatesResource = createResource(() => loadPublic(UPDATES), 30 * MINUTE);
/** Crowd levels share the ghat records and go stale faster than the ghat listing itself. */
export const crowdResource = createResource(() => loadPublic(GHATS), 10 * MINUTE);
