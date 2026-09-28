// Chọn lọc JSON SSOT đưa vào prompt reply-agent theo NỘI DUNG câu khách (29/09).
//
// Gốc: sales-closer nhét NGUYÊN product-catalog-index.json (134 SP) + cskh-qa.json (137 mục) vào
// MỌI lượt → prompt 393k ký tự (sau khi đã bỏ link ảnh), ~80% là 2 file này → agy trả lời ~90s.
// Vẫn giữ quyết định 28/08 "reply-reference nằm SẴN trong prompt, không bắt agent tự đi đọc":
//   • MỤC LỤC toàn bộ (1 dòng/mục) — agent luôn biết có những gì, không bịa "không có SP".
//   • CHI TIẾT đầy đủ chỉ cho mục KHỚP câu khách + vài lượt gần nhất (điểm khớp từ khoá).
//   • Mục `khung-tham-chieu` (khung tư vấn/payment/CTA/quy trình crystal) LUÔN đầy đủ.
//   • Mục không có chi tiết mà cần → agent đọc file gốc theo `id` (đường dẫn ghi trong header).
// Query rỗng → trả null (caller nạp bản gọn đầy đủ như cũ).

const OMIT = new Set([
  'images', 'all_images', 'all_image_urls', 'path', 'origin', 'freq',
  'shopify_product_id', 'shopify_variant_id', 'url', 'catalog_anchor',
]);

export const CATALOG_TOP_K = 8;
export const QA_TOP_K = 10;
const ALWAYS_FULL_QA_CATEGORY = 'khung-tham-chieu';
// Trong khung-tham-chieu: 2 mục nhỏ + quy tắc cứng (tư vấn, thanh toán CK trước) LUÔN đủ; 2 mục nặng
// (bảng CTA/link ~28k, quy trình crystal ~21k) chỉ đủ khi câu khách chạm chủ đề (từ khoá không dấu) —
// còn lại nằm ở mục lục + agent đọc file gốc khi cần. Đo 29/09: 4 mục = 56k/75k phần cskh-qa.
const REF_ALWAYS = new Set(['ref-khung-tu-van', 'ref-payment']);
const REF_TRIGGERS: Record<string, string[]> = {
  // ⚠ bỏ dấu gây trùng: đã/đá→'da', nhận/nhẫn→'nhan', vọng/vòng→'vong', trừ/trụ→'tru' — chỉ dùng CỤM.
  'ref-quy-trinh-crystal': ['thach anh', 'vien da', 'da phong thuy', 'vong tay', 'tru da', 'cay tai loc',
    'cay da', 'crystal', 'tinh the', 'phong thuy', 'hop menh', 'menh', 'charm', 'ty huu', 'mat day',
    'hop tuoi', 'nang luong', 'set da', 'thach'],
  'ref-cta-link-registry': ['link', 'dang ky', 'tai app', 'app', 'landing', 'web', 'website', 'dang nhap',
    'khoa hoc', 'zalo', 'nhom', 'group', 'ho tro', 'kich hoat', 'truy cap', 'mua o dau', 'dat hang'],
};

function refWanted(id: string, query: string): boolean {
  if (REF_ALWAYS.has(id)) return true;
  const trig = REF_TRIGGERS[id];
  if (!trig) return true; // mục khung mới chưa khai → an toàn: đưa đủ
  const q = ` ${normalize(query)} `;
  return trig.some((t) => q.includes(` ${t} `));
}

const STOP = new Set([
  'va', 'la', 'cua', 'cho', 'co', 'khong', 'nhe', 'a', 'ah', 'oi', 'em', 'chi', 'anh', 'ban', 'minh',
  'toi', 'the', 'nao', 'gi', 'duoc', 'roi', 'voi', 'nha', 'a', 'thi', 'ma', 'nay', 'do', 'de', 'o',
  'mot', 'nhung', 'cac', 'nhieu', 'lam', 'giup', 'hay', 'hoac', 'khi', 'ra', 'vao', 'len', 'xuong',
  'da', 'dang', 'se', 'can', 'muon', 'hoi', 'xin', 'vay', 'u', 'uh', 'ok', 'dc', 'k', 'ko', 'kh',
]);

export function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s).split(' ').filter((t) => t.length >= 2 && !STOP.has(t));
}

function asText(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(asText).join(' ');
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).map(asText).join(' ');
  return String(v);
}

/** Điểm khớp: token trùng (1đ) + cụm `covers` xuất hiện nguyên trong câu (4đ/cụm) + nhắc đúng id (10đ). */
export function score(queryNorm: string, queryTokens: Set<string>, item: Record<string, unknown>, fields: string[]): number {
  let s = 0;
  const docTokens = new Set(tokens(fields.map((f) => asText(item[f])).join(' ')));
  for (const t of queryTokens) if (docTokens.has(t)) s += 1;
  const covers = Array.isArray(item.covers) ? (item.covers as unknown[]) : [];
  for (const c of covers) {
    const cn = normalize(String(c));
    if (cn.length >= 3 && ` ${queryNorm} `.includes(` ${cn} `)) s += 4;
  }
  const id = String(item.id || '');
  if (id && queryNorm.includes(normalize(id))) s += 10;
  return s;
}

function slim(o: unknown): unknown {
  return JSON.parse(JSON.stringify(o, (k, v) => (OMIT.has(k) ? undefined : v)));
}

function topK<T extends Record<string, unknown>>(items: T[], query: string, fields: string[], k: number): T[] {
  const qn = normalize(query);
  const qt = new Set(tokens(query));
  return items
    .map((it, i) => ({ it, i, s: score(qn, qt, it, fields) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, k)
    .map((x) => x.it);
}

function headerMeta(data: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (k !== 'items') meta[k] = v;
  return slim(meta) as Record<string, unknown>;
}

/**
 * Trả chuỗi đã chọn lọc cho 1 file JSON SSOT; null = không áp dụng (caller nạp bản gọn đầy đủ).
 * @param fileName tên file (product-catalog-index.json | cskh-qa.json)
 * @param relPath  đường dẫn repo-relative để agent đọc file gốc khi cần mục ngoài danh sách chi tiết
 */
export function selectInlineJson(fileName: string, data: unknown, query: string, relPath: string): string | null {
  if (!query || !query.trim()) return null;
  if (!data || typeof data !== 'object' || !Array.isArray((data as any).items)) return null;
  const d = data as Record<string, unknown> & { items: Record<string, unknown>[] };

  if (fileName === 'product-catalog-index.json') {
    const index = d.items.map((it) => {
      const price = it.price && it.price !== 'None' ? it.price : it.price_range && it.price_range !== 'None' ? it.price_range : '';
      return `${it.id} | ${it.name} | ${price} | ${it.type || ''}`;
    });
    const picked = topK(d.items, query, ['name', 'covers', 'type', 'summary', 'id'], CATALOG_TOP_K);
    return [
      `[CHỌN LỌC theo câu khách — MỤC LỤC đủ ${d.items.length} SP; CHI TIẾT ${picked.length} SP khớp nhất. ` +
        `SP khác cần giá/variant/links/includes → đọc file ${relPath} theo \`id\` trước khi trả lời, KHÔNG bịa. ` +
        `Gửi ảnh: [[SEND_MEDIA: id]].]`,
      JSON.stringify(headerMeta(d)),
      '## MỤC LỤC (id | tên | giá | loại)',
      index.join('\n'),
      '## CHI TIẾT SP KHỚP',
      JSON.stringify(slim(picked)),
    ].join('\n');
  }

  if (fileName === 'cskh-qa.json') {
    const refs = d.items.filter((it) => it.category === ALWAYS_FULL_QA_CATEGORY);
    const always = refs.filter((it) => refWanted(String(it.id), query));
    const refsIndexed = refs.filter((it) => !always.includes(it));
    const rest = d.items.filter((it) => it.category !== ALWAYS_FULL_QA_CATEGORY);
    const picked = topK(rest, query, ['question', 'covers', 'tags', 'category'], QA_TOP_K);
    const index = [...refsIndexed, ...rest].map((it) => `${it.id} | ${it.category} | ${it.question}`);
    return [
      `[CHỌN LỌC theo câu khách — MỤC LỤC đủ ${index.length} mục; ĐẦY ĐỦ answer cho ${picked.length} câu khớp nhất ` +
        `+ ${always.length} mục khung-tham-chieu. Mục khác cần answer → đọc file ${relPath} theo \`id\`, KHÔNG tự chế.]`,
      JSON.stringify(headerMeta(d)),
      '## KHUNG THAM CHIẾU (luôn đủ)',
      JSON.stringify(slim(always)),
      '## MỤC LỤC (id | nhóm | câu hỏi)',
      index.join('\n'),
      '## CÂU KHỚP (đủ answer)',
      JSON.stringify(slim(picked)),
    ].join('\n');
  }
  return null;
}
