import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectInlineJson, normalize } from '../channels/inline-ssot-select.js';

// Dữ liệu THẬT (repo crypto-pattern-scanner cạnh repo paperclip). Thiếu → skip (CI khác máy).
const REF = resolve(__dirname, '../../../../crypto-pattern-scanner/memory/sops/DOC-HTML/reference_and_policies');
const CAT = resolve(REF, 'product-catalog-index.json');
const QA = resolve(REF, 'cskh-qa.json');
const hasData = existsSync(CAT) && existsSync(QA);
const load = (p: string) => JSON.parse(readFileSync(p, 'utf-8'));

describe('inline-ssot-select', () => {
  it('normalize bỏ dấu + đ', () => {
    expect(normalize('Thạch Anh Hồng Trái Tim — Đá')).toBe('thach anh hong trai tim da');
  });

  it('query rỗng → null (caller nạp bản đầy đủ)', () => {
    expect(selectInlineJson('cskh-qa.json', { items: [] }, '   ', 'x')).toBeNull();
    expect(selectInlineJson('khac.json', { items: [{ id: 'a' }] }, 'abc', 'x')).toBeNull();
  });

  it.skipIf(!hasData)('catalog: SP được hỏi nằm trong CHI TIẾT + mục lục đủ mọi SP', () => {
    const cat = load(CAT);
    const out = selectInlineJson('product-catalog-index.json', cat, 'Lấy cho chị 1 thạch anh hồng trái tim', 'p')!;
    const detail = out.split('## CHI TIẾT SP KHỚP')[1];
    expect(detail.toLowerCase()).toContain('thạch anh hồng');
    for (const it of cat.items) expect(out).toContain(`${it.id} |`);
    expect(out).not.toContain('all_image_urls');
    expect(out.length).toBeLessThan(60_000);
  });

  it.skipIf(!hasData)('qa: khung-tham-chieu luôn đủ + câu vận chuyển được chọn', () => {
    const qa = load(QA);
    const out = selectInlineJson('cskh-qa.json', qa, 'Mình vẫn chưa nhận được hàng, kiểm tra đơn hàng giúp mình', 'p')!;
    const ref = (id: string) => qa.items.find((i: any) => i.id === id);
    // tư vấn + thanh toán LUÔN đủ (quy tắc cứng CK trước)
    for (const id of ['ref-khung-tu-van', 'ref-payment']) expect(out).toContain(JSON.stringify(ref(id).answer).slice(1, 60));
    // quy trình crystal chỉ đủ khi nói về đá — câu hỏi đơn hàng thì chỉ nằm ở mục lục
    expect(out).not.toContain(JSON.stringify(ref('ref-quy-trinh-crystal').answer).slice(1, 60));
    expect(out).toContain('ref-quy-trinh-crystal |');
    const picked = out.split('## CÂU KHỚP (đủ answer)')[1];
    expect(picked.length).toBeGreaterThan(50);
    expect(out.length).toBeLessThan(30_000);
  });

  it.skipIf(!hasData)('qa: hỏi về đá → quy trình crystal đầy đủ', () => {
    const qa = load(QA);
    const out = selectInlineJson('cskh-qa.json', qa, 'cây tài lộc thạch anh hợp mệnh mộc không em', 'p')!;
    const crystal = qa.items.find((i: any) => i.id === 'ref-quy-trinh-crystal');
    expect(out).toContain(JSON.stringify(crystal.answer).slice(1, 60));
  });
});
