const PHOTOS = 4;

/** The same ghat always gets the same photo. */
function photoFor(ghatId: string): number {
  let sum = 0;
  for (const char of ghatId) sum = (sum * 31 + char.charCodeAt(0)) % 9973;
  return (sum % PHOTOS) + 1;
}

/**
 * Small Godavari photo beside a ghat name. The photos are CC0 or public-domain river pictures
 * (web/public/ghats/CREDITS.txt) and are illustrative: they do not show the named ghat. Decorative.
 */
export function GhatThumb({ ghatId }: { readonly ghatId: string }) {
  return (
    <img
      class="ghat-card__thumb"
      src={`/ghats/godavari-${String(photoFor(ghatId))}.jpg`}
      width={56}
      height={56}
      alt="Godavari river"
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  );
}
