import {
  browserStore,
  LOCALE_KEY,
  writePreference,
  type PreferenceStore,
} from '../prefs/preferences';
import { setLocale, type Locale } from './i18n';

/**
 * Applies a language choice and remembers it, but only if it is still the latest request, so a
 * stale download can never overwrite a newer choice or its saved preference.
 */
export async function selectLocale(
  next: Locale,
  store: PreferenceStore | undefined = browserStore(),
): Promise<boolean> {
  const applied = await setLocale(next);
  if (applied) writePreference(store, LOCALE_KEY, next);
  return applied;
}
