// packages/server/src/channels/zalo-personal/protocol/send.ts
// Send messages via Zalo HTTP API — matches GoClaw's encryptPayload approach

import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ZaloSession, ZALO_API } from './message.js';
import { ZaloListener } from './listener.js';

/**
 * Decrypt response with session SecretKey (zpw_enk from getLoginInfo).
 * Reverse of encryptPayload.
 */
function decryptResponse(session: ZaloSession, data: string): string {
  const key = Buffer.from(session.loginInfo.zpw_enk, 'base64');
  const iv = Buffer.alloc(16, 0);
  const ciphertext = Buffer.from(data, 'base64');

  const decipher = crypto.createDecipheriv(
    key.length <= 16 ? 'aes-128-cbc' : 'aes-256-cbc',
    key,
    iv
  );
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

/**
 * Encrypt payload with session SecretKey (zpw_enk from getLoginInfo).
 * GoClaw: base64.decode(sess.SecretKey) → AES-CBC encrypt → base64 output
 * NOT the same as ZCID-based encryption used for getLoginInfo API.
 */
function encryptPayload(session: ZaloSession, data: Record<string, any>): string {
  // zca-js (canonical Zalo client) JSON.stringify-s directly without \uXXXX
  // escape \u2014 Zalo server decodes UTF-8 JSON cleanly. The previous code
  // escaped all non-ASCII chars to \uXXXX which works for the `message`
  // field of /api/message/sms but causes `desc` in /photo_original/send to
  // render as `?` on the recipient's Zalo Desktop (incident 2026-05-01).
  // Pass raw UTF-8 JSON; AES-CBC encrypt over UTF-8 bytes.
  const payload = JSON.stringify(data);
  const key = Buffer.from(session.loginInfo.zpw_enk, 'base64');
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv(
    key.length <= 16 ? 'aes-128-cbc' : 'aes-256-cbc',
    key,
    iv
  );
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf-8'), cipher.final()]);
  return encrypted.toString('base64');
}

/**
 * Build URL with standard Zalo params (zpw_ver, zpw_type, nretry)
 * GoClaw: makeURL(sess, baseURL+apiPath, {nretry: 0}, true)
 */
function buildSendURL(baseUrl: string, apiPath: string): string {
  const url = new URL(baseUrl + apiPath);
  url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
  url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));
  url.searchParams.set('nretry', '0');
  return url.toString();
}

/**
 * Build cookie header with zpw_sek = zpw_enk from getLoginInfo
 */
function buildCookieHeader(session: ZaloSession): string {
  // Send ALL cookies including original zpw_sek from checksession
  return session.cookies
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Send DM text message
 */
export async function sendDMText(
  session: ZaloSession,
  recipientUid: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const chatUrl = session.loginInfo.zpw_service_map_v3.chat[0];

  if (!session.loginInfo?.zpw_enk) {
    return { success: false, error: 'No zpw_enk — session not authenticated' };
  }

  const chunks: string[] = [];
  for (let i = 0; i < message.length; i += ZALO_API.MAX_MESSAGE_LENGTH) {
    chunks.push(message.slice(i, i + ZALO_API.MAX_MESSAGE_LENGTH));
  }

  let lastResult: any;
  for (const chunk of chunks) {
    const data = {
      message: chunk,
      toid: recipientUid,
      clientId: Date.now(),
      ttl: 0,
      imei: session.imei,
    };

    // Encrypt with session key (NOT ZCID)
    const encData = encryptPayload(session, data);

    // URL with just zpw_ver, zpw_type, nretry (NO zcid, NO signkey)
    const url = buildSendURL(chatUrl, '/api/message/sms');

    // Body: just params=<encrypted>
    const body = new URLSearchParams({ params: encData }).toString();

    const cookies = buildCookieHeader(session);

    try {
      console.log(`[ZaloSend] POST ${url.split('?')[0]} → to=${recipientUid} msg="${chunk.substring(0, 50)}"`);
      console.log(`[ZaloSend] zpw_enk: ${session.loginInfo.zpw_enk.substring(0, 20)}...`);

      const res = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': session.userAgent,
          'Cookie': cookies,
          'Origin': 'https://chat.zalo.me',
          'Referer': 'https://chat.zalo.me/',
        },
        timeout: 30_000,
      });
      lastResult = res.data;
      console.log(`[ZaloSend] Response:`, JSON.stringify(lastResult).substring(0, 200));

      // Decrypt the response data if successful
      if (lastResult?.error_code === 0 && typeof lastResult?.data === 'string') {
        try {
          const decrypted = decryptResponse(session, lastResult.data);
          console.log(`[ZaloSend] Decrypted:`, decrypted.substring(0, 200));
          try { fs.appendFileSync('C:/tmp/zalo-debug.log', `[${new Date().toISOString()}] Decrypted: ${decrypted}\n`); } catch {}
          lastResult.decryptedData = JSON.parse(decrypted);
        } catch (decryptErr: any) {
          console.warn(`[ZaloSend] Failed to decrypt response:`, decryptErr.message);
        }
      }
    } catch (err: any) {
      console.error(`[ZaloSend] Error:`, err.message);
      console.log('[ZaloSend] sendDMFile error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.error_message || err.message };
    }
  }

  return {
    success: lastResult?.error_code === 0,
    messageId: lastResult?.decryptedData?.msgId || lastResult?.data?.msgId,
    error: lastResult?.error_code !== 0 ? lastResult?.error_message : undefined,
  };
}

/**
 * Send group text message
 */
export async function sendGroupText(
  session: ZaloSession,
  groupId: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const groupUrl = session.loginInfo.zpw_service_map_v3.group[0];

  if (!session.loginInfo?.zpw_enk) {
    return { success: false, error: 'No zpw_enk — session not authenticated' };
  }

  const chunks: string[] = [];
  for (let i = 0; i < message.length; i += ZALO_API.MAX_MESSAGE_LENGTH) {
    chunks.push(message.slice(i, i + ZALO_API.MAX_MESSAGE_LENGTH));
  }

  let lastResult: any;
  for (const chunk of chunks) {
    const data = {
      message: chunk,
      grid: groupId,
      clientId: Date.now(),
      ttl: 0,
      visibility: 0,
    };

    const encData = encryptPayload(session, data);
    const url = buildSendURL(groupUrl, '/api/group/sendmsg');
    const body = new URLSearchParams({ params: encData }).toString();
    const cookies = buildCookieHeader(session);

    try {
      const res = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': session.userAgent,
          'Cookie': cookies,
          'Origin': 'https://chat.zalo.me',
          'Referer': 'https://chat.zalo.me/',
        },
        timeout: 30_000,
      });
      lastResult = res.data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return {
    success: lastResult?.error_code === 0,
    messageId: lastResult?.data?.msgId,
    error: lastResult?.error_code !== 0 ? lastResult?.error_message : undefined,
  };
}

/**
 * Send typing indicator
 */
export async function sendTyping(
  session: ZaloSession,
  recipientId: string,
  isGroup: boolean
): Promise<void> {
  const serviceUrl = isGroup
    ? session.loginInfo.zpw_service_map_v3.group[0]
    : session.loginInfo.zpw_service_map_v3.chat[0];

  const endpoint = isGroup ? '/api/group/typing' : '/api/message/typing';
  const data = isGroup
    ? { grid: recipientId, imei: session.imei }
    : { toid: recipientId, imei: session.imei };

  const encData = encryptPayload(session, data);
  const url = buildSendURL(serviceUrl, endpoint);
  const body = new URLSearchParams({ params: encData }).toString();

  await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': session.userAgent,
      'Cookie': buildCookieHeader(session),
      'Origin': 'https://chat.zalo.me',
      'Referer': 'https://chat.zalo.me/',
    },
    timeout: 10_000,
  }).catch(() => {});
}

/**
 * Read image dimensions and total size — needed for step 2 (photo_original/send)
 * which requires width/height/hdSize in the encrypted msg metadata.
 */
async function readImageMeta(filePath: string): Promise<{ width: number; height: number; totalSize: number }> {
  const stat = fs.statSync(filePath);
  const meta = await sharp(filePath).metadata();
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    totalSize: stat.size,
  };
}

/**
 * Upload an image to Zalo's CDN.
 *
 * Step 1 of the 2-step image-send protocol (zca-js photo_original flow):
 *   POST {file_service}/api/message/photo_original/upload?type=2&params=<AES(metadata)>
 *   Body: multipart with `chunkContent` field (NOT `fileContent`)
 *
 * Returns the photo metadata needed by step 2 (sendDMImage) to actually
 * create the chat message: photoId, normalUrl, hdUrl, thumbUrl, clientFileId.
 *
 * NOTE: error_code:0 here only means CDN upload succeeded — the recipient does
 * NOT see the photo until step 2 (photo_original/send) creates the chat message.
 */
export async function uploadImage(
  session: ZaloSession,
  filePath: string,
  recipientId: string,
  isGroup: boolean
): Promise<{
  success: boolean;
  photoId?: string;
  normalUrl?: string;
  hdUrl?: string;
  thumbUrl?: string;
  clientFileId?: string;
  width?: number;
  height?: number;
  totalSize?: number;
  error?: string;
}> {
  const fileServiceUrl = session.loginInfo.zpw_service_map_v3.file?.[0];
  if (!fileServiceUrl) {
    return { success: false, error: 'No file service URL in session' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const { width, height, totalSize } = await readImageMeta(filePath);
  if (totalSize > ZALO_API.MAX_FILE_SIZE) {
    return { success: false, error: `File too large: ${totalSize} > ${ZALO_API.MAX_FILE_SIZE}` };
  }

  const fileName = path.basename(filePath);
  const clientId = String(Date.now());

  const paramsObj: Record<string, any> = {
    totalChunk: 1,
    fileName,
    clientId,
    totalSize,
    imei: (session as any).imei || (session as any).deviceId || 'paperclip-imei',
    isE2EE: 0,
    jxl: 0,
    chunkId: 1,
  };
  if (isGroup) paramsObj.grid = recipientId;
  else paramsObj.toid = recipientId;

  const encParams = encryptPayload(session, paramsObj);
  const typeParam = isGroup ? '11' : '2';
  const baseEndpoint = `${fileServiceUrl}/api/${isGroup ? 'group' : 'message'}/photo_original/upload`;
  const url = new URL(baseEndpoint);
  // zpw_ver / zpw_type are mandatory on every Zalo file/chat endpoint —
  // server returns "zpw_type bị thiếu hoặc không đúng" without them.
  url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
  url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));
  url.searchParams.set('type', typeParam);
  url.searchParams.set('params', encParams);
  const uploadUrl = url.toString();

  const FD = (await import('form-data')).default;
  const form = new FD();
  form.append('chunkContent', fs.createReadStream(filePath), {
    filename: fileName,
    contentType: 'application/octet-stream',
  });

  try {
    console.log(`[ZaloSend] uploadImage step1: ${fileName} (${totalSize} bytes, ${width}x${height}) → ${baseEndpoint}`);

    const res = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': session.userAgent,
        'Cookie': buildCookieHeader(session),
        'Origin': 'https://chat.zalo.me',
        'Referer': 'https://chat.zalo.me/',
      },
      timeout: 60_000,
      maxContentLength: ZALO_API.MAX_FILE_SIZE,
    });

    if (res.data?.error_code !== 0) {
      return {
        success: false,
        error: res.data?.error_message || `Upload failed (code: ${res.data?.error_code})`,
      };
    }

    // Decrypt the encrypted blob. The decrypted payload wraps the actual
    // photo metadata: { error_code, error_message, data: { photoId, normalUrl,
    // hdUrl, thumbUrl, finished, clientFileId, ... } }
    let decrypted: any = null;
    if (typeof res.data?.data === 'string') {
      try {
        decrypted = JSON.parse(decryptResponse(session, res.data.data));
      } catch (err: any) {
        return { success: false, error: `Failed to decrypt upload response: ${err.message}` };
      }
    } else if (res.data?.data && typeof res.data.data === 'object') {
      decrypted = res.data.data;
    }

    console.log(`[ZaloSend] uploadImage step1 decrypted:`, JSON.stringify(decrypted).substring(0, 300));

    // Inner data field has the photo metadata. Sometimes Zalo nests one level
    // (decrypted.data.photoId), sometimes flat (decrypted.photoId) — handle both.
    const inner = decrypted?.data && typeof decrypted.data === 'object' ? decrypted.data : decrypted;
    if (!inner?.photoId || inner.photoId === '-1') {
      return { success: false, error: `Upload returned no photoId (resData=${JSON.stringify(decrypted)?.substring(0, 200)})` };
    }

    return {
      success: true,
      photoId: String(inner.photoId),
      normalUrl: inner.normalUrl,
      hdUrl: inner.hdUrl,
      thumbUrl: inner.thumbUrl,
      clientFileId: inner.clientFileId ? String(inner.clientFileId) : undefined,
      width,
      height,
      totalSize,
    };
  } catch (err: any) {
    console.error(`[ZaloSend] uploadImage error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Step 2 of image-send: create the chat message attaching the uploaded photo.
 *
 * POST {file_service}/api/message/photo_original/send?nretry=0
 * Body: form-encoded `params=<AES(msg metadata)>`
 *
 * The metadata references the photoId returned by step 1 + the urls + dims +
 * a fresh clientId. `desc` is the customer-facing caption rendered under the
 * photo (use empty string when the surrounding agent reply already explains it).
 */
async function sendUploadedPhoto(
  session: ZaloSession,
  recipientId: string,
  isGroup: boolean,
  uploaded: {
    photoId: string;
    normalUrl?: string;
    hdUrl?: string;
    thumbUrl?: string;
    width?: number;
    height?: number;
    totalSize?: number;
  },
  desc: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fileServiceUrl = session.loginInfo.zpw_service_map_v3.file?.[0];
  if (!fileServiceUrl) return { success: false, error: 'No file service URL' };

  const clientId = String(Date.now());
  const msgParams: Record<string, any> = {
    photoId: uploaded.photoId,
    clientId,
    desc,
    width: uploaded.width || 0,
    height: uploaded.height || 0,
    rawUrl: uploaded.normalUrl,
    hdUrl: uploaded.hdUrl,
    thumbUrl: uploaded.thumbUrl,
    hdSize: String(uploaded.totalSize || 0),
    zsource: -1,
    ttl: 0,
    jcp: '{"convertible":"jxl"}',
  };
  if (isGroup) {
    msgParams.grid = String(recipientId);
    msgParams.oriUrl = uploaded.normalUrl;
  } else {
    msgParams.toid = String(recipientId);
    msgParams.normalUrl = uploaded.normalUrl;
  }

  const encParams = encryptPayload(session, msgParams);
  const url = new URL(`${fileServiceUrl}/api/${isGroup ? 'group' : 'message'}/photo_original/send`);
  url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
  url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));
  url.searchParams.set('nretry', '0');
  const body = new URLSearchParams({ params: encParams }).toString();

  try {
    console.log(`[ZaloSend] sendUploadedPhoto step2: photoId=${uploaded.photoId} → ${url.pathname}`);
    const res = await axios.post(url.toString(), body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': session.userAgent,
        'Cookie': buildCookieHeader(session),
        'Origin': 'https://chat.zalo.me',
        'Referer': 'https://chat.zalo.me/',
      },
      timeout: 30_000,
    });

    if (res.data?.error_code !== 0) {
      return { success: false, error: res.data?.error_message || `step2 failed (code: ${res.data?.error_code})` };
    }

    let msgId: string | undefined;
    if (typeof res.data?.data === 'string') {
      try {
        const dec = JSON.parse(decryptResponse(session, res.data.data));
        msgId = dec?.msgId ? String(dec.msgId) : undefined;
        console.log(`[ZaloSend] sendUploadedPhoto step2 OK: msgId=${msgId}`);
      } catch {
        // ok — server still returned error_code:0 even if decrypt failed
      }
    }
    return { success: true, messageId: msgId };
  } catch (err: any) {
    console.error(`[ZaloSend] sendUploadedPhoto error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send an image to a DM thread via the proper 2-step photo_original protocol.
 *
 * `caption` becomes the photo `desc` (customer-facing overlay caption). Pass
 * empty / undefined when the surrounding agent reply already explains it —
 * DO NOT pass the media-library item description, that is LLM meta info.
 */
export async function sendDMImage(
  session: ZaloSession,
  recipientId: string,
  filePath: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, recipientId, false);

  const upload = await uploadImage(session, filePath, recipientId, false);
  if (!upload.success || !upload.photoId) {
    return { success: false, error: upload.error || 'Upload step failed' };
  }

  return sendUploadedPhoto(session, recipientId, false, {
    photoId: upload.photoId,
    normalUrl: upload.normalUrl,
    hdUrl: upload.hdUrl,
    thumbUrl: upload.thumbUrl,
    width: upload.width,
    height: upload.height,
    totalSize: upload.totalSize,
  }, caption || '');
}

/**
 * Send an image to a group thread (same 2-step flow, group endpoints).
 */
export async function sendGroupImage(
  session: ZaloSession,
  groupId: string,
  filePath: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, groupId, true);

  const upload = await uploadImage(session, filePath, groupId, true);
  if (!upload.success || !upload.photoId) {
    return { success: false, error: upload.error || 'Upload step failed' };
  }

  return sendUploadedPhoto(session, groupId, true, {
    photoId: upload.photoId,
    normalUrl: upload.normalUrl,
    hdUrl: upload.hdUrl,
    thumbUrl: upload.thumbUrl,
    width: upload.width,
    height: upload.height,
    totalSize: upload.totalSize,
  }, caption || '');
}

// ─── File / PDF / Video upload (reverse engineered from zca-js) ──────────────

/**
 * Determine Zalo "file kind" from the filename extension.
 *
 * Zalo Web client splits attachments into 3 lanes:
 *   - photo  → photo_original/upload  (image type=2)
 *   - video  → asyncfile/upload       (video, fType=1)
 *   - others → asyncfile/upload       (file, fType=1)
 *
 * For our purposes (PDF/doc/video) we always use the asyncfile lane.
 */
function detectFileKind(filename: string): 'image' | 'video' | 'others' {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return 'video';
  return 'others';
}

/**
 * Upload a non-image file (PDF / doc / video) to Zalo via the asyncfile/upload
 * endpoint, then send a message that references the uploaded file.
 *
 * Reverse-engineered from zca-js (RFS-ADRENO/zca-js) — single-chunk only for
 * the first iteration. Multi-chunk support needed for files > ~5 MB.
 *
 * EXPERIMENTAL: Zalo's encrypted params + chunked protocol changes regularly.
 * Caller should fall back to URL-append in manager.ts wrapLegacyChannel on err.
 */
function getFileMd5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const rs = fs.createReadStream(filePath);
    rs.on('data', chunk => hash.update(chunk));
    rs.on('end', () => resolve(hash.digest('hex')));
    rs.on('error', err => reject(err));
  });
}

function waitForFileDone(listener: ZaloListener | null, expectedFileId: string, timeoutMs = 60000): Promise<{ fileUrl: string; fileId: string }> {
  if (!listener) return Promise.reject(new Error('No listener provided'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      listener.off('control_event', handler);
      reject(new Error('WS timeout waiting for file_done'));
    }, timeoutMs);

    const handler = (parsed: any) => {
      try {
        const controls = parsed?.data?.controls || [];
        for (const control of controls) {
          if (control?.content?.act_type === 'file_done') {
            const returnedFileId = String(control.content.fileId);
            if (returnedFileId === expectedFileId) {
              const fileUrl = control.content.data?.url || '';
              clearTimeout(timer);
              listener.off('control_event', handler);
              resolve({ fileUrl, fileId: returnedFileId });
              return;
            }
          }
        }
      } catch (e) {}
    };

    listener.on('control_event', handler);
  });
}

export async function uploadFile(
  session: ZaloSession,
  listener: ZaloListener | null,
  filePath: string,
  recipientId: string,
  isGroup: boolean,
): Promise<{ success: boolean; fileUrl?: string; fileId?: string; clientId?: string; error?: string; checksum?: string; totalSize?: number }> {
  const fileServiceUrl = session.loginInfo.zpw_service_map_v3.file?.[0];
  if (!fileServiceUrl) {
    return { success: false, error: 'No file service URL in session' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  if (fileSize > ZALO_API.MAX_FILE_SIZE) {
    return { success: false, error: `File too large: ${fileSize} > ${ZALO_API.MAX_FILE_SIZE}` };
  }

  const fileName = path.basename(filePath);
  const kind = detectFileKind(fileName);
  if (kind === 'image') {
    return { success: false, error: 'uploadFile called for image — use uploadImage instead' };
  }

  const clientId = String(Date.now()) + String(Math.floor(Math.random() * 1000));
  const CHUNK_SIZE = 512 * 1024;
  const totalChunk = Math.ceil(fileSize / CHUNK_SIZE);
  const fileBuffer = fs.readFileSync(filePath);
  // @ts-ignore
  const FD = (await import('form-data')).default;

  let lastDecData: any = {};
  let lastResData: any = null;
  let uploadFileId: string | null = null;

  for (let i = 1; i <= totalChunk; i++) {
    const paramsObj: Record<string, any> = {
      totalChunk,
      fileName,
      clientId,
      totalSize: fileSize,
      imei: (session as any).imei || (session as any).deviceId || 'paperclip-imei',
      isE2EE: 0,
      jxl: 0,
      chunkId: i,
    };
    if (uploadFileId) {
      paramsObj.fileId = uploadFileId;
    }
    if (isGroup) paramsObj.grid = recipientId;
    else paramsObj.toid = recipientId;

    const encParams = encryptPayload(session, paramsObj);
    const typeParam = isGroup ? '11' : '2';
    const baseEndpoint = `${fileServiceUrl}/api/${isGroup ? 'group' : 'message'}/asyncfile/upload`;
    const url = new URL(baseEndpoint);
    url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
    url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));
    url.searchParams.set('type', typeParam);
    url.searchParams.set('params', encParams);
    const uploadUrl = url.toString();

    const form = new FD();
    const start = (i - 1) * CHUNK_SIZE;
    const end = Math.min(i * CHUNK_SIZE, fileSize);
    const chunkBuffer = fileBuffer.subarray(start, end);

    form.append('chunkContent', chunkBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream',
    });

    try {
      console.log(`[ZaloSend] uploadFile: chunk ${i}/${totalChunk} (${chunkBuffer.length} bytes) → ${baseEndpoint}`);
      const res = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          'User-Agent': session.userAgent,
          'Cookie': buildCookieHeader(session),
          'Origin': 'https://chat.zalo.me',
          'Referer': 'https://chat.zalo.me/',
        },
        timeout: 120_000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      lastResData = res.data;
      if (res.data?.error_code !== 0) {
        let decErrMsg = res.data?.error_message;
        try {
          if (typeof res.data?.data === 'string') {
            decErrMsg = decryptResponse(session, res.data.data);
          }
        } catch {}
        return { success: false, error: decErrMsg || 'Chunk upload failed' };
      }

      if (typeof res.data.data === 'string') {
        try {
          const dec = decryptResponse(session, res.data.data);
          console.log(`[ZaloSend] uploadFile chunk ${i} decrypted:`, dec);
          lastDecData = JSON.parse(dec);
        } catch (e) {
          console.warn(`[ZaloSend] chunk decrypt warn:`, e);
        }
      } else {
        lastDecData = res.data.data || {};
        console.log(`[ZaloSend] uploadFile chunk ${i} plain:`, lastDecData);
      }

      const extractedId = lastDecData?.data?.fileId || lastDecData?.fileId;
      if (!uploadFileId && extractedId && extractedId !== '-1') {
        uploadFileId = extractedId;
        console.log(`[ZaloSend] Extracted fileId=${uploadFileId} from chunk ${i}`);
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (lastResData?.error_code === 0) {
    const finalFileId = lastDecData?.data?.fileId || lastDecData?.fileId || lastDecData?.data?.msgId || lastDecData?.msgId || uploadFileId;
    console.log(`[ZaloSend] uploadFile success. finalFileId=${finalFileId}`);
    
    let fileUrl = '';
    let wsFileId = String(finalFileId);
    if (listener && finalFileId) {
      try {
        const wsData = await waitForFileDone(listener, String(finalFileId), 60000);
        fileUrl = wsData.fileUrl;
        wsFileId = wsData.fileId;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
       return { success: false, error: 'No WS listener available to resolve file delivery or uploadFileId missing' };
    }

    const checksum = await getFileMd5(filePath);
    return { success: true, fileUrl, fileId: wsFileId, clientId, checksum, totalSize: fileSize };
  }

  return { success: false, error: lastResData?.error_message || 'upload failed' };
}
export async function sendDMFile(
  session: ZaloSession,
  listener: ZaloListener | null,
  recipientId: string,
  filePath: string,
  caption?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, recipientId, false);

  const result = await uploadFile(session, listener, filePath, recipientId, false);
  if (!result.success || !result.fileId || !result.fileUrl) {
    return { success: false, error: result.error };
  }

  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).slice(1);

  const paramsObj: Record<string, any> = {
      fileId: result.fileId,
      checksum: result.checksum || '',
      checksumSha: "",
      extention: ext,
      totalSize: result.totalSize || 0,
      fileName: fileName,
      clientId: result.clientId || '',
      fType: 1,
      fileCount: 0,
      fdata: "{}",
      toid: recipientId,
      fileUrl: result.fileUrl,
      zsource: -1,
      ttl: 0,
  };

  const encParams = encryptPayload(session, paramsObj);
  const url = new URL(`${session.loginInfo.zpw_service_map_v3.file?.[0] || 'https://tt-files-wpa.chat.zalo.me'}/api/message/asyncfile/msg`);
  console.log(`[ZaloSend] sendDMFile url: ${url.toString()}`);
  url.searchParams.set('nretry', '0');
  url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
  url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));

  try {
    const res = await axios.post(
      url.toString(),
      `params=${encodeURIComponent(encParams)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': session.userAgent,
          'Cookie': buildCookieHeader(session),
        },
      }
    );

    if (caption) {
      await sendDMText(session, recipientId, caption);
    }

    if (res.data?.error_code === 0) {
      return { success: true, messageId: res.data?.data?.msgId };
    }
    return { success: false, error: res.data?.error_message || 'asyncfile/msg failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a non-image file to a group thread.
 */
export async function sendGroupFile(
  session: ZaloSession,
  listener: ZaloListener | null,
  groupId: string,
  filePath: string,
  caption?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, groupId, true);

  const result = await uploadFile(session, listener, filePath, groupId, true);
  if (!result.success || !result.fileId || !result.fileUrl) {
    return { success: false, error: result.error };
  }

  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).slice(1);

  const paramsObj: Record<string, any> = {
      fileId: result.fileId,
      checksum: result.checksum || '',
      checksumSha: "",
      extention: ext,
      totalSize: result.totalSize || 0,
      fileName: fileName,
      clientId: result.clientId || '',
      fType: 1,
      fileCount: 0,
      fdata: "{}",
      grid: groupId,
      fileUrl: result.fileUrl,
      zsource: -1,
      ttl: 0,
  };

  const encParams = encryptPayload(session, paramsObj);
  const url = new URL(`${session.loginInfo.zpw_service_map_v3.file?.[0] || 'https://tt-files-wpa.chat.zalo.me'}/api/group/asyncfile/msg`);
  url.searchParams.set('nretry', '0');
  url.searchParams.set('zpw_ver', String(ZALO_API.ZPW_VER));
  url.searchParams.set('zpw_type', String(ZALO_API.ZPW_TYPE));

  try {
    const res = await axios.post(
      url.toString(),
      `params=${encodeURIComponent(encParams)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': session.userAgent,
          'Cookie': buildCookieHeader(session),
        },
      }
    );

    if (caption) {
      await sendGroupText(session, groupId, caption);
    }

    if (res.data?.error_code === 0) {
      return { success: true, messageId: res.data?.data?.msgId };
    }
    return { success: false, error: res.data?.error_message || 'asyncfile/msg failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
