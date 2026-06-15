# SSOT SPEC — Antigravity (`agy`) Adapter cho Paperclip

> **Trạng thái**: SHIPPED (nhánh `feat/antigravity-cli-adapter`, repo `paperclip`, push `jennie369/paperclip`). Commits `0c0d7dd73` → `56bbbe208` (2026-06-15/16).
> **Đây là SSOT** cho mọi thứ liên quan adapter Antigravity. Plan gốc: `antigravity-cli-adapter-plan.md`. Brain-pool: `agy-brain-pool-task.md`. Bài học: `memory/sops/evolution-log/01-paperclip.md` + `08-windows.md`.

---

## 1. Adapter là gì

Cho Paperclip dùng **Antigravity CLI** (`agy`, engine Gemini 3.1 Pro High qua Google AI Ultra) làm engine ở **2 mặt trận**:

| Mặt trận | Cơ chế | Adapter type / provider | File chính |
|---|---|---|---|
| **A — Heartbeat/worker** | `packages/adapters/<type>/execute.ts` | adapter_type = `antigravity_local` | `packages/adapters/antigravity-local/` |
| **B — Reply channel (CSKH)** | `server/src/channels/router.ts` | provider = `antigravity` | `runViaAntigravity()` |

Adapter clone từ `gemini-local` nhưng theo **mô hình Claude Code** (tự đọc file context) — KHÁC gemini (nhồi stdin).

---

## 2. Facts đã verify (KHÔNG đoán lại)

- **Binary**: `%LOCALAPPDATA%\agy\bin\agy.exe` (v1.0.8). Adapter fallback full-path khi `agy` không có trên PATH của process server (PM2/Task Scheduler context).
- **Model**: truyền `--model "<chuỗi nguyên văn>"`. Default = `Gemini 3.1 Pro (High)`. Full list (8) từ IDE dropdown:
  `Gemini 3.1 Pro (High)` · `Gemini 3.1 Pro (Low)` · `Gemini 3.5 Flash (High)` · `Gemini 3.5 Flash (Medium)` · `Gemini 3.5 Flash (Low)` · `Claude Sonnet 4.6 (Thinking)` · `Claude Opus 4.6 (Thinking)` · `GPT-OSS 120B (Medium)`. (Reasoning level nằm TRONG tên model → KHÔNG cần thinking-effort selector riêng.)
- **Prompt**: `-p "<arg>"` ARG-only (KHÔNG đọc stdin). Dài → **trỏ file**: `-p "Đọc <file> rồi trả lời: <msg>"` → agy `view_file` đọc full (vô hạn).
- **MCP**: global `~/.gemini` (`mcp-server-enablement.json`). Tool naming **1 gạch dưới** `mcp_<server>_<tool>` (KHÁC Claude `mcp__server__tool`).
- **CWD = PROJECT_ROOT OK** (agy file tools native, không scan nặng/crash như gemini).
- **Auth**: Google OAuth shared (đã login Ultra) ở `~/.gemini`.
- **Output**: text qua **TTY (CONOUT$)** — xem §3.

---

## 3. ⚠️ HAI CONSTRAINT WINDOWS (cốt lõi, dễ sai)

### 3.1 TTY trap — stdout pipe RỖNG
agy in reply thẳng ra **CONOUT$ (TTY)** → subprocess `stdout` pipe **rỗng**. → **PHẢI đọc reply từ brain transcript**:
`~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript.jsonl`.
Gom mọi `PLANNER_RESPONSE` (source=`MODEL`) **SAU** dòng `USER_INPUT` của ĐÚNG run này. Phân biệt run trong brain dùng-chung bằng **turnMarker** = tên temp-prompt-file unique (`agy_prompt_<runId>.md` / `agy_reply_<slug>_<ts>.md`) nằm trong nội dung USER_INPUT. Poll-retry chờ flush.

### 3.2 Brain — agy TỰ tạo với id RIÊNG (đính chính 2026-06-16)
`agy -p --conversation <id>`: nếu brain id đó **tồn tại → resume** đúng id; nếu **CHƯA tồn tại → agy BỎ QUA id truyền, TỰ TẠO brain với id auto-gen riêng** và chạy ở đó. → Adapter đọc transcript ở id-mình-truyền = RỖNG (agy ghi vào brain khác).
→ **Fix (KHÔNG cần mồi tay)**: sau run, `findAntigravityReplyByTurnMarker(turnMarker)` SCAN brain dirs (mới nhất trước), tìm brain có `USER_INPUT` chứa **turnMarker** (tên temp-prompt-file unique) → brain THẬT → reply + **persist id thật** cho resume (continuity cross-heartbeat). Áp dụng cả Part A (execute.ts) lẫn Part B (router.ts).
→ Resolution: honor `config.conversationId`/`paperclip_agents.conversation_id` **CHỈ khi brain đó tồn tại** (pre-seeded); else persisted-real-id (resume) / runId (lần đầu → auto-create + persist).
→ **Hệ quả**: per-agent heartbeat tự có brain (auto-create + persist) — KHÔNG cần seed tay. Pool brain mồi sẵn (`agy-brain-pool-task.md`) giờ **tùy chọn** (chỉ khi muốn pre-assign brain cụ thể / per-customer isolation cứng cho Part B).

---

## 4. Kiến trúc execute (Part A heartbeat)

1. command = `defaultAgyCommand()` (full-path fallback). model = config.model || default.
2. Ghi `prompt` (skill-pointer + persona/instructions + memory) ra temp file `os.tmpdir()/agy_prompt_<runId>.md`.
3. `buildArgs`: `["-p", pointerPrompt, "--model", model, "--dangerously-skip-permissions", "--conversation", convId, "--add-dir", <tmpDir>, "--add-dir", <agentDir>]`. KHÔNG `--output-format`/`--approval-mode`/`--sandbox`/`--resume`/`--prompt ""` (gemini-only).
4. extraArgs filter blacklist flag gemini/claude-only.
5. convId = `config.conversationId` || (resume session) || runId.
6. Sau run: reply + usage từ transcript (turnMarker). Leak-guard. **Nhét reply vào `resultJson.summary`** (heartbeat `buildRunSummaryComment` đọc field này).
7. Reuse: skills inject `~/.gemini/skills`, MCP sync, includeDirectories, persona-hash session invalidation, billing subscription.

## 5. Kiến trúc runViaAntigravity (Part B reply)

CWD=PROJECT_ROOT · ghi systemPrompt+history ra temp file → `-p "Đọc <file>. Trả lời: <identityHeader+message>"` · `--conversation <paperclip_agents.conversation_id>` (BẮT BUỘC, thiếu → fallback) · reply từ transcript (turnMarker = tên temp file) · leak-guard · reuse `buildSystemPrompt`/`buildIdentityHeader`/`postProcessReply`/`buildProviderOverride`/escalation. spawnHidden full-path agy, no stdin.

**Caveat isolation**: B v1 = 1 brain mồi/agent + inject full context mỗi call. 2 khách CÙNG brain có rủi ro bleed (agy ưu tiên brain-memory) → **chưa test no-bleed**. Production scale → pool brain per-khách.

---

## 6. ✅ CHECKLIST 10 CỔNG WIRING (thêm adapter/provider mới = grep `gemini_local`/`gemini` toàn repo, replicate MỌI hit)

**Adapter package** (`packages/adapters/antigravity-local/`): index.ts (type/label/DEFAULT_MODEL/models/doc) · server/execute.ts · server/parse.ts · server/skills.ts · server/test.ts · server/index.ts (exports) · ui/build-config.ts · ui/parse-stdout.ts · cli/format-event.ts.

**Server**: `adapters/registry.ts` (import + register + array) · `packages/shared/src/constants.ts` `AGENT_ADAPTER_TYPES` · `routes/agents.ts` (default model + `instructionsFilePath` map) · `services/company-portability.ts` (`ADAPTER_DEFAULT_RULES_BY_TYPE`) · **reply**: `channels/router.ts` (loadAgentConfig provider-map + `conversation_id` + switch case + `runViaAntigravity`) · `channels/types.ts` (`AgentProvider` union + `AgentConfig.conversation_id` + `PROVIDER_MODELS`) · `channels/agent-config-routes.ts` (create/patch/GET whitelist `conversation_id`).

**UI** (`ui/src/`): `adapters/registry.ts` + `adapters/antigravity-local/{index.ts,config-fields.tsx}` · `components/AgentConfigForm.tsx` (`ENABLED_ADAPTER_TYPES` · `isLocal` · `showThinkingEffort` · command-placeholder · default-model-on-switch ×2 nhánh · import DEFAULT_MODEL) · `pages/InviteLanding.tsx` (`ENABLED_INVITE_ADAPTERS`) · `pages/agents/AgentEditPage.tsx` (`PROVIDERS` + conversation_id field + command-for-provider) · `api/agentConfigs.ts` (`AgentProvider` + `PROVIDER_LABELS` + `PROVIDER_MODELS` + `AgentConfig.conversation_id`).

**package.json deps**: server + ui + cli thêm `@paperclipai/adapter-antigravity-local`. `packages/adapter-utils/src/types.ts` `CreateConfigValues.conversationId`.

**DB** (Supabase `pgfkbcnzqozzkohwbgbk`): `paperclip_agents_provider_check` CHECK ALTER thêm `'antigravity'` · `ALTER TABLE paperclip_agents ADD COLUMN conversation_id text`. Migration files: `supabase/migrations/2026061523*` (crypto repo).

> **Verify**: `pnpm typecheck` adapter+server+ui xanh · `GET /companies/:id/adapters/antigravity_local/models` trả 8 model · heartbeat dummy run + reply test e2e.

---

## 7. Test đã pass

- **A8**: agent dummy `antigravity-test` (adapter_type) → agy đọc AGENTS.md file-pointer (`MARKER_AGY_OK_2026`) + reply tiếng Việt. Brain `18dbe41e-5838-44e6-9fcc-57fba1bc573f`.
- **B5**: `POST /api/channels/agent-configs/antigravity-test/test` → provider=antigravity → agy reply CSKH tiếng Việt đúng persona, no leak, ~32s.

## 8. Rollout / an toàn

Giữ `gemini-local`/`claude` nguyên làm fallback. Bật agy cho 1 agent test trước. Quota Ultra hết → đổi provider qua UI (cache 60s, không restart). Part B lỗi trên khách → set provider về `gemini`/`claude` (1 dòng DB). Server chạy `tsx src` → `pm2 restart paperclip-server` nạp code; UI đổi → `pnpm --filter @paperclipai/ui build` + `scripts/prepare-server-ui-dist.sh` + restart (index.html cache lúc startup).

## 9. TODO còn lại

- [ ] Chạy `agy-brain-pool-task.md` (agy IDE) → mồi pool brain → gán brain riêng/agent.
- [ ] Test no-bleed 2 khách đồng thời.
- [ ] Verify MCP tool-call (`mcp_supabase_*`) + escalation `[[ESCALATE]]`→`crm_tickets` headless.

---

*SSOT viết bởi Trợ Lý Jennie 16/06/2026.*
