/**
 * parseSessionKey — parser CANONICAL cho session_key (dùng chung transcript + consumer).
 *
 * Vì sao có file này (bug 25/07): commit 092ff4ae5 (19/07) gộp 2 màn inbox về 1 parser và
 * siết validate lên ĐÚNG 3 phần. Gem Master mirror ghi 2 phần `gem-master:<userId>` (cố ý:
 * 1 khách = 1 phiên) ⇒ parser trả null ⇒ fetchTranscript throw ⇒ endpoint 400 ⇒ 7 hội thoại
 * "Đang tải tin nhắn..." mãi mãi, SUỐT 6 NGÀY không ai phát hiện (danh sách vẫn hiện bình
 * thường; UI nuốt lỗi thành "Chưa có tin nhắn").
 *
 * Bảng dưới khoá CẢ HAI convention để lần refactor sau không siết nhầm lần nữa.
 */
import { describe, it, expect } from 'vitest';
import { parseSessionKey } from '../channels/transcript.js';

describe('parseSessionKey — 3 phần (convention mặc định)', () => {
  it('direct: lọc from_uid', () => {
    expect(parseSessionKey('cskh-internal:abc:xyz')).toEqual({
      channel: 'cskh-internal',
      threadId: 'abc',
      senderPart: 'xyz',
      isGroup: false,
      filterSender: true,
    });
  });

  it('group: KHÔNG lọc from_uid (giữ đủ tin của mọi người trong nhóm)', () => {
    expect(parseSessionKey('zalo-personal-1:thread1:group')).toEqual({
      channel: 'zalo-personal-1',
      threadId: 'thread1',
      senderPart: 'group',
      isGroup: true,
      filterSender: false,
    });
  });

  it('id CHỨA dấu ":" — slice chứ không split (split sẽ cắt sai id)', () => {
    const p = parseSessionKey('ch:th:sen:der');
    expect(p?.threadId).toBe('th');
    expect(p?.senderPart).toBe('sen:der');
  });
});

describe('parseSessionKey — 2 phần (single-party, CHỈ channel đã đăng ký)', () => {
  it('gem-master: hợp lệ, filterSender=false (thread_id đã định danh duy nhất khách)', () => {
    expect(parseSessionKey('gem-master:e2700fab-73cd-42b0-8c10-3b0fd6a46b4e')).toEqual({
      channel: 'gem-master',
      threadId: 'e2700fab-73cd-42b0-8c10-3b0fd6a46b4e',
      senderPart: 'e2700fab-73cd-42b0-8c10-3b0fd6a46b4e',
      isGroup: false,
      filterSender: false,
    });
  });

  it('gem-master:_demo — id không phải uuid vẫn hợp lệ', () => {
    expect(parseSessionKey('gem-master:_demo')?.threadId).toBe('_demo');
  });

  it('FAIL-CLOSED: channel chưa đăng ký single-party thì 2 phần vẫn null', () => {
    expect(parseSessionKey('cskh-internal:abc')).toBeNull();
  });
});

describe('parseSessionKey — key hỏng luôn trả null (caller trả 400)', () => {
  it.each([
    ['rỗng', ''],
    ['không có dấu ":"', 'gem-master'],
    ['thiếu threadId (single-party)', 'gem-master:'],
    ['thiếu channel', ':abc:xyz'],
    ['threadId rỗng giữa 2 dấu ":"', 'a::b'],
    ['thiếu senderPart', 'cskh-internal:abc:'],
  ])('%s', (_label, key) => {
    expect(parseSessionKey(key)).toBeNull();
  });
});
