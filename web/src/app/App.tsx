import { useEffect } from 'preact/hooks';
import { online } from '../shared/data/time';
import { t } from '../shared/i18n/i18n';
import { UpdateBanner } from '../shared/pwa/UpdateBanner';
import { AppHeader, BottomBar } from '../shared/ui/Layout';
import { RouteView } from './RouteView';
import { current, titleKeyFor } from './router';

export function App() {
  const state = current.value;
  const title = state === 'home' ? t('app.name') : `${t(titleKeyFor(state))} · ${t('app.name')}`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div class="app">
      <a
        class="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('nav.skipToContent')}
      </a>
      <AppHeader />
      {online.value ? null : (
        <p class="offline-banner" role="status">
          {t('state.offline')}
        </p>
      )}
      <UpdateBanner />
      <main id="main" tabIndex={-1}>
        <RouteView />
      </main>
      <BottomBar />
    </div>
  );
}
