// Makes a VAPID key pair for partner phone notifications (ADR 0020).
// Run:  node scripts/generate-vapid.mjs
// It prints two lines and writes nothing to disk. The PUBLIC key goes in the Worker variable
// VAPID_PUBLIC_KEY (both Workers). The PRIVATE key is a secret for the ADMIN Worker only:
//   npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.admin.toml --env staging
// Never paste the private key into a chat, an issue, a commit or a log.
import { Buffer } from 'node:buffer';
import { webcrypto } from 'node:crypto';

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const jwk = await webcrypto.subtle.exportKey('jwk', pair.privateKey);
const bytes = (text) => Buffer.from(text, 'base64url');
const point = Buffer.concat([Buffer.from([4]), bytes(jwk.x), bytes(jwk.y)]);
console.log('VAPID_PUBLIC_KEY  (public, goes in wrangler vars):');
console.log(point.toString('base64url'));
console.log('VAPID_PRIVATE_KEY (SECRET, admin Worker only, via wrangler secret put):');
console.log(jwk.d);
