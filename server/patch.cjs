const fs = require('fs');
const path = 'C:/Users/Jennie Chu/Desktop/Projects/paperclip/server/src/channels/zalo-personal/protocol/send.ts';
let code = fs.readFileSync(path, 'utf-8');

const regex = /export async function uploadFile[\s\S]+?(?=\nexport async function sendDMFile)/;

const newUploadFile = `export async function uploadFile(
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
    return { success: false, error: \`File not found: \${filePath}\` };
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  if (fileSize > ZALO_API.MAX_FILE_SIZE) {
    return { success: false, error: \`File too large: \${fileSize} > \${ZALO_API.MAX_FILE_SIZE}\` };
  }

  const fileName = require('path').basename(filePath);
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
    if (isGroup) paramsObj.grid = recipientId;
    else paramsObj.toid = recipientId;

    const encParams = encryptPayload(session, paramsObj);
    const typeParam = isGroup ? '11' : '2';
    const baseEndpoint = \`\${fileServiceUrl}/api/\${isGroup ? 'group' : 'message'}/asyncfile/upload\`;
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
      console.log(\`[ZaloSend] uploadFile: chunk \${i}/\${totalChunk} (\${chunkBuffer.length} bytes) → \${baseEndpoint}\`);
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
          lastDecData = JSON.parse(dec);
        } catch (e) {
          console.warn(\`[ZaloSend] chunk decrypt warn:\`, e);
        }
      } else {
        lastDecData = res.data.data || {};
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (lastResData?.error_code === 0) {
    const uploadFileId = lastDecData.fileId || lastDecData.msgId || lastDecData.photoId;
    let fileUrl = '';
    let wsFileId = String(uploadFileId);
    if (listener && uploadFileId) {
      try {
        const wsData = await waitForFileDone(listener, String(uploadFileId), 60000);
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
}`;

code = code.replace(regex, newUploadFile);
fs.writeFileSync(path, code, 'utf-8');
console.log('done');
