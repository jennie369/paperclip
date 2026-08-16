// SSOT nhãn sent_by "do NGƯỜI gửi tay" — dùng chung cho mọi writer + query + probe (server-side).
// Bất kỳ tin nào chị/nhân viên gõ tay đều bắt đầu bằng 'manual' ('manual', 'manual_zalo', 'manual_fb', …).
// 1-chạm-mở-rộng: thêm kênh 'manual_ig'/'manual_tg' về sau KHÔNG phải sửa lại consumer/whitelist.
// ⚠️ UI (ui/src) là bundle riêng, KHÔNG import được file này → có bản song sinh trong ChatPanel/MessageBubble.
export function isHumanSent(sentBy: string | null | undefined): boolean {
  return !!sentBy && sentBy.startsWith('manual');
}
