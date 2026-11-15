import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import { signOut, user } from '../../shared/auth/google';
import { t } from '../../shared/i18n/i18n';
import { ScreenHeader } from '../../shared/ui/Layout';

/**
 * Delete my account and data (also the public address `#/delete-account` that app stores ask for).
 * The app keeps nothing on its servers: the only thing held is the optional sign-in cookie on this
 * device, which "Sign out and delete" clears. DRAFT wording, legal review pending (OQ-030).
 */
export default function DeleteAccountScreen() {
  const done = useSignal(false);
  return (
    <>
      <ScreenHeader titleKey="delete.title" />
      <p class="notice notice--warn" role="note">
        {t('privacy.status')}
      </p>
      <p class="note">{t('delete.what')}</p>
      <p class="note">{t('delete.how')}</p>
      <p class="note">{t('delete.google')}</p>
      {user.value === null && !done.value ? <p class="note">{t('delete.notSignedIn')}</p> : null}
      {done.value ? (
        <p class="notice" role="status">
          {t('delete.done')}
        </p>
      ) : null}
      {user.value === null ? null : (
        <div class="actions">
          <button
            type="button"
            class="button button--danger"
            onClick={() => {
              void signOut().then(() => {
                done.value = true;
              });
            }}
          >
            {t('delete.button')}
          </button>
        </div>
      )}
      <p class="note">{t('delete.contact')}</p>
      <p class="note">
        <a href={hrefFor('privacy')}>{t('account.privacyLink')}</a>
      </p>
    </>
  );
}
