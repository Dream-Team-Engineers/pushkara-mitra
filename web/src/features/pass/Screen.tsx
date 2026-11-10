import { useSignal } from '@preact/signals';
import { t } from '../../shared/i18n/i18n';
import { validateName, validatePhone } from '../../shared/privacy/validation';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * Pilgrim Pass prototype (flag `pilgrimPass` is off). Entries live in component memory only:
 * nothing is stored, sent or logged, and leaving the screen discards them. There is no form
 * element, no OTP, no camera and no real QR code. ADR 0008 and counsel come first.
 */
type Step = 1 | 2 | 3;

function Stepper({ step }: { readonly step: Step }) {
  return (
    <ol class="stepper" aria-label={t('pass.step', { current: step, total: 3 })}>
      {(
        [
          [1, 'pass.step.phone'],
          [2, 'pass.step.details'],
          [3, 'pass.step.pass'],
        ] as const
      ).map(([number, label]) => (
        <li key={number} aria-current={step === number ? 'step' : undefined}>
          <span class="stepper__dot">{number}</span>
          <span>{t(label)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function PassScreen() {
  const step = useSignal<Step>(1);
  const phone = useSignal('');
  const name = useSignal('');
  const consent = useSignal(false);
  const tried = useSignal(false);

  const reset = (): void => {
    step.value = 1;
    phone.value = '';
    name.value = '';
    consent.value = false;
    tried.value = false;
  };

  return (
    <>
      <ScreenHeader titleKey="module.pass.title" subtitleKey="module.pass.subtitle" />
      <PrototypeBanner />
      <Stepper step={step.value} />
      {step.value === 1 ? (
        <>
          <div class="field">
            <label for="pass-phone">{t('pass.phone.label')}</label>
            <input
              id="pass-phone"
              type="tel"
              inputMode="numeric"
              autocomplete="off"
              maxLength={14}
              aria-invalid={tried.value && !validatePhone(phone.value)}
              aria-describedby="pass-phone-error"
              value={phone.value}
              onInput={(event) => {
                phone.value = event.currentTarget.value;
              }}
            />
            <p id="pass-phone-error" class="field__error" role="alert">
              {tried.value && !validatePhone(phone.value) ? t('pass.phone.error') : ''}
            </p>
          </div>
          <p class="note">{t('pass.otp.note')}</p>
          <div class="actions">
            <button
              type="button"
              class="button"
              onClick={() => {
                tried.value = true;
                if (validatePhone(phone.value)) {
                  tried.value = false;
                  step.value = 2;
                }
              }}
            >
              {t('pass.otp.send')}
            </button>
          </div>
        </>
      ) : null}
      {step.value === 2 ? (
        <>
          <div class="field">
            <label for="pass-name">{t('pass.name.label')}</label>
            <input
              id="pass-name"
              type="text"
              autocomplete="off"
              maxLength={60}
              aria-invalid={tried.value && !validateName(name.value)}
              aria-describedby="pass-name-error"
              value={name.value}
              onInput={(event) => {
                name.value = event.currentTarget.value;
              }}
            />
            <p id="pass-name-error" class="field__error" role="alert">
              {tried.value && !validateName(name.value) ? t('pass.name.error') : ''}
            </p>
          </div>
          <p class="note">
            {t('pass.photo.label')}: {t('pass.photo.unavailable')}
          </p>
          <div class="field field--check">
            <input
              id="pass-consent"
              type="checkbox"
              checked={consent.value}
              onChange={(event) => {
                consent.value = event.currentTarget.checked;
              }}
            />
            <label for="pass-consent">{t('pass.consent')}</label>
          </div>
          <p class="field__error" role="alert">
            {tried.value && !consent.value ? t('pass.consent.error') : ''}
          </p>
          <p class="note">{t('proto.consentPending')}</p>
          <div class="actions">
            <button
              type="button"
              class="button"
              onClick={() => {
                tried.value = true;
                if (validateName(name.value) && consent.value) {
                  tried.value = false;
                  step.value = 3;
                }
              }}
            >
              {t('pass.generate')}
            </button>
          </div>
        </>
      ) : null}
      {step.value === 3 ? (
        <>
          <section class="pass-card" aria-labelledby="pass-card-title">
            <h2 id="pass-card-title" class="pass-card__title">
              {t('pass.card.title')}
            </h2>
            <dl class="pass-card__rows">
              <div>
                <dt>{t('pass.card.name')}</dt>
                <dd>{name.value.trim()}</dd>
              </div>
              <div>
                <dt>{t('pass.card.id')}</dt>
                <dd>PM-SAMPLE</dd>
              </div>
            </dl>
            <div class="qr-placeholder" role="img" aria-label={t('pass.card.qr')}>
              <span>{t('pass.card.qr')}</span>
            </div>
            <p class="card__meta">{t('pass.card.valid')}</p>
            <p class="card__meta">{t('pass.card.note')}</p>
          </section>
          <div class="actions">
            <button
              type="button"
              class="button button--secondary"
              onClick={() => {
                step.value = 2;
              }}
            >
              {t('action.edit')}
            </button>
            <button type="button" class="button button--danger" onClick={reset}>
              {t('action.delete')}
            </button>
          </div>
        </>
      ) : null}
      <p class="note">{t('proto.notSent')}</p>
    </>
  );
}
