import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import { user } from '../../shared/auth/google';
import { FLAGS } from '../../shared/flags/flags';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { Bi } from '../../shared/ui/Bi';
import { Icon, type IconName } from '../../shared/ui/Icon';

/**
 * Contact us (owner request 2026-11-26): adverts, joining as a partner, suggestions and problems.
 * It builds a mail link only. The person's own email app opens with the message filled in, and
 * nothing is sent until they press Send there. This app never sends, stores or logs what is typed
 * (the fields live in component memory). The address is the one already published on the Privacy
 * screen. Allowed by tests/guards/frontend-privacy.test.ts for mail links only, never dial or text.
 */
export const CONTACT_EMAIL = 'dreamteamtech@zohomail.in';

type Topic = 'ads' | 'partner' | 'suggestion' | 'problem' | 'other';
const TOPICS: readonly { value: Topic; label: MessageKey; icon: IconName }[] = [
  { value: 'ads', label: 'contact.topic.ads', icon: 'megaphone' },
  { value: 'partner', label: 'contact.topic.partner', icon: 'partners' },
  { value: 'suggestion', label: 'contact.topic.suggestion', icon: 'bulb' },
  { value: 'problem', label: 'contact.topic.problem', icon: 'alert' },
  { value: 'other', label: 'contact.topic.other', icon: 'mail' },
];
const TOPIC_LABEL: Readonly<Record<Topic, MessageKey>> = {
  ads: 'contact.topic.ads',
  partner: 'contact.topic.partner',
  suggestion: 'contact.topic.suggestion',
  problem: 'contact.topic.problem',
  other: 'contact.topic.other',
};

export const DETAILS_MAX = 1000;
const NAME_MAX = 60;

/** An Indian mobile number as 10 digits, '' for none, or null when it is not one. */
export function cleanPhone(raw: string): string | null {
  const digits = raw
    .replaceAll(/[\s()-]/g, '')
    .replace(/^(?:\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, '');
  if (digits === '') return '';
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** The mail link for these details. Every part is encoded; nothing else is added. */
export function contactMailto(input: {
  readonly topic: string;
  readonly name: string;
  readonly phone: string;
  readonly details: string;
  readonly labels: {
    readonly subject: string;
    readonly topic: string;
    readonly name: string;
    readonly phone: string;
    readonly details: string;
  };
}): string {
  const { labels } = input;
  const lines = [
    `${labels.topic}: ${input.topic}`,
    `${labels.name}: ${input.name.trim()}`,
    `${labels.phone}: ${input.phone === '' ? '-' : input.phone}`,
    '',
    `${labels.details}:`,
    input.details.trim(),
  ];
  const subject = encodeURIComponent(labels.subject);
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export function ContactUs() {
  const topic = useSignal<Topic>('suggestion');
  const name = useSignal(user.value?.name ?? '');
  const phone = useSignal('');
  const details = useSignal('');
  const phoneTouched = useSignal(false);

  const cleanedPhone = cleanPhone(phone.value);
  const phoneBad = cleanedPhone === null;
  const ready = details.value.trim() !== '' && !phoneBad;
  const topicText = t(TOPIC_LABEL[topic.value]);
  const href = contactMailto({
    topic: topicText,
    name: name.value,
    phone: cleanedPhone ?? '',
    details: details.value,
    labels: {
      subject: t('contact.subject', { topic: topicText }),
      topic: t('contact.mail.topic'),
      name: t('contact.name'),
      phone: t('contact.phone'),
      details: t('contact.details'),
    },
  });

  return (
    <section class="b-card contact" aria-labelledby="contact-title">
      <div class="b-card__head">
        <span class="b-tile b-tile--saffron">
          <Icon name="mail" size={20} />
        </span>
        <h2 id="contact-title" class="b-card__title">
          {t('contact.title')}
        </h2>
      </div>
      <p class="note">{t('contact.intro')}</p>
      <fieldset class="b-chips">
        <legend class="b-label">{t('contact.topic.legend')}</legend>
        {TOPICS.map((option) => (
          <button
            key={option.value}
            type="button"
            class="choice"
            aria-pressed={topic.value === option.value}
            onClick={() => {
              topic.value = option.value;
            }}
          >
            <Icon name={option.icon} size={18} />
            <Bi k={option.label} />
          </button>
        ))}
      </fieldset>
      {topic.value === 'partner' && FLAGS.partners ? (
        <p class="note">
          {t('contact.partnerApply')} <a href={hrefFor('partners')}>{t('module.partners.title')}</a>
        </p>
      ) : null}
      <div class="field">
        <label for="contact-name">{t('contact.name')}</label>
        <input
          id="contact-name"
          type="text"
          autocomplete="name"
          maxLength={NAME_MAX}
          value={name.value}
          onInput={(event) => {
            name.value = event.currentTarget.value;
          }}
        />
      </div>
      <div class="field">
        <label for="contact-phone">{t('contact.phone')}</label>
        <input
          id="contact-phone"
          type="tel"
          inputMode="tel"
          autocomplete="tel"
          maxLength={16}
          aria-describedby="contact-phone-hint"
          aria-invalid={phoneTouched.value && phoneBad}
          value={phone.value}
          onInput={(event) => {
            phone.value = event.currentTarget.value;
          }}
          onBlur={() => {
            phoneTouched.value = true;
          }}
        />
        <p
          id="contact-phone-hint"
          class={phoneTouched.value && phoneBad ? 'field__error' : 'note note--flush'}
          role={phoneTouched.value && phoneBad ? 'alert' : undefined}
        >
          {t(phoneTouched.value && phoneBad ? 'contact.phone.bad' : 'contact.phone.hint')}
        </p>
      </div>
      <div class="field">
        <label for="contact-details">{t('contact.details')}</label>
        <textarea
          id="contact-details"
          rows={4}
          maxLength={DETAILS_MAX}
          value={details.value}
          onInput={(event) => {
            details.value = event.currentTarget.value;
          }}
        />
      </div>
      <div class="actions">
        {ready ? (
          <a class="button b-button-wide" href={href}>
            <Icon name="mail" size={18} />
            {t('contact.send')}
          </a>
        ) : (
          <button type="button" class="button b-button-wide" disabled>
            <Icon name="mail" size={18} />
            {t('contact.send')}
          </button>
        )}
      </div>
      {ready ? null : <p class="note">{t('contact.needDetails')}</p>}
      <p class="note">{t('contact.noMail', { email: CONTACT_EMAIL })}</p>
      <p class="note">{t('contact.privacy')}</p>
    </section>
  );
}
