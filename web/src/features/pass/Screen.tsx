import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { BUILD_ID } from '../../shared/build';
import {
  remembered,
  renderGoogleButton,
  signInError,
  signOut,
  user,
} from '../../shared/auth/google';
import { hrefFor } from '../../app/router';
import { FLAGS, isEnabled } from '../../shared/flags/flags';
import { ContactUs } from '../contact/ContactUs';
import { t } from '../../shared/i18n/i18n';
import { Bi } from '../../shared/ui/Bi';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * Me tab: the one place to sign in, with the Google account on the phone (the one used for the Play
 * Store), so there is no password and no OTP. Sign-in exists only where the build has a Google client ID
 * (staging first, flag `googleSignIn`); elsewhere the screen says it is not switched on (ADR 0008, OQ-030).
 * The age and consent choices live in component memory only. The signed-in person lives in memory only.
 */
type Age = 'adult' | 'minor';

/** One menu row (Design B): icon tile, label with an optional second line, chevron. */
function MenuRow({
  href,
  icon,
  label,
  meta,
  tone,
}: {
  readonly href: string;
  readonly icon: IconName;
  readonly label: string;
  readonly meta?: string;
  readonly tone?: 'saffron' | 'danger';
}) {
  return (
    <li>
      <a class={tone === 'danger' ? 'b-row b-row--danger' : 'b-row'} href={href}>
        <span class={tone === undefined ? 'b-tile' : `b-tile b-tile--${tone}`}>
          <Icon name={icon} size={20} />
        </span>
        <span class="b-row__label">
          {label}
          {meta === undefined ? null : <span class="b-row__meta">{meta}</span>}
        </span>
        <span class="b-row__go">
          <Icon name="next" size={18} />
        </span>
      </a>
    </li>
  );
}

/** Partners / Volunteers (when on), privacy, and, once signed in, deleting the account. */
function MeMenu({ signedIn }: { readonly signedIn: boolean }) {
  return (
    <ul class="b-menu b-card" aria-label={t('nav.me')}>
      {FLAGS.partners ? (
        <MenuRow
          href={hrefFor('partners')}
          icon="partners"
          label={t('me.partner.title')}
          meta={t('me.partner.note')}
          tone="saffron"
        />
      ) : null}
      <MenuRow href={hrefFor('privacy')} icon="shield" label={t('account.privacyLink')} />
      {signedIn ? (
        <MenuRow
          href={hrefFor('deleteAccount')}
          icon="trash"
          label={t('account.deleteLink')}
          tone="danger"
        />
      ) : null}
    </ul>
  );
}

/** The signed-in person on a header-coloured card (Design B), with Sign out. */
function SignedIn() {
  const person = user.value;
  if (person === null) return null;
  return (
    <section class="b-profile" aria-labelledby="account-name">
      <span class="b-profile__avatar" aria-hidden="true">
        {person.name === '' ? (
          <Icon name="person" size={22} />
        ) : (
          person.name.slice(0, 1).toUpperCase()
        )}
      </span>
      <div class="b-profile__text">
        <h2 id="account-name" class="b-profile__name">
          {person.name === '' ? t('account.signedIn') : person.name}
        </h2>
        <p class="b-profile__meta">
          {person.email === ''
            ? t(remembered.value ? 'me.profile.remembered' : 'me.profile.session')
            : person.email}
        </p>
      </div>
      <button
        type="button"
        class="b-profile__action"
        onClick={() => {
          void signOut();
        }}
      >
        {t('account.signout')}
      </button>
    </section>
  );
}

export default function MeScreen() {
  const age = useSignal<Age | null>(null);
  const consent = useSignal(false);
  const parent = useSignal(false);
  const loadFailed = useSignal(false);
  const slot = useRef<HTMLDivElement>(null);
  const live = isEnabled('googleSignIn');
  const ready = age.value !== null && consent.value && (age.value === 'adult' || parent.value);
  const signedIn = user.value !== null;

  useEffect(() => {
    if (!live || !ready || signedIn || slot.current === null) return;
    loadFailed.value = false;
    renderGoogleButton(slot.current).catch(() => {
      loadFailed.value = true;
    });
  }, [live, ready, signedIn, loadFailed]);

  if (signedIn) {
    return (
      <>
        <ScreenHeader titleKey="nav.me" />
        <SignedIn />
        <p class="note">
          {remembered.value ? t('account.rememberedNote') : t('account.memoryOnly')}
        </p>
        <MeMenu signedIn />
        <ContactUs />
        <p class="build-id">Build {BUILD_ID}</p>
      </>
    );
  }

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
      <p class="note">{t('proto.consentPending')}</p>
      <div class="actions">
        {live && ready ? (
          <div class="google-slot" ref={slot} />
        ) : (
          <button type="button" class="button google-placeholder" disabled>
            <Icon name="lock" size={16} />
            <Bi k="account.signin" />
          </button>
        )}
      </div>
      {live && !ready ? <p class="note">{t('account.ready')}</p> : null}
      {live ? null : <p class="note">{t('account.pending')}</p>}
      {signInError.value ? (
        <p class="field__error" role="alert">
          {t('account.error')}
        </p>
      ) : null}
      {loadFailed.value ? (
        <p class="field__error" role="alert">
          {t('account.loadFailed')}
        </p>
      ) : null}
      <MeMenu signedIn={false} />
      <ContactUs />
      <p class="build-id">Build {BUILD_ID}</p>
    </>
  );
}
