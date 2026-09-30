// cc-db-proxy — đường service_role cho 2 bảng CC nhạy cảm mà Paperclip UI (anon key, KHÔNG có phiên
// Supabase) từng đọc/ghi qua policy `*_anon` (GEM-1069, ENG-0930-F1051-02-5acec3; phần 2 của GEM-1051).
//
// Gốc: cc_email_sends (~37.8k dòng PII: recipient_email/name/revenue) + cc_generation_jobs mở SELECT/INSERT
// cho MỌI người giữ anon key (key này public trong bundle gemral.com + hardcode fallback trong UI). UI
// Paperclip chạy localhost:3100 nên đi qua server này được: UI đổi URL `/rest/v1/<bảng>` → `/api/cc-db/rest/v1/<bảng>`
// (ui/src/lib/supabaseClient.ts), server gắn service_role rồi chuyển tiếp NGUYÊN query PostgREST ⇒ consumer
// (`supabase.from('cc_email_sends').select(...)`) không phải sửa. Có proxy rồi mới DROP policy anon.
//
// Giới hạn cố ý (proxy chỉ là cầu, KHÔNG là service_role mở toang):
//  - allowlist 2 bảng · method GET/HEAD/POST/PATCH/DELETE;
//  - chặn embed (`select=...(...)`) — service_role qua FK sẽ đọc lan sang bảng khác;
//  - PATCH/DELETE bắt buộc có bộ lọc (không sửa/xoá cả bảng);
//  - chỉ chuyển tiếp header PostgREST cần thiết; header apikey/Authorization anon của trình duyệt bị bỏ.
import { Router, type Request, type Response } from 'express';

export const CC_DB_PROXY_TABLES: ReadonlySet<string> = new Set(['cc_email_sends', 'cc_generation_jobs']);
const ALLOWED_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']);
const FORWARD_REQ_HEADERS = ['accept', 'content-type', 'prefer', 'range', 'range-unit'];
const FORWARD_RES_HEADERS = ['content-type', 'content-range', 'preference-applied', 'location'];
// Tham số PostgREST KHÔNG phải bộ lọc hàng — PATCH/DELETE chỉ có các tham số này = sửa/xoá cả bảng.
const NON_FILTER_PARAMS: ReadonlySet<string> = new Set(['select', 'columns', 'on_conflict', 'limit', 'offset', 'order']);

export type ProxyCheck = { ok: true } | { ok: false; status: number; error: string };

/** Kiểm request TRƯỚC khi chuyển tiếp — thuần hàm để test (không đụng mạng). */
export function checkCcDbRequest(method: string, table: string, rawQuery: string): ProxyCheck {
  if (!CC_DB_PROXY_TABLES.has(table)) return { ok: false, status: 403, error: `table not allowed: ${table}` };
  if (!ALLOWED_METHODS.has(method)) return { ok: false, status: 405, error: `method not allowed: ${method}` };
  const params = new URLSearchParams(rawQuery);
  const select = params.get('select');
  if (select && select.includes('(')) return { ok: false, status: 400, error: 'embedded select not allowed' };
  if (method === 'PATCH' || method === 'DELETE') {
    const hasFilter = [...params.keys()].some((k) => !NON_FILTER_PARAMS.has(k));
    if (!hasFilter) return { ok: false, status: 400, error: `${method} requires a filter` };
  }
  return { ok: true };
}

const SUPABASE_URL = process.env.GEMRAL_SUPABASE_URL ?? 'https://pgfkbcnzqozzkohwbgbk.supabase.co';

async function handle(req: Request, res: Response): Promise<void> {
  const key = process.env.GEMRAL_SUPABASE_SERVICE_KEY;
  if (!key) {
    res.status(503).json({ error: '[cc-db-proxy] GEMRAL_SUPABASE_SERVICE_KEY chưa set' });
    return;
  }
  const rawQuery = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1) : '';
  const table = String(req.params.table);
  const check = checkCcDbRequest(req.method, table, rawQuery);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
  for (const h of FORWARD_REQ_HEADERS) {
    const v = req.header(h);
    if (v) headers[h] = v;
  }
  const hasBody = req.method === 'POST' || req.method === 'PATCH';
  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}${rawQuery ? `?${rawQuery}` : ''}`,
      {
        method: req.method,
        headers,
        body: hasBody && req.body !== undefined ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(30_000),
      },
    );
    res.status(upstream.status);
    for (const h of FORWARD_RES_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    // KHÔNG ném stack/URL kèm key ra client; log tên lỗi phía server.
    console.error('[cc-db-proxy] upstream error:', err instanceof Error ? err.name : 'unknown');
    res.status(502).json({ error: 'upstream unavailable' });
  }
}

const router = Router();
router.all('/rest/v1/:table', (req, res) => {
  void handle(req, res);
});

export default router;
