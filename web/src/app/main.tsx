import { render } from 'preact';
import { startClock, watchOnline } from '../shared/data/time';
import { DEFAULT_LOCALE, setLocale } from '../shared/i18n/i18n';
import { browserStore, readPreferences } from '../shared/prefs/preferences';
import '../shared/ui/tokens.css';
import '../shared/ui/app.css';
import { initTheme } from '../shared/ui/theme';
import { App } from './App';
import { startRouter } from './router';

async function boot(): Promise<void> {
  initTheme();
  const { locale } = readPreferences(browserStore());
  if (locale !== null && locale !== DEFAULT_LOCALE) {
    try {
      await setLocale(locale);
    } catch {
      // Keep the bundled Telugu catalogue; the person can choose again in Settings.
    }
  }
  startRouter();
  startClock();
  watchOnline();
  const root = document.getElementById('app');
  if (root === null) throw new Error('Missing #app mount point');
  render(<App />, root);
}

void boot();
