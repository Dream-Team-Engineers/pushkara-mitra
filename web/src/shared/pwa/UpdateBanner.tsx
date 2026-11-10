import { t } from '../i18n/i18n';
import { applyUpdate, updateReady } from './register';

export function UpdateBanner() {
  if (!updateReady.value) return null;
  return (
    <div class="update-banner" role="status">
      <span>{t('pwa.updateReady')}</span>
      <button type="button" class="button" onClick={applyUpdate}>
        {t('pwa.updateApply')}
      </button>
    </div>
  );
}
