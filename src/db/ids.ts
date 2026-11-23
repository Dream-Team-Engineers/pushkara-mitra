const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

/** Opaque random id: 128 bits as 26 base32 characters. Never sequential, never derived from a person. */
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32.charAt((value << (5 - bits)) & 31);
  return out;
}

/** SHA-256 hex. Stored in place of session ids, join codes and client request ids. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The group's one join code, the same from creation until the group ends (owner decision 2026-11-23).
 * Derived from the group id with a server secret (HMAC-SHA-256), so it is never stored: D1 keeps only
 * its hash in `invitation`, and any member can be shown it again. Alphabet without look-alikes, about 40 bits.
 */
export async function groupJoinCode(secret: string, groupId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`join-code.v2|${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(groupId)),
  );
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return [...mac.slice(0, 8)].map((b) => alphabet[b % alphabet.length]).join('');
}
