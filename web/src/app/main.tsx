import { render } from 'preact';
import { startClock, watchOnline } from '../shared/data/time';
import { DEFAULT_LOCALE, setLocale } from '../shared/i18n/i18n';
import { restoreSession } from '../shared/auth/google';
import { startCounting } from '../shared/metrics/ping';
import { listenForInstall } from '../shared/pwa/install';
import { registerServiceWorker } from '../shared/pwa/register';
import { browserStore, readPreferences } from '../shared/prefs/preferences';
import '../shared/ui/tokens.css';
import '../shared/ui/fonts.css';
import '../shared/ui/styles.css';
import { Splash } from '../shared/ui/Splash';
import { initTheme } from '../shared/ui/theme';
import { fitMobileViewport } from '../shared/ui/viewport';
import { App } from './App';
import { startRouter } from './router';

async function boot(): Promise<void> {
  fitMobileViewport();
  listenForInstall();
  initTheme();
  const { locale } = readPreferences(browserStore());
  const wanted = locale ?? DEFAULT_LOCALE;
  if (wanted !== DEFAULT_LOCALE) {
    try {
      await setLocale(wanted);
    } catch {
      // Keep the bundled Telugu catalogue; the person can choose again in Settings.
    }
  } else {
    // Telugu is bundled and shows at once; English loads in the background and then appears beside it.
    setLocale(DEFAULT_LOCALE).catch(() => undefined);
  }
  startRouter();
  void restoreSession();
  startClock();
  watchOnline();
  const root = document.getElementById('app');
  if (root === null) throw new Error('Missing #app mount point');
  render(
    <>
      <App />
      <Splash />
    </>,
    root,
  );
  registerServiceWorker();
  startCounting();
}

void boot();
