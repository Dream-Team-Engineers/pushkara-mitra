import { hasPublicMeta, type PublicMeta } from './contracts';

/**
 * Stand-in for the public-information API. It returns in-process synthetic fixtures after
 * checking that every item carries source metadata, so a contract violation shows the error
 * state instead of unlabelled content. There is no network call here; the real client replaces
 * this once the backend contract is accepted.
 */
export async function loadPublic<T extends PublicMeta>(items: readonly T[]): Promise<readonly T[]> {
  await Promise.resolve();
  for (const item of items) {
    if (!hasPublicMeta(item)) throw new Error('Public item is missing its source metadata');
  }
  return items;
}
