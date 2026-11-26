import { useSignal } from '@preact/signals';
import {
  distanceM,
  groupConsentRecorded,
  recordGroupConsent,
  sharing,
  startSharing,
  stopSharing,
  type GroupMember,
} from '../../shared/group/groupClient';
import { formatNumber, locale, t } from '../../shared/i18n/i18n';
import { deviceLocation, startDeviceLocation } from '../../shared/location/deviceLocation';
import type { MapPerson } from '../map/LiveMap';

/**
 * Shared pieces of My Group for the Group and Map screens (ADR 0017): member labels and lines, map
 * pins, and the share switch. Positions come from the in-memory live room only.
 */

/** Number of member colours in styles.css (.tone-0 to .tone-5). */
export const MEMBER_TONES = 6;

/** The member's colour: from their per-group handle, so it is the same on every phone in the group. */
export function memberTone(id: string): number {
  let sum = 0;
  for (const char of id) sum = (sum * 31 + char.charCodeAt(0)) % 9973;
  return sum % MEMBER_TONES;
}

/** The round avatar with the member's initial, in their colour. */
export function MemberAvatar({ member }: { readonly member: GroupMember }) {
  return (
    <span class={`member-row__avatar tone-${String(memberTone(member.id))}`} aria-hidden="true">
      {memberLabel(member).slice(0, 1).toUpperCase()}
    </span>
  );
}

/** The member's first name; for the person themselves "Name (you)". */
export function memberLabel(member: GroupMember): string {
  const name = member.name || t('group.live.member');
  if (!member.you) return name;
  return member.name === '' ? t('group.live.you') : t('group.live.youNamed', { name });
}

/** What the member is doing now: offline, not sharing, or sharing with age and distance. */
export function memberLine(member: GroupMember, me: GroupMember | undefined): string {
  if (!member.online) return t('group.live.offline');
  if (member.pos === null) return t('group.live.notSharing');
  const parts = [
    t('group.live.sharing'),
    t('group.live.updated', { s: formatNumber(member.pos.ageS) }),
  ];
  if (!member.you && me?.pos != null) {
    const metres = distanceM(me.pos, member.pos);
    parts.push(
      metres < 1000
        ? t('group.live.awayM', { m: formatNumber(Math.round(metres / 10) * 10) })
        : t('group.live.awayKm', { km: (metres / 1000).toFixed(1) }),
    );
  }
  return parts.join(' · ');
}

/** Members who are sharing, as named map pins. */
export function mapPeople(members: readonly GroupMember[]): readonly MapPerson[] {
  return members.flatMap((member) =>
    member.pos === null
      ? []
      : [
          {
            id: member.id,
            label: memberLabel(member),
            lat: member.pos.lat,
            lng: member.pos.lng,
            you: member.you,
            tone: memberTone(member.id),
          },
        ],
  );
}

/** Group Owner first, then you, then online before offline, then by name. */
export function ordered(members: readonly GroupMember[]): readonly GroupMember[] {
  const rank = (member: GroupMember) => (member.role === 'owner' ? 0 : member.you ? 1 : 2);
  return [...members].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      Number(b.online) - Number(a.online) ||
      memberLabel(a).localeCompare(memberLabel(b)),
  );
}

/**
 * The share switch with its one-time consent line. Sharing starts off each time a screen opens and
 * stops when the screen closes (the live room is left).
 */
export function ShareControl({ id }: { readonly id: string }) {
  const agreed = useSignal(false);
  const busy = useSignal(false);
  const failed = useSignal(false);
  const location = deviceLocation.value;
  const recorded = groupConsentRecorded.value;
  const noteId = `${id}-note`;

  return (
    <>
      {recorded ? null : (
        <label class="consent-line">
          <input
            type="checkbox"
            checked={agreed.value}
            onChange={(event) => {
              agreed.value = event.currentTarget.checked;
            }}
          />
          <span>{t('group.live.consent')}</span>
        </label>
      )}
      <div class="share-row">
        <button
          type="button"
          class="switch"
          role="switch"
          aria-checked={sharing.value}
          aria-describedby={noteId}
          disabled={busy.value || (!recorded && !agreed.value)}
          onClick={() => {
            if (sharing.value) {
              stopSharing();
              return;
            }
            busy.value = true;
            failed.value = false;
            void (async () => {
              try {
                if (!groupConsentRecorded.value) {
                  if (!(await recordGroupConsent(locale.value))) {
                    failed.value = true;
                    return;
                  }
                  groupConsentRecorded.value = true;
                }
                startDeviceLocation();
                startSharing();
              } catch {
                failed.value = true;
              } finally {
                busy.value = false;
              }
            })();
          }}
        >
          <span class="switch__knob" aria-hidden="true" />
          <span class="visually-hidden">{t('group.share.title')}</span>
        </button>
        <span>{t(sharing.value ? 'group.live.sharingOn' : 'group.live.sharingOff')}</span>
      </div>
      {sharing.value && location.status === 'off' ? (
        <p id={noteId} class="group-panel__hint group-panel__hint--alert">
          {t(`map.locate.${location.reason}`)}
        </p>
      ) : (
        <p id={noteId} class="group-panel__hint">
          {t('group.live.shareNote')}
        </p>
      )}
      {failed.value ? (
        <p class="notice" role="alert">
          {t('group.live.error')}
        </p>
      ) : null}
    </>
  );
}
