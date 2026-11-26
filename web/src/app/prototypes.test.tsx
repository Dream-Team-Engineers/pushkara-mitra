import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import GroupScreen, {
  addMember,
  approveMember,
  removeMember,
  SAMPLE_MEMBERS,
} from '../features/group/Screen';
import HelpScreen from '../features/help/Screen';
import MapScreen from '../features/map/Screen';
import PartnersScreen, { PartnerPanel, VolunteerPanel } from '../features/partners/Screen';
import PassScreen from '../features/pass/Screen';
import ComingSoonScreen from '../features/status/ComingSoonScreen';
import { FLAGS, isEnabled, type FlagName } from '../shared/flags/flags';
import { HELPLINES, type HelplineFixture } from '../shared/data/fixtures';
import { HelplineList, dialTarget } from '../features/help/HelplineList';
import { helplinesResource, helpPointsResource } from '../shared/data/resources';
import { LOCALES, setLocale, t } from '../shared/i18n/i18n';
import { validateName } from '../shared/privacy/validation';
import { accessibilityIssues, countTag } from '../shared/testing/html';
import { ROUTE_IDS } from './router';
import { screenLoader } from './routes';

afterEach(async () => {
  await setLocale('te');
});

const PROTOTYPES = [
  ['pass', PassScreen, 'googleSignIn'],
  ['group', GroupScreen, 'myGroup'],
  ['map', MapScreen, 'liveMap'],
  ['help', HelpScreen, 'sosDispatch'],
  ['partners', PartnersScreen, 'partnerContact'],
] as const satisfies readonly (readonly [string, () => unknown, FlagName])[];

async function load(): Promise<void> {
  await Promise.all([helplinesResource.refresh(), helpPointsResource.refresh()]);
}

describe('prototype screens', () => {
  it.each(PROTOTYPES)(
    '%s stays an inert prototype while its flag is off',
    (_name, _Screen, flag) => {
      expect(FLAGS[flag]).toBe(false);
      expect(isEnabled(flag)).toBe(false);
    },
  );

  it.each(LOCALES)('all five render accessibly with the prototype banner in %s', async (code) => {
    await setLocale(code);
    await load();
    for (const [name, Screen] of PROTOTYPES) {
      const html = render(<Screen />);
      expect(countTag(html, 'h1'), name).toBe(1);
      expect(accessibilityIssues(html), name).toEqual([]);
      expect(html, name).toContain(t('app.prototypeBanner'));
      expect(html, name).not.toMatch(/<form|type="file"|capture=|href="(?:tel|sms|mailto):/);
    }
  });

  it('every one of the twelve routes now has a real screen', async () => {
    const placeholder = ComingSoonScreen;
    for (const id of ROUTE_IDS) {
      expect((await screenLoader(id)()).default, id).not.toBe(placeholder);
    }
  });
});

describe('Me tab', () => {
  it('validates a bounded name', () => {
    expect(validateName('  Lakshmi ')).toBe(true);
    expect(validateName('   ')).toBe(false);
    expect(validateName('x'.repeat(61))).toBe(false);
  });

  it('offers Google sign-in only, with no phone, OTP or pass creation, and it is off', () => {
    const html = render(<PassScreen />);
    expect(html).toContain(t('account.intro'));
    expect(html).toContain(t('account.age.adult'));
    expect(html).toContain(t('account.age.minor'));
    expect(html).toContain(t('account.pending'));
    // Sign-in never asks for a phone. The only number field is in "Contact us" (owner request
    // 2026-11-26), which goes into the person's own email and is never sent by the app: no form.
    const [signIn = '', contact = ''] = html.split('<section class="section contact"');
    expect(signIn).not.toContain('type="tel"');
    expect(contact).toContain('id="contact-phone"');
    expect(contact).not.toMatch(/<form\b/i);
    expect(html).not.toMatch(/OTP (login|send)|id="pass-/i);
    expect(html).not.toMatch(/value="[^"]+"/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
  });
});

describe('My Group', () => {
  it('keeps location sharing off and disabled, with a reason', () => {
    const html = render(<GroupScreen />);
    expect(html).toMatch(
      /role="switch"[^>]*aria-checked="false"|aria-checked="false"[^>]*role="switch"/,
    );
    expect(html).toContain('disabled');
    expect(html).toContain(t('group.share.disabled'));
    expect(html).not.toContain('aria-checked="true"');
  });

  it('starts with the person plus two members', () => {
    expect(SAMPLE_MEMBERS.map((member) => member.id)).toEqual(['me', 'm2', 'm3']);
  });

  it('approves only waiting members and never removes the creator', () => {
    const waiting = [
      ...SAMPLE_MEMBERS,
      { id: 'm4', name: '[Member 4]', status: 'waiting' as const },
    ];
    expect(approveMember(waiting, 'm4').find((member) => member.id === 'm4')?.status).toBe('off');
    expect(approveMember(SAMPLE_MEMBERS, 'm2')).toEqual(SAMPLE_MEMBERS);
    expect(removeMember(SAMPLE_MEMBERS, 'me')).toEqual(SAMPLE_MEMBERS);
    expect(removeMember(SAMPLE_MEMBERS, 'm3').map((member) => member.id)).toEqual(['me', 'm2']);
  });

  it('adds members, and keeps one person in one group', () => {
    const added = addMember(SAMPLE_MEMBERS, '  Lakshmi   Devi ', 'm4');
    expect(added.ok && added.members.map((member) => member.name)).toContain('Lakshmi Devi');
    if (!added.ok) throw new Error('expected ok');
    expect(addMember(added.members, 'lakshmi devi', 'm5')).toEqual({
      ok: false,
      error: 'duplicate',
    });
    expect(addMember(added.members, '   ', 'm5')).toEqual({ ok: false, error: 'empty' });
    expect(removeMember(added.members, 'm4').length).toBe(SAMPLE_MEMBERS.length);
    let full = SAMPLE_MEMBERS;
    for (let index = 0; index < 20; index += 1) {
      const next = addMember(full, 'P' + String(index), 'x' + String(index));
      if (next.ok) full = next.members;
      else expect(next.error).toBe('full');
    }
    expect(full.length).toBe(10);
  });
});

describe('Maps', () => {
  it('describes the picture in text, says sharing is off and names no real place data', () => {
    const html = render(<MapScreen />);
    expect(html).toContain('role="img"');
    expect(html).toContain(t('map.alt'));
    expect(html).toContain(t('map.sharing.off'));
    expect(html).toContain(t('map.noHistory'));
    expect(html).toContain(t('map.legend.live'));
    expect(html).toContain(t('map.legend.stale'));
    expect(html).not.toMatch(/<img|tile/i);
    // The only outside reference is a plain link to OpenStreetMap search, opened in a new tab.
    expect(html).toContain('href="https://www.openstreetmap.org/search?query=');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('Emergency / Help', () => {
  it('has an inert SOS control and says the app dispatches no one', async () => {
    await load();
    const html = render(<HelpScreen />);
    expect(html).toMatch(
      /<button[^>]*class="sos__button"[^>]*disabled|<button[^>]*disabled[^>]*class="sos__button"/,
    );
    expect(html).toContain(t('help.sos.inactive'));
    expect(html).toContain(t('module.help.noDispatch'));
  });

  it('shows the approved numbers, marks owner-supplied ones unverified, and never dials by itself', async () => {
    await load();
    const html = render(<HelpScreen />);
    for (const number of ['112', '100', '101', '102', '108', '1073', '181', '1091', '1098', '1363'])
      expect(html).toContain(number);
    expect(html).toContain(t('state.unverified'));
    expect(html).not.toContain('1800-123-2027');
    expect(html).not.toContain('0883-1234567');
    expect(html).not.toContain('tel:');
    expect(html).not.toContain('call-confirm');
    const calls = html.match(/<button[^>]*helpline__call[^>]*>/g) ?? [];
    expect(calls).toHaveLength(12);
    for (const call of calls) expect(call).toContain('aria-haspopup="dialog"');
    expect(html).toContain(t('help.kin.note'));
  });

  it('a line without a number says so and its button is disabled', () => {
    const html = render(<HelplineList lines={HELPLINES} />);
    expect(html).toContain(t('help.numbers.unavailable'));
    expect(html).not.toMatch(/\b(?:100|108|112|181|1091|1098|1363)\b/);
    expect(html).not.toContain('tel:');
    const calls = html.match(/<button[^>]*helpline__call[^>]*>/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toContain('disabled');
  });

  it('a verified number needs a confirmation tap: no dial link until then', () => {
    const line = { ...HELPLINES[0], number: '112' } as HelplineFixture;
    const html = render(<HelplineList lines={[line]} />);
    expect(html).toContain('<button');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('112');
    expect(html).not.toContain('tel:');
    expect(html).not.toContain('call-confirm');
    expect(dialTarget('+91 112-3')).toBe('+911123');
    expect(dialTarget('tel:1;x')).toBe('1');
  });
});

describe('Partners and volunteers', () => {
  it('opens on the partner panel and never lists unverified partners', () => {
    const html = render(<PartnersScreen />);
    expect(html).toContain('id="partner-name"');
    expect(html).not.toContain('partner-phone');
    expect(html).toContain(t('account.signin'));
    expect(html).not.toContain('id="report-ghat"');
    expect(accessibilityIssues(html)).toEqual([]);
  });

  it('volunteer reports are labelled as going to staff review and as not sent', () => {
    const html = render(<VolunteerPanel />);
    expect(html).toContain(t('partners.report.note'));
    expect(html).toContain('id="report-ghat"');
    expect(html).toContain(t('partners.report.send'));
    expect(accessibilityIssues(html)).toEqual([]);
  });

  it('partner panel makes no verification claims and has no OTP', () => {
    const html = render(<PartnerPanel />);
    expect(html).not.toMatch(/OTP|type="tel"/);
    expect(html).toContain(t('partners.verify.note'));
  });
});
