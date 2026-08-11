// SSOT (UI bundle) — nhãn sent_by "do NGƯỜI gửi tay": 'manual', 'manual_zalo', 'manual_fb', …
// Bản song sinh của server-side channels/sent-by-utils.ts (UI + server là 2 bundle riêng, không share
// import được). Sửa 1 nơi phải sửa nơi kia — 1-chạm-mở-rộng cho kênh manual_* mới.
export function isHumanSent(sentBy: string | null | undefined): boolean {
  return !!sentBy && sentBy.startsWith("manual");
}
