import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import { GHATS } from '../../shared/data/fixtures';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { validatePhone } from '../../shared/privacy/validation';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * Community partners and volunteers prototype (flag `partnerContact` is off). Entries stay in
 * component memory, no partner is listed to pilgrims, no OTP is sent and no report leaves the
 * device. Vendor verification, moderation and takedown processes must exist before this is real.
 */
type Role = 'partner' | 'volunteer';
type PartnerType = 'pandit' | 'shop' | 'vendor';
type Level = 'low' | 'moderate' | 'high';

const ROLES: readonly ChipOption<Role>[] = [
  { value: 'partner', label: 'partners.tab.partner' },
  { value: 'volunteer', label: 'partners.tab.volunteer' },
];

const TYPES: readonly ChipOption<PartnerType>[] = [
  { value: 'pandit', label: 'partners.type.pandit' },
  { value: 'shop', label: 'partners.type.shop' },
  { value: 'vendor', label: 'partners.type.vendor' },
];

const LEVELS: readonly ChipOption<Level>[] = [
  { value: 'low', label: 'crowd.low' },
  { value: 'moderate', label: 'crowd.moderate' },
  { value: 'high', label: 'crowd.high' },
];

const VERIFY_STEPS: readonly MessageKey[] = [
  'partners.verify.phone',
  'partners.verify.docs',
  'partners.verify.live',
];

export function PartnerPanel() {
  const type = useSignal<PartnerType>('pandit');
  const phone = useSignal('');
  const business = useSignal('');
  const signedIn = useSignal(false);
  const tried = useSignal(false);
  return (
    <>
      <ChipGroup
        legend="partners.type.legend"
        options={TYPES}
        selected={type.value}
        onSelect={(value) => {
          type.value = value;
        }}
      />
      <div class="field">
        <label for="partner-phone">{t('pass.phone.label')}</label>
        <input
          id="partner-phone"
          type="tel"
          inputMode="numeric"
          autocomplete="off"
          maxLength={14}
          aria-invalid={tried.value && !validatePhone(phone.value)}
          aria-describedby="partner-phone-error"
          value={phone.value}
          onInput={(event) => {
            phone.value = event.currentTarget.value;
          }}
        />
        <p id="partner-phone-error" class="field__error" role="alert">
          {tried.value && !validatePhone(phone.value) ? t('pass.phone.error') : ''}
        </p>
      </div>
      <div class="field">
        <label for="partner-name">{t('partners.name.label')}</label>
        <input
          id="partner-name"
          type="text"
          autocomplete="off"
          maxLength={60}
          value={business.value}
          onInput={(event) => {
            business.value = event.currentTarget.value;
          }}
        />
      </div>
      <div class="actions">
        <button
          type="button"
          class="button"
          onClick={() => {
            tried.value = true;
            signedIn.value = validatePhone(phone.value);
          }}
        >
          {t('partners.signin')}
        </button>
      </div>
      {signedIn.value ? (
        <section class="section" aria-labelledby="verify-title">
          <h2 id="verify-title" class="section__title">
            {t('partners.verify.title')}
          </h2>
          <ol class="steps">
            {VERIFY_STEPS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
          <p class="note note--flush">{t('partners.verify.note')}</p>
        </section>
      ) : null}
    </>
  );
}

export function VolunteerPanel() {
  const ghat = useSignal(GHATS[0]?.id ?? '');
  const level = useSignal<Level>('low');
  const note = useSignal('');
  const previewed = useSignal(false);
  return (
    <>
      <section class="section" aria-labelledby="report-title">
        <h2 id="report-title" class="section__title">
          {t('partners.report.title')}
        </h2>
        <div class="field field--flush">
          <label for="report-ghat">{t('partners.report.ghat')}</label>
          <select
            id="report-ghat"
            value={ghat.value}
            onChange={(event) => {
              ghat.value = event.currentTarget.value;
            }}
          >
            {GHATS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <ChipGroup
          legend="partners.report.level"
          options={LEVELS}
          selected={level.value}
          onSelect={(value) => {
            level.value = value;
          }}
        />
        <div class="field field--flush">
          <label for="report-note">{t('partners.report.note.label')}</label>
          <textarea
            id="report-note"
            rows={3}
            maxLength={200}
            value={note.value}
            onInput={(event) => {
              note.value = event.currentTarget.value;
            }}
          />
        </div>
        <div class="actions actions--flush">
          <button
            type="button"
            class="button"
            onClick={() => {
              previewed.value = true;
            }}
          >
            {t('partners.report.send')}
          </button>
        </div>
        {previewed.value ? (
          <p class="notice notice--flush" role="status">
            {t('proto.notSent')}
          </p>
        ) : null}
        <p class="note note--flush">{t('partners.report.note')}</p>
      </section>
      <section class="section" aria-labelledby="shift-title">
        <h2 id="shift-title" class="section__title">
          {t('partners.shift.title')}
        </h2>
        <p class="card__meta">{t('partners.shift.sample')}</p>
        <a class="button button--secondary" href={hrefFor('help')}>
          {t('partners.emergency')}
        </a>
      </section>
    </>
  );
}

export default function PartnersScreen() {
  const role = useSignal<Role>('partner');
  return (
    <>
      <ScreenHeader titleKey="module.partners.title" subtitleKey="module.partners.subtitle" />
      <PrototypeBanner />
      <ChipGroup
        legend="partners.tab.legend"
        options={ROLES}
        selected={role.value}
        onSelect={(value) => {
          role.value = value;
        }}
      />
      {role.value === 'partner' ? <PartnerPanel /> : <VolunteerPanel />}
      <p class="note">{t('proto.notSent')}</p>
    </>
  );
}
