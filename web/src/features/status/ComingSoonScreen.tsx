import { current, titleKeyFor } from '../../app/router';
import { t } from '../../shared/i18n/i18n';
import { ScreenHeader } from '../../shared/ui/Layout';

/** Placeholder for a route whose screen has not been migrated yet. It never fabricates content. */
export default function ComingSoonScreen() {
  return (
    <>
      <ScreenHeader titleKey={titleKeyFor(current.value)} />
      <div class="state">
        <p>{t('status.comingSoon')}</p>
      </div>
    </>
  );
}
