/**
 * Push endpoint check (ADR 0020). The admin Worker sends an empty POST to each partner's push
 * address, so an address must be a real browser push service, never an arbitrary URL.
 */
const HOST_SUFFIXES: readonly string[] = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

export const PUSH_ENDPOINT_MAX = 600;

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > PUSH_ENDPOINT_MAX) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}
