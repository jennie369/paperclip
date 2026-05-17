// packages/server/src/channels/facebook-web/protocol/crypto.ts
//
// Credentials encryption for FB Web channel — AES-256-GCM with scrypt KDF.
// Port of zalo-personal/protocol/crypto.ts pattern, separate salt for security.
//
// NOTE: FB protocol itself doesn't use AES/HMAC for payload encryption (unlike
// Zalo). FB uses form-encoded fb_dtsg signing (in graphql.ts) + cookies for
// auth. This crypto.ts is ONLY for at-rest encryption of cookies + tokens in
// channel_instances.credentials_encrypted DB column.

import * as crypto from 'crypto';

const SCRYPT_SALT = 'facebook-web-salt';

export function encryptCredentials(
  data: string,
  masterKey: string,
): { encrypted: string; iv: string; tag: string } {
  const key = crypto.scryptSync(masterKey, SCRYPT_SALT, 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptCredentials(
  encrypted: string,
  iv: string,
  tag: string,
  masterKey: string,
): string {
  const key = crypto.scryptSync(masterKey, SCRYPT_SALT, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}
