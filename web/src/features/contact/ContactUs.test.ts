import { describe, expect, it } from 'vitest';
import { cleanPhone, CONTACT_EMAIL, contactMailto } from './ContactUs';

describe('contact us', () => {
  it('accepts an empty number or a 10-digit Indian mobile, with or without +91', () => {
    expect(cleanPhone('')).toBe('');
    expect(cleanPhone('  ')).toBe('');
    expect(cleanPhone('98480 12345')).toBe('9848012345');
    expect(cleanPhone('+91 98480-12345')).toBe('9848012345');
    expect(cleanPhone('09848012345')).toBe('9848012345');
    expect(cleanPhone('12345')).toBeNull();
    expect(cleanPhone('1234567890')).toBeNull();
    expect(cleanPhone('98480abcde')).toBeNull();
  });

  it('builds an encoded mail link to the published address and nothing else', () => {
    const href = contactMailto({
      topic: 'Advertise with us',
      name: ' Asha & Co ',
      phone: '9848012345',
      details: 'Banner?\nsubject=evil&cc=x@y.z',
      labels: {
        subject: 'Pushkara Mitra: Advertise with us',
        topic: 'Topic',
        name: 'Your name',
        phone: 'Contact number',
        details: 'Details',
      },
    });
    expect(href.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get('subject')).toBe('Pushkara Mitra: Advertise with us');
    expect(url.searchParams.get('cc')).toBeNull();
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('Your name: Asha & Co');
    expect(body).toContain('Contact number: 9848012345');
    expect(body).toContain('subject=evil&cc=x@y.z');
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
  });
});
