import { useEffect } from 'preact/hooks';
import type { CrowdLevel } from './fixtures';
import { createResource } from './resource';
import { useResource } from './useResource';

/**
 * Client for GET /api/v1/crowd: the latest crowd level per ghat, reported by staff.
 * The Worker already leaves out readings older than `staleAfterSeconds`; they are checked again here
 * so a page left open never shows an old level as current. A ghat with no fresh reading is simply
 * absent from the result, and the screen shows "No data". Nothing is stored in the browser, no
 * cookies are sent and no position or personal data is involved.
 */
export type LiveCrowd = Readonly<Record<string, Exclude<CrowdLevel, 'noData'>>>;

const CROWD_PATH = '/api/v1/crowd';
const REQUEST_TIMEOUT_MS = 8000;
const MINUTE = 60_000;
const LEVELS = ['low', 'moderate', 'high'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Fresh levels, or null when the service is off or unavailable (404 or 503): callers show "No data". */
export async function fetchCrowd(
  request: typeof fetch = (input, init) => fetch(input, init),
  nowMs: number = Date.now(),
): Promise<LiveCrowd | null> {
  const response = await request(CROWD_PATH, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404 || response.status === 503) return null;
  if (response.status !== 200) throw new Error(`Crowd failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  const staleAfter = isRecord(body) ? body['staleAfterSeconds'] : undefined;
  const ghats = isRecord(body) ? body['ghats'] : undefined;
  if (typeof staleAfter !== 'number' || !Number.isFinite(staleAfter) || !isRecord(ghats)) {
    throw new Error('Crowd does not match its contract');
  }
  const live: Record<string, Exclude<CrowdLevel, 'noData'>> = {};
  for (const [id, reading] of Object.entries(ghats)) {
    if (!isRecord(reading)) throw new Error('Crowd does not match its contract');
    const { level, reportedAt } = reading;
    if (
      typeof level !== 'string' ||
      !(LEVELS as readonly string[]).includes(level) ||
      typeof reportedAt !== 'string' ||
      Number.isNaN(Date.parse(reportedAt))
    ) {
      throw new Error('Crowd does not match its contract');
    }
    if (nowMs - Date.parse(reportedAt) > staleAfter * 1000) continue;
    live[id] = level as Exclude<CrowdLevel, 'noData'>;
  }
  return live;
}

export const crowdLiveResource = createResource(fetchCrowd, 10 * MINUTE);

/** Live levels while a screen is open, re-checked every 5 minutes. Null until available. */
export function useLiveCrowd(): LiveCrowd | null {
  const state = useResource(crowdLiveResource);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void crowdLiveResource.refresh();
    }, 5 * MINUTE);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return state.status === 'ready' ? state.data : null;
}
