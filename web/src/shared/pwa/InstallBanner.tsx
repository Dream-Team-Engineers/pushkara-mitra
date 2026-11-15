import { t } from '../i18n/i18n';
import { Icon } from '../ui/Icon';
import { installAvailable, installDismissed, promptInstall, showIosHint } from './install';

export function InstallBanner() {
  if (installDismissed.value) return null;
  const ios = showIosHint();
  if (!installAvailable.value && !ios) return null;
  return (
    <div class="install-banner" role="region" aria-label={t('install.title')}>
      <img src="/logo-96.png" width={36} height={36} alt="Pushkara Mitra" aria-hidden="true" />
      <div class="install-banner__text">
        <strong>{t('install.title')}</strong>
        {ios ? <span>{t('install.ios')}</span> : <span>{t('install.sub')}</span>}
      </div>
      {ios ? null : (
        <button type="button" class="install-banner__go" onClick={() => void promptInstall()}>
          {t('install.button')}
        </button>
      )}
      <button
        type="button"
        class="install-banner__close"
        aria-label={t('install.dismiss')}
        onClick={() => {
          installDismissed.value = true;
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
