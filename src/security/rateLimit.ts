/**
 * Rate limiting for the sign-in routes (audit H2). Each sign-in does an RSA verify, so unthrottled
 * calls burn Worker CPU and quota and invite credential stuffing.
 *
 * Two layers, both keyed by client IP and neither stored or logged:
 *  1. If a Workers rate-limit binding is configured (env.AUTH_RATE_LIMIT), it is the authority: it is
 *     shared across the account's isolates.
 *  2. Otherwise a fixed-window counter in the isolate's memory. It is best effort (each isolate counts
 *     separately and resets on restart) but needs no binding and still caps a single abusive client.
 */
export interface RateLimiter {
  allow(key: string, nowSeconds: number): Promise<boolean>;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export const AUTH_LIMIT_PER_WINDOW = 30;
export const AUTH_WINDOW_SECONDS = 60;
const MAX_TRACKED_KEYS = 10_000;

export function memoryRateLimiter(
  limit = AUTH_LIMIT_PER_WINDOW,
  windowSeconds = AUTH_WINDOW_SECONDS,
): RateLimiter {
  const counts = new Map<string, { window: number; count: number }>();
  return {
    allow(key, nowSeconds) {
      const window = Math.floor(nowSeconds / windowSeconds);
      if (counts.size >= MAX_TRACKED_KEYS) {
        for (const [k, v] of counts) if (v.window !== window) counts.delete(k);
        if (counts.size >= MAX_TRACKED_KEYS) counts.clear();
      }
      const entry = counts.get(key);
      if (entry?.window !== window) {
        counts.set(key, { window, count: 1 });
        return Promise.resolve(true);
      }
      entry.count += 1;
      return Promise.resolve(entry.count <= limit);
    },
  };
}

export function bindingRateLimiter(binding: RateLimitBinding): RateLimiter {
  return {
    async allow(key) {
      try {
        return (await binding.limit({ key })).success;
      } catch {
        return true; // A limiter outage must not lock every pilgrim out.
      }
    },
  };
}

export const unlimited: RateLimiter = { allow: () => Promise.resolve(true) };
