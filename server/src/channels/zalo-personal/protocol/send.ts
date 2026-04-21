// packages/server/src/channels/zalo-personal/protocol/send.ts
// Send messages via Zalo HTTP API — matches GoClaw's encryptPayload approach

import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ZaloSession, ZALO_API } from './message';

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
  // Escape non-ASCII chars to \uXXXX for Zalo server compatibility (fixes Vietnamese diacritics)
  const payload = JSON.stringify(data).replace(/[\u0080-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
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
      return { success: false, error: err.message };
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
 * Upload image to Zalo file service.
 * Zalo file upload: POST multipart/form-data to file service URL.
 * Returns { fileUrl, fileId } on success.
 */
export async function uploadImage(
  session: ZaloSession,
  filePath: string,
  recipientId: string,
  isGroup: boolean
): Promise<{ success: boolean; fileUrl?: string; fileId?: string; error?: string }> {
  const fileServiceUrl = session.loginInfo.zpw_service_map_v3.file?.[0];
  if (!fileServiceUrl) {
    return { success: false, error: 'No file service URL in session' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const fileSize = fs.statSync(filePath).size;
  if (fileSize > ZALO_API.MAX_FILE_SIZE) {
    return { success: false, error: `File too large: ${fileSize} > ${ZALO_API.MAX_FILE_SIZE}` };
  }

  const fileName = path.basename(filePath);

  // Build multipart form data manually using axios + stream
  const FD = (await import('form-data')).default;
  const form = new FD();
  form.append('fileContent', fs.createReadStream(filePath), fileName);

  // Build upload params
  const params: Record<string, string> = {
    zpw_ver: String(ZALO_API.ZPW_VER),
    zpw_type: String(ZALO_API.ZPW_TYPE),
    type: '2', // image type
  };
  if (isGroup) {
    params.grid = recipientId;
  } else {
    params.toid = recipientId;
  }
  const qs = new URLSearchParams(params).toString();

  const uploadUrl = `${fileServiceUrl}/api/message/${isGroup ? 'group/' : ''}photo?${qs}`;

  try {
    console.log(`[ZaloSend] Uploading image: ${fileName} (${fileSize} bytes) → ${uploadUrl.split('?')[0]}`);

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

    console.log(`[ZaloSend] Upload response:`, JSON.stringify(res.data).substring(0, 300));

    if (res.data?.error_code === 0) {
      return {
        success: true,
        fileUrl: res.data?.data?.thumb || res.data?.data?.url,
        fileId: res.data?.data?.photoId || res.data?.data?.msgId,
      };
    }

    return {
      success: false,
      error: res.data?.error_message || `Upload failed (code: ${res.data?.error_code})`,
    };
  } catch (err: any) {
    console.error(`[ZaloSend] Upload error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send image to DM using direct photo API.
 * Uses multipart upload that combines upload + send in one call.
 */
export async function sendDMImage(
  session: ZaloSession,
  recipientId: string,
  filePath: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Send typing first
  await sendTyping(session, recipientId, false);

  const result = await uploadImage(session, filePath, recipientId, false);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // If caption provided, send it as a follow-up text message
  if (caption) {
    await sendDMText(session, recipientId, caption);
  }

  return { success: true, messageId: result.fileId };
}

/**
 * Send image to group using direct photo API.
 */
export async function sendGroupImage(
  session: ZaloSession,
  groupId: string,
  filePath: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, groupId, true);

  const result = await uploadImage(session, filePath, groupId, true);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (caption) {
    await sendGroupText(session, groupId, caption);
  }

  return { success: true, messageId: result.fileId };
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
export async function uploadFile(
  session: ZaloSession,
  filePath: string,
  recipientId: string,
  isGroup: boolean,
): Promise<{ success: boolean; fileUrl?: string; fileId?: string; clientId?: string; error?: string }> {
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

  // clientId binds the uploaded file to the follow-up text message
  const clientId = String(Date.now()) + String(Math.floor(Math.random() * 1000));

  // Encrypted params (single-chunk for now — totalChunk=1, chunkId=1)
  const paramsObj: Record<string, any> = {
    totalChunk: 1,
    fileName,
    clientId,
    totalSize: fileSize,
    imei: (session as any).imei || (session as any).deviceId || 'paperclip-imei',
    isE2EE: 0,
    jxl: 0,
    chunkId: 1,
  };
  if (isGroup) {
    paramsObj.grid = recipientId;
  } else {
    paramsObj.toid = recipientId;
  }

  const encParams = encryptPayload(session, paramsObj);

  const typeParam = isGroup ? '11' : '2';
  const baseEndpoint = `${fileServiceUrl}/api/${isGroup ? 'group' : 'message'}/asyncfile/upload`;
  const url = new URL(baseEndpoint);
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
    console.log(`[ZaloSend] uploadFile: ${fileName} (${fileSize} bytes, kind=${kind}) → ${baseEndpoint}`);

    const res = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': session.userAgent,
        'Cookie': buildCookieHeader(session),
        'Origin': 'https://chat.zalo.me',
        'Referer': 'https://chat.zalo.me/',
      },
      timeout: 120_000,
      maxContentLength: ZALO_API.MAX_FILE_SIZE,
    });

    console.log(`[ZaloSend] uploadFile response:`, JSON.stringify(res.data).substring(0, 400));

    if (res.data?.error_code === 0) {
      return {
        success: true,
        fileUrl: res.data?.data?.fileUrl || res.data?.data?.url || res.data?.data?.hdUrl,
        fileId: res.data?.data?.fileId || res.data?.data?.msgId || res.data?.data?.photoId,
        clientId,
      };
    }

    return {
      success: false,
      error: res.data?.error_message || `Upload failed (code: ${res.data?.error_code})`,
    };
  } catch (err: any) {
    console.error(`[ZaloSend] uploadFile error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a non-image file (PDF / doc / video) to a DM thread.
 *
 * Two-step: upload → caption text. If server auto-attaches via clientId,
 * the caption is plain text; otherwise the URL is appended as fallback.
 */
export async function sendDMFile(
  session: ZaloSession,
  recipientId: string,
  filePath: string,
  caption?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, recipientId, false);

  const result = await uploadFile(session, filePath, recipientId, false);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const captionText = caption || `[Tệp đính kèm: ${path.basename(filePath)}]${result.fileUrl ? '\n' + result.fileUrl : ''}`;
  await sendDMText(session, recipientId, captionText);

  return { success: true, messageId: result.fileId };
}

/**
 * Send a non-image file to a group thread.
 */
export async function sendGroupFile(
  session: ZaloSession,
  groupId: string,
  filePath: string,
  caption?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await sendTyping(session, groupId, true);

  const result = await uploadFile(session, filePath, groupId, true);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const captionText = caption || `[Tệp đính kèm: ${path.basename(filePath)}]${result.fileUrl ? '\n' + result.fileUrl : ''}`;
  await sendGroupText(session, groupId, captionText);

  return { success: true, messageId: result.fileId };
}
