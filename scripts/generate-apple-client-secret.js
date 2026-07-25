#!/usr/bin/env node
// Generates a Sign in with Apple client secret (JWT) for Supabase's Auth
// provider config. Run locally — the .p8 private key file never leaves
// this machine or gets pasted into chat.
//
// Usage:
//   node scripts/generate-apple-client-secret.js <path-to-AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>

const fs = require('fs');
const crypto = require('crypto');

const [, , keyPath, teamId, keyId, servicesId] = process.argv;

if (!keyPath || !teamId || !keyId || !servicesId) {
  console.error(
    'Usage: node scripts/generate-apple-client-secret.js <path-to-AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>',
  );
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, 'utf8');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const now = Math.floor(Date.now() / 1000);
const maxLifetime = 15777000; // ~6 months, Apple's maximum allowed

const header = { alg: 'ES256', kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + maxLifetime,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

const signature = crypto.sign('sha256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

console.log(`${signingInput}.${base64url(signature)}`);
