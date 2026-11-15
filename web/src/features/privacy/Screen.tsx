import { hrefFor } from '../../app/router';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { ScreenHeader } from '../../shared/ui/Layout';

/**
 * Privacy notice for sign-in. DRAFT: written from what the code does (docs/legal/privacy-notice-v1-draft.md,
 * OQ-030); legal review and native-language review are pending, and the screen says so.
 */
const SECTIONS: readonly (readonly [MessageKey, MessageKey])[] = [
  ['privacy.who.h', 'privacy.who.p'],
  ['privacy.what.h', 'privacy.what.p'],
  ['privacy.keep.h', 'privacy.keep.p'],
  ['privacy.child.h', 'privacy.child.p'],
  ['privacy.choices.h', 'privacy.choices.p'],
  ['privacy.contact.h', 'privacy.contact.p'],
];

export default function PrivacyScreen() {
  return (
    <>
      <ScreenHeader titleKey="privacy.title" />
      <p class="notice notice--warn" role="note">
        {t('privacy.status')}
      </p>
      {SECTIONS.map(([heading, body]) => (
        <section key={heading} class="section">
          <h2 class="section__title">{t(heading)}</h2>
          <p class="note note--flush">{t(body)}</p>
        </section>
      ))}
      <p class="note">
        <a href={hrefFor('deleteAccount')}>{t('account.deleteLink')}</a>
      </p>
    </>
  );
}
