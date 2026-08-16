// paperclip/server/src/channels/media-util.ts
// Shared OUTBOUND-media helpers (SSOT) dùng chung bởi Zalo + CSKH outbound dispatch.
// Tách khỏi zalo-personal/channel.ts để CSKH tái dùng CÙNG logic resolve/download
// (chống split-brain: 1 nơi định nghĩa, đổi 1 chỗ cả 2 kênh hưởng).
import type { MediaFile } from './types.js';
import https from 'https';
import http from 'http';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import {
  join as pathJoin,
  basename as pathBasename,
  extname as pathExtname,
  isAbsolute as pathIsAbsolute,
  resolve as pathResolve,
} from 'path';
import { tmpdir } from 'os';

// Project root để resolve path tương đối trong agents/*/media-library.json.
// Khớp router.ts PROJECT_ROOT → "memory/agents/shared/..." trỏ đúng cây crypto-pattern-scanner
// (nơi asset thật), KHÔNG phải CWD của server.
export const MEDIA_PROJECT_ROOT =
  process.env.PROJECT_ROOT || 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner';

/** Phân loại image vs file theo mimeType (chỉ image/* mới là ảnh). */
export function isImageMedia(media: MediaFile): boolean {
  return (media.mimeType || '').toLowerCase().startsWith('image/');
}

/**
 * Download 1 URL về temp file, trả local path. Provider-agnostic. Trả `null` khi lỗi
 * (network / 4xx-5xx) để caller fallback URL-as-text mà không crash.
 */
export async function downloadMediaToTemp(url: string, suggestedFilename?: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const tmpDir = mkdtempSync(pathJoin(tmpdir(), 'paperclip-media-'));
      const urlPath = (() => { try { return new URL(url).pathname; } catch { return url; } })();
      const filename = suggestedFilename || pathBasename(urlPath) || `media${pathExtname(urlPath) || '.bin'}`;
      const destPath = pathJoin(tmpDir, filename);

      const client = url.startsWith('https:') ? https : http;
      const req = client.get(url, (res) => {
        // Follow single redirect
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadMediaToTemp(res.headers.location, suggestedFilename).then(resolve);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          console.warn(`[Media] Download ${url} failed: HTTP ${res.statusCode}`);
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            writeFileSync(destPath, Buffer.concat(chunks));
            resolve(destPath);
          } catch (err: any) {
            console.warn(`[Media] Write ${destPath} failed: ${err.message}`);
            resolve(null);
          }
        });
        res.on('error', (err) => {
          console.warn(`[Media] Stream ${url} error: ${err.message}`);
          resolve(null);
        });
      });
      req.on('error', (err) => {
        console.warn(`[Media] Request ${url} error: ${err.message}`);
        resolve(null);
      });
      req.setTimeout(30_000, () => { req.destroy(new Error('timeout')); });
    } catch (err: any) {
      console.warn(`[Media] downloadMediaToTemp threw: ${err.message}`);
      resolve(null);
    }
  });
}

/**
 * Resolve 1 MediaFile → local file path. Ưu tiên `item.path` (resolve absolute hoặc
 * theo MEDIA_PROJECT_ROOT); nếu không có/không tồn tại thì download `item.url` về temp.
 * Trả `{ localPath, cleanup }` — cleanup=true khi localPath là temp cần xoá sau khi dùng.
 */
export async function resolveMediaToLocalPath(item: MediaFile): Promise<{ localPath: string | null; cleanup: boolean }> {
  let localPath: string | null = null;
  let cleanup = false;
  if (item.path) {
    const resolved = pathIsAbsolute(item.path) ? item.path : pathResolve(MEDIA_PROJECT_ROOT, item.path);
    if (existsSync(resolved)) localPath = resolved;
    else console.warn(`[Media] Path not found on disk: ${resolved}`);
  }
  if (!localPath && item.url) {
    localPath = await downloadMediaToTemp(item.url, item.filename);
    cleanup = localPath !== null;
  }
  return { localPath, cleanup };
}
