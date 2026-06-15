# 🧠 TASK CHO AGY — Provision Pool "Brain" cho Antigravity Reply Provider

> **Cách dùng**: Mở task này trong **Antigravity IDE** (agy chạy interactive, KHÔNG phải `-p` headless) rồi bảo agy: *"Đọc file này và thực hiện trọn vẹn task provision pool brain."*
> **Lý do tồn tại task này**: agy `-p` headless **KHÔNG tự tạo được brain** cho `--conversation` id lạ (báo `conversation not found` rồi văng). Brain **phải được mồi sẵn 1 lần ở chế độ interactive**. Paperclip reply provider (`runViaAntigravity`) chỉ RESUME brain có sẵn → cần 1 **pool brain mồi sẵn** để cô lập hội thoại theo từng khách / từng agent.

---

## 0. Bối cảnh (đọc để hiểu, KHÔNG cần sửa)

- Adapter Paperclip `antigravity-local` đã build xong (repo `paperclip`, nhánh `feat/antigravity-cli-adapter`). Reply channel route qua `server/src/channels/router.ts` → `runViaAntigravity`.
- Mỗi agent reply (`paperclip_agents.provider='antigravity'`) cần 1 cột `conversation_id` = id của 1 brain **có thật** (đã mồi). Nếu thiếu → provider trả fallback, không reply được.
- Brain nằm ở: `~/.gemini/antigravity-cli/brain/<conversation_id>/` (Windows: `C:\Users\Jennie Chu\.gemini\antigravity-cli\brain\<id>\`).
- Brain "có thật" = thư mục đó tồn tại + có `.system_generated/logs/transcript.jsonl` (agy đã ghi ít nhất 1 lượt).

---

## 1. Mục tiêu

Tạo **1 pool gồm N = 20 brain mồi sẵn** (UUID v4), sẵn sàng gán cho các agent reply / luồng khách. Xuất ra danh sách id để dán vào DB.

> Có thể đổi N tùy nhu cầu. Tối thiểu 5, đề xuất 20 cho dư.

## 2. Việc agy phải làm (tuần tự)

1. **Sinh N = 20 UUID v4** hợp lệ (định dạng `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`). KHÔNG trùng nhau, KHÔNG trùng các brain đã có trong `~/.gemini/antigravity-cli/brain/`.
2. **Mồi từng brain**: với mỗi UUID, tạo brain bằng đúng cơ chế interactive của agy (mở/khởi tạo conversation với id đó — cùng cách `agy --conversation <id>` interactive tạo `brain/<id>/`). Sau khi brain dir được tạo, gửi đúng **1 câu khởi tạo tối thiểu** bằng tiếng Việt (vd: *"Khởi tạo phiên. Trả lời đúng: SẴN SÀNG."*) để agy ghi `transcript.jsonl` (chứng minh brain sống), rồi chuyển sang id kế tiếp.
3. **Verify**: với mỗi UUID, kiểm tra `~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript.jsonl` **tồn tại + có ≥1 dòng**. Brain nào fail → mồi lại hoặc thay UUID mới.
4. **Xuất kết quả**: in ra **2 dạng**:
   - (a) Danh sách JSON: `[{"conversation_id":"<id>","seeded":true}, ...]`
   - (b) Câu lệnh SQL upsert sẵn để Jennie chạy (chèn pool vào 1 bảng mapping — xem §3).

## 3. Lưu pool vào DB (để Paperclip dùng)

Pool dùng cho 2 mục đích: (a) gán cố định 1 brain/agent qua `paperclip_agents.conversation_id`; (b) cấp phát động 1 brain/khách (nếu sau này làm per-customer). agy in ra SQL theo mẫu (Jennie sẽ chạy trên Supabase project `pgfkbcnzqozzkohwbgbk`):

```sql
-- Bảng pool brain (tạo nếu chưa có)
CREATE TABLE IF NOT EXISTS antigravity_brain_pool (
  conversation_id text PRIMARY KEY,
  assigned_to     text,          -- agent slug HOẶC customer session key; null = free
  status          text NOT NULL DEFAULT 'free', -- free | assigned
  seeded_at       timestamptz NOT NULL DEFAULT now()
);

-- Chèn pool vừa mồi (agy điền danh sách id thật vào đây)
INSERT INTO antigravity_brain_pool (conversation_id) VALUES
  ('<id-1>'), ('<id-2>'), ('<id-3>') -- ... đủ N id
ON CONFLICT (conversation_id) DO NOTHING;
```

## 4. Tiêu chí hoàn thành (acceptance)

- [ ] N brain dir tồn tại dưới `~/.gemini/antigravity-cli/brain/` với `transcript.jsonl` ≥1 dòng mỗi cái.
- [ ] In ra danh sách JSON N id + SQL upsert đã điền id thật.
- [ ] (Tùy chọn) Gán thử 1 id cho agent test `antigravity-test`: `UPDATE paperclip_agents SET conversation_id='<id>' WHERE slug='antigravity-test';` rồi báo Jennie test lại reply.

## 5. An toàn

- KHÔNG đụng / ghi đè các brain đang dùng (vd `18dbe41e-5838-44e6-9fcc-57fba1bc573f` = brain test telegram của Jennie, `6486938519` = chat telegram). Chỉ tạo id MỚI.
- KHÔNG xoá brain nào. Chỉ tạo thêm.
- Báo cáo bằng tiếng Việt có dấu.

---

*Tạo bởi Trợ Lý Jennie 15/06/2026 cho phiên build Antigravity adapter. Constraint nguồn: `memory/sops/evolution-log/08-windows.md` (agy headless không tạo brain).*
