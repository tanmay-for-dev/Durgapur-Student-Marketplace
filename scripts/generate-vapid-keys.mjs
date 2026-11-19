// Run locally on your own machine with: node scripts/generate-vapid-keys.mjs
// Do not paste the private key into GitHub, a VITE_ variable, or chat.
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const decode = (s) => Buffer.from(s, 'base64url');
const rawPublic = Buffer.concat([Buffer.from([4]), decode(pub.x), decode(pub.y)]);
console.log('VAPID_PUBLIC_KEY=' + rawPublic.toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + priv.d);
console.log('\nKeep the private key server-side. Use the public key in Vite as VITE_VAPID_PUBLIC_KEY.');
