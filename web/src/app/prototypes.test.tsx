import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import GroupScreen, { approveMember, removeMember, SAMPLE_MEMBERS } from '../features/group/Screen';
import HelpScreen from '../features/help/Screen';
import MapScreen from '../features/map/Screen';
import PartnersScreen, { PartnerPanel, VolunteerPanel } from '../features/partners/Screen';
import PassScreen from '../features/pass/Screen';
import ComingSoonScreen from '../features/status/ComingSoonScreen';
import { FLAGS, isEnabled, type FlagName } from '../shared/flags/flags';
import { helplinesResource, helpPointsResource } from '../shared/data/resources';
import { LOCALES, setLocale, t } from '../shared/i18n/i18n';
import { validateName, validatePhone } from '../shared/privacy/validation';
import { accessibilityIssues, countTag } from '../shared/testing/html';
import { ROUTE_IDS } from './router';
import { screenLoader } from './routes';

afterEach(async () => {
  await setLocale('te');
});

const PROTOTYPES = [
  ['pass', PassScreen, 'pilgrimPass'],
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

describe('Pilgrim Pass', () => {
  it('validates a 10-digit Indian mobile number and a bounded name', () => {
    expect(validatePhone('98765 43210')).toBe(true);
    expect(validatePhone('5876543210')).toBe(false);
    expect(validatePhone('987654321')).toBe(false);
    expect(validatePhone('')).toBe(false);
    expect(validateName('  Lakshmi ')).toBe(true);
    expect(validateName('   ')).toBe(false);
    expect(validateName('x'.repeat(61))).toBe(false);
  });

  it('opens on the phone step with no stored or prefilled personal data', () => {
    const html = render(<PassScreen />);
    expect(html).toContain('id="pass-phone"');
    expect(html).not.toContain('id="pass-name"');
    expect(html).not.toMatch(/value="[^"]+"/);
    expect(html).toContain(t('pass.otp.note'));
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

  it('approves only waiting members and never removes the creator', () => {
    const approved = approveMember(SAMPLE_MEMBERS, 'm4');
    expect(approved.find((member) => member.id === 'm4')?.status).toBe('off');
    expect(approveMember(SAMPLE_MEMBERS, 'm2')).toEqual(SAMPLE_MEMBERS);
    expect(removeMember(SAMPLE_MEMBERS, 'me')).toEqual(SAMPLE_MEMBERS);
    expect(removeMember(SAMPLE_MEMBERS, 'm3').map((member) => member.id)).toEqual([
      'me',
      'm2',
      'm4',
    ]);
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
    expect(html).not.toMatch(/<img|tile|openstreetmap/i);
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

  it('shows no helpline numbers until officially verified, and no way to dial', async () => {
    await load();
    const html = render(<HelpScreen />);
    expect(html).toContain(t('help.numbers.pending'));
    expect(html).not.toMatch(/\b(?:100|108|112|1091|1098)\b/);
    expect(html).not.toContain('tel:');
    expect(html).toContain(t('help.kin.note'));
  });
});

describe('Partners and volunteers', () => {
  it('opens on the partner panel and never lists unverified partners', () => {
    const html = render(<PartnersScreen />);
    expect(html).toContain('id="partner-phone"');
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

  it('partner panel starts signed out with no verification claims', () => {
    const html = render(<PartnerPanel />);
    expect(html).not.toContain(t('partners.verify.phone'));
  });
});
