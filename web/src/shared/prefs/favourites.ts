import { signal } from '@preact/signals';
import { browserStore, MAX_FAVOURITES, readFavourites, writeFavourites } from './preferences';

/** The person's favourite ghat ids, kept on this device only (see preferences.ts). */
export const favourites = signal<readonly string[]>(readFavourites(browserStore()));

export function toggleFavourite(id: string): void {
  const current = favourites.value;
  const next = current.includes(id)
    ? current.filter((entry) => entry !== id)
    : [...current, id].slice(-MAX_FAVOURITES);
  favourites.value = next;
  writeFavourites(browserStore(), next);
}

/** Favourites first, everything else in its original order. */
export function favouritesFirst<T extends { readonly id: string }>(
  items: readonly T[],
  favs: readonly string[],
): readonly T[] {
  const starred = items.filter((item) => favs.includes(item.id));
  return starred.length === 0
    ? items
    : [...starred, ...items.filter((item) => !favs.includes(item.id))];
}
