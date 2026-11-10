import { hrefFor } from '../../app/router';
import { t } from '../../shared/i18n/i18n';

export default function NotFoundScreen() {
  return (
    <div class="state">
      <h1 id="screen-title" tabIndex={-1}>
        {t('status.notFound.title')}
      </h1>
      <p>{t('status.notFound.body')}</p>
      <a class="button" href={hrefFor('home')}>
        {t('nav.home')}
      </a>
    </div>
  );
}
