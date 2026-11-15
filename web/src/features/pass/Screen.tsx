import { useSignal } from '@preact/signals';
import { isEnabled } from '../../shared/flags/flags';
import { t } from '../../shared/i18n/i18n';
import { Bi } from '../../shared/ui/Bi';
import { Icon } from '../../shared/ui/Icon';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * Me tab: the one place to sign in, with a Google account (the one used for the Play Store), so
 * there is no password and no OTP. Sign-in is OFF (flag `googleSignIn`) until the Google client,
 * the consent wording and counsel review exist (ADR 0008, OQ-030). Choices made here live in
 * component memory only: nothing is stored, sent or logged, and leaving the screen discards them.
 */
type Age = 'adult' | 'minor';

export default function MeScreen() {
  const age = useSignal<Age | null>(null);
  const consent = useSignal(false);
  const parent = useSignal(false);
  const tried = useSignal(false);
  const live = isEnabled('googleSignIn');
  const ready = age.value !== null && consent.value && (age.value === 'adult' || parent.value);

  return (
    <>
      <ScreenHeader titleKey="nav.me" />
      {live ? null : <PrototypeBanner />}
      <p class="note">{t('account.intro')}</p>
      <fieldset class="choice-group">
        <legend>{t('account.age.legend')}</legend>
        {(
          [
            ['adult', 'account.age.adult'],
            ['minor', 'account.age.minor'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            class="choice"
            aria-pressed={age.value === value}
            onClick={() => {
              age.value = value;
              parent.value = false;
            }}
          >
            {t(label)}
          </button>
        ))}
      </fieldset>
      {age.value === 'minor' ? (
        <>
          <p class="note">{t('account.minor.note')}</p>
          <div class="field field--check">
            <input
              id="me-parent"
              type="checkbox"
              checked={parent.value}
              onChange={(event) => {
                parent.value = event.currentTarget.checked;
              }}
            />
            <label for="me-parent">{t('account.parent.consent')}</label>
          </div>
        </>
      ) : null}
      <div class="field field--check">
        <input
          id="me-consent"
          type="checkbox"
          checked={consent.value}
          onChange={(event) => {
            consent.value = event.currentTarget.checked;
          }}
        />
        <label for="me-consent">{t('account.consent')}</label>
      </div>
      <p class="field__error" role="alert">
        {tried.value && !ready ? t('account.consent.error') : ''}
      </p>
      <p class="note">{t('proto.consentPending')}</p>
      <div class="actions">
        <button
          type="button"
          class="button"
          disabled={!live}
          onClick={() => {
            tried.value = true;
          }}
        >
          <Icon name="lock" size={20} />
          <Bi k="account.signin" />
        </button>
      </div>
      {live ? null : <p class="note">{t('account.pending')}</p>}
    </>
  );
}
