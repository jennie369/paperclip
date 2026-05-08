# @paperclipai/ui

Published static assets for the Paperclip board UI.  
**Version:** 0.3.1 · **License:** MIT

## What gets published

The npm package contains the production build under `dist/`. It does not ship the UI source tree or workspace-only dependencies.

## Typical use

Install the package, then serve or copy the built files from `node_modules/@paperclipai/ui/dist`.

---

<!-- AUTO-GENERATED: scripts table — do not edit manually -->
## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | TypeScript check (`tsc -b`) + Vite production build → `dist/` |
| `pnpm preview` | Serve the `dist/` build locally for smoke-testing |
| `pnpm typecheck` | Run TypeScript type-check only (no emit) |
| `pnpm clean` | Delete `dist/` and `tsconfig.tsbuildinfo` |
| `pnpm prepack` | (CI) Swap to publish-safe `package.json` before `pnpm pack` |
| `pnpm postpack` | (CI) Restore dev `package.json` after packing |

> **Rebuild after UI changes:**
> ```bash
> pnpm exec vite build
> pm2 restart paperclip-server
> ```
<!-- END AUTO-GENERATED -->

---

<!-- AUTO-GENERATED: env vars — do not edit manually -->
## Environment Variables

Copy `.env.example` → `.env` and fill in values. **Never commit `.env`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anon/public key |
| `VITE_GEMRAL_SUPABASE_URL` | No | Override URL khi embed vào Gemral frontend |
| `VITE_GEMRAL_SUPABASE_ANON_KEY` | No | Override anon key khi embed vào Gemral frontend |
| `VITE_RESEND_API_KEY` | No | Resend API key cho Content Pipeline email preview |
<!-- END AUTO-GENERATED -->

---

## Contributing

### Prerequisites
- **Node.js** 20+
- **pnpm** 9+ (`npm i -g pnpm`)
- Access to the Supabase project (`pgfkbcnzqozzkohwbgbk`)

### Setup
```bash
# Clone mono-repo
git clone https://github.com/paperclipai/paperclip
cd paperclip

# Install all workspace deps
pnpm install

# Copy env
cp ui/.env.example ui/.env
# → điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY

# Start dev server
cd ui && pnpm dev
```

### Code style
- TypeScript strict mode — no `any` unless unavoidable
- Tiếng Việt có dấu cho tất cả UI text / comment content
- Component files: PascalCase · hooks: `use` prefix · utils: camelCase

### Before submitting PR
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm build` succeeds
- [ ] Không sửa `frontend/src/paperclip-ui/**` trực tiếp (SSOT ở repo này)
- [ ] Không commit secrets / API keys

---

## Runbook

### Deploy (local → production)
```bash
# 1. Build
cd ui && pnpm exec vite build

# 2. Restart server (safe wrapper — tránh self-reap)
python ../scripts/safe_rebuild_paperclip_ui.py --delay 3

# Hoặc manual:
pm2 restart paperclip-server
```

### Health check
```
GET http://localhost:<PORT>/    → 200 OK (serves index.html)
```

### Common issues

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| Blank page sau deploy | Build cũ còn cache | `pnpm clean && pnpm build` |
| `Missing VITE_SUPABASE_URL` trong console | `.env` chưa có hoặc sai key | Kiểm tra `ui/.env` |
| TypeScript error khi build | Kiểu mới thêm chưa đúng | Chạy `pnpm typecheck` để xem chi tiết |
| Preview iframe freeze khi mở | Email HTML quá nặng (>100KB) | Expected — browser parse complex table layout |
| `pm2` tự kill sau restart | Self-reap bug (GEM-372) | Dùng `safe_rebuild_paperclip_ui.py --delay 3` |

### Rollback
```bash
git log --oneline -5      # tìm commit cần revert
git revert <sha>
pnpm exec vite build
pm2 restart paperclip-server
```

---

*Last updated: 2026-05-07 — auto-generated sections from source code.*
