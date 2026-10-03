// Guard P41 (GEM-1177): preview Hộp thư (channel_sessions.last_message_*) chỉ có 2 điểm ghi cho phiên
// ĐÃ CÓ DÒNG — consumer (tin VÀO) + trigger DB trg_channel_sent_touch_session (tin RA).
// router.saveHistory chạy theo giờ xử lý, TRƯỚC khi reply được gửi; ghi `now` + nội dung reply ở
// nhánh UPDATE làm last_message_at vượt created_at tin ra thật → trigger bị chặn → preview lệch.
// Runs in the pre-commit reply-contract gate (filename matches "reply-contract").
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const routerSrc = readFileSync(join(resolve(__dirname, '../channels'), 'router.ts'), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Thân hàm saveHistory (live code), cắt đến hết file vì nó là hàm cuối.
const start = routerSrc.indexOf('async function saveHistory(');
const body = stripComments(routerSrc.slice(start));
const updateBranch = body.slice(body.indexOf('if (session) {'), body.indexOf('} else {'));
const insertBranch = body.slice(body.indexOf('} else {'));

describe('saveHistory — không là writer thứ ba của preview Hộp thư', () => {
  it('tìm thấy cả nhánh UPDATE lẫn INSERT', () => {
    expect(start).toBeGreaterThan(-1);
    expect(updateBranch).toContain(".update({");
    expect(insertBranch).toContain(".insert({");
  });

  it('nhánh UPDATE (phiên đã có dòng) KHÔNG ghi last_message_*', () => {
    expect(updateBranch).not.toMatch(/last_message_at/);
    expect(updateBranch).not.toMatch(/last_message_preview/);
    expect(updateBranch).not.toMatch(/last_message_sender/);
  });

  it('nhánh INSERT (phiên training/test chưa có dòng) vẫn seed preview với đúng tên cột', () => {
    expect(insertBranch).toMatch(/last_message_at/);
    expect(insertBranch).toMatch(/last_message_preview/);
    expect(insertBranch).toMatch(/last_message_sender/);
  });
});
