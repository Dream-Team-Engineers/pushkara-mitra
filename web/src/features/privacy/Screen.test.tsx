import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCALES, setLocale, t } from '../../shared/i18n/i18n';
import { accessibilityIssues } from '../../shared/testing/html';
import DeleteAccountScreen from '../deleteAccount/Screen';
import PrivacyScreen from './Screen';

afterEach(async () => {
  await setLocale('te');
});

describe.each(LOCALES)('privacy and delete screens in %s', (locale) => {
  it('render with no accessibility issues, a draft notice and the contact address', async () => {
    await setLocale(locale);
    const privacy = render(<PrivacyScreen />);
    expect(accessibilityIssues(privacy)).toEqual([]);
    expect(privacy).toContain(t('privacy.status'));
    expect(privacy).toContain('dreamteamtech@zohomail.in');
    expect(privacy).toContain(t('privacy.child.p'));

    const remove = render(<DeleteAccountScreen />);
    expect(accessibilityIssues(remove)).toEqual([]);
    expect(remove).toContain(t('delete.what'));
    expect(remove).toContain(t('delete.notSignedIn'));
    // Nobody is signed in here, so there is nothing to delete and no delete button.
    expect(remove).not.toContain(t('delete.button'));
  });
});
