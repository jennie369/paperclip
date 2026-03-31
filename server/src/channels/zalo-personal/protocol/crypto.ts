// packages/server/src/channels/zalo-personal/protocol/crypto.ts

import * as crypto from 'crypto';
import * as zlib from 'zlib';

const ZCID_KEY = '3FC4F0D2AB50057BCE0D90D9187A22B1';

/**
 * Generate ZCID for request authentication
 * Key: "3FC4F0D2AB50057BCE0D90D9187A22B1"
 * Data: "{apiType},{imei},{timestamp}"
 * Encrypt with AES-CBC, zero IV → uppercase hex
 */
export function generateZCID(apiType: number, imei: string, timestamp: number): string {
  const data = `${apiType},${imei},${timestamp}`;
  // GoClaw: []byte(ZCID_KEY) = ASCII bytes (32 bytes) → AES-256-CBC
  const key = Buffer.from(ZCID_KEY, 'ascii');
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
  return encrypted.toString('hex').toUpperCase();
}

/**
 * Derive encryption key from ZCID_ext + ZCID
 * MD5(zcid_ext) → split into even/odd chars
 * Extract chars from ZCID (even/odd)
 * Join: even_from_ext + even_from_zcid + reversed_odd_from_zcid
 */
export function deriveEncryptionKey(zcidExt: string, zcid: string): string {
  // GoClaw uses UPPERCASE hex for MD5
  const md5Ext = crypto.createHash('md5').update(zcidExt).digest('hex').toUpperCase();

  const evenFromExt: string[] = [];
  const oddFromExt: string[] = [];
  for (let i = 0; i < md5Ext.length; i++) {
    if (i % 2 === 0) evenFromExt.push(md5Ext[i]);
    else oddFromExt.push(md5Ext[i]);
  }

  const evenFromZcid: string[] = [];
  const oddFromZcid: string[] = [];
  // Process ENTIRE zcid (NOT limited to 32 chars — GoClaw processes full string)
  for (let i = 0; i < zcid.length; i++) {
    if (i % 2 === 0) evenFromZcid.push(zcid[i]);
    else oddFromZcid.push(zcid[i]);
  }

  // GoClaw: joinFirst(evenE, 8) + joinFirst(evenI, 12) + reverseJoin(oddI, 12) = 32 chars
  return evenFromExt.slice(0, 8).join('')
    + evenFromZcid.slice(0, 12).join('')
    + oddFromZcid.reverse().slice(0, 12).join('');
}

/**
 * Encrypt request payload
 * AES-CBC, zero IV → Base64
 */
export function encryptRequest(data: string, key: string): string {
  // GoClaw: []byte(encKey) = ASCII bytes (32 bytes) → AES-256-CBC
  const keyBuf = Buffer.from(key, 'ascii');
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
  return encrypted.toString('base64');
}

/**
 * Generate request signature
 * MD5("zsecure" + type + sorted_params)
 */
export function generateSignature(type: string, params: Record<string, string>): string {
  // GoClaw: "zsecure" + typeStr + sorted VALUES (not key=value pairs)
  const sorted = Object.keys(params).sort().map(k => String(params[k])).join('');
  return crypto.createHash('md5').update(`zsecure${type}${sorted}`).digest('hex');
}

/**
 * Decrypt AES-CBC response (Base64 → AES-CBC decrypt → PKCS7 unpad)
 * Used for getLoginInfo response decryption
 */
export function decryptAESCBC(key: string, data: string): string {
  const ciphertext = Buffer.from(data, 'base64');
  // GoClaw: []byte(enk) = ASCII bytes (32 bytes) → AES-256-CBC
  const keyBuf = Buffer.from(key, 'ascii');
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

/**
 * Generate random hex string (6-12 chars)
 */
export function randomHexString(minLen: number, maxLen: number): string {
  const length = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Build encrypted params for Zalo API (getLoginInfo, getServerInfo)
 */
export function buildEncryptedApiParams(imei: string, language: string, typeStr: string): {
  params: Record<string, string>;
  enk: string;
} {
  const ts = Date.now();
  const zcidExt = randomHexString(6, 12);

  // ZCID
  const zcid = generateZCID(30, imei, ts);

  // Derive encrypt key
  const encKey = deriveEncryptionKey(zcidExt, zcid);

  // Encrypt data
  const data = JSON.stringify({
    computer_name: 'Web',
    imei,
    language,
    ts,
  });
  const encData = encryptRequest(data, encKey);

  const params: Record<string, string> = {
    zcid,
    enc_ver: 'v2',
    zcid_ext: zcidExt,
    params: encData,
    type: '30',
    client_version: '665',
  };

  // Generate signkey
  if (typeStr === 'getserverinfo') {
    params.signkey = generateSignature(typeStr, {
      imei,
      type: '30',
      client_version: '665',
      computer_name: 'Web',
    });
  } else {
    params.signkey = generateSignature(typeStr, params);
  }

  return { params, enk: encKey };
}

/**
 * Decrypt WebSocket message (AES-GCM, non-standard 16-byte nonce)
 * [iv: 16 bytes][aad: 16 bytes][ciphertext: variable]
 */
export function decryptWSMessage(data: Buffer, secretKey: string): Buffer {
  const iv = data.slice(0, 16);
  const aad = data.slice(16, 32);
  const ciphertext = data.slice(32);

  const key = Buffer.from(secretKey, 'base64');

  // Auto-detect AES key size: 16 bytes = AES-128, 32 bytes = AES-256
  const algo = key.length <= 16 ? 'aes-128-gcm' : 'aes-256-gcm';
  const decipher = crypto.createDecipheriv(algo, key, iv);
  decipher.setAAD(aad);

  const authTag = ciphertext.slice(-16);
  const actualCiphertext = ciphertext.slice(0, -16);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(actualCiphertext), decipher.final()]);
  return decrypted;
}

/**
 * Decompress gzipped data
 */
export function decompressGzip(data: Buffer): Buffer {
  return zlib.gunzipSync(data);
}

/**
 * Decrypt envelope from WebSocket
 * encrypt=0: plaintext, 1: base64, 2: AES-GCM+gzip, 3: AES-GCM raw
 */
export function decryptEnvelope(
  envelope: { encrypt: number; data: string; key?: string },
  secretKey: string
): string {
  switch (envelope.encrypt) {
    case 0:
      return envelope.data;
    case 1:
      return Buffer.from(envelope.data, 'base64').toString('utf-8');
    case 2: {
      const raw = Buffer.from(envelope.data, 'base64');
      const decrypted = decryptWSMessage(raw, envelope.key || secretKey);
      const decompressed = decompressGzip(decrypted);
      return decompressed.toString('utf-8');
    }
    case 3: {
      const raw3 = Buffer.from(envelope.data, 'base64');
      const decrypted3 = decryptWSMessage(raw3, envelope.key || secretKey);
      return decrypted3.toString('utf-8');
    }
    default:
      throw new Error(`Unknown encrypt type: ${envelope.encrypt}`);
  }
}

/**
 * Encrypt credentials for DB storage (AES-256-GCM)
 */
export function encryptCredentials(
  data: string,
  masterKey: string
): { encrypted: string; iv: string; tag: string } {
  const key = crypto.scryptSync(masterKey, 'zalo-personal-salt', 32);
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

/**
 * Decrypt credentials from DB
 */
export function decryptCredentials(
  encrypted: string,
  iv: string,
  tag: string,
  masterKey: string
): string {
  const key = crypto.scryptSync(masterKey, 'zalo-personal-salt', 32);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}
