# Project Runbook

Operational reference for Paperclip server + UI. Everything an on-call operator
needs to flip features, diagnose issues, and roll back.

## Deployment Procedures

### Local development

```bash
pnpm install
pnpm --filter @paperclipai/server dev   # tsx watch on src/index.ts
pnpm --filter @paperclipai/ui dev       # vite dev server on port 5173
```

### Daemonized (PM2)

```bash
cd server
pm2 start ecosystem.config.cjs
pm2 save                                # persist across reboot
pm2 status
pm2 logs paperclip-server --lines 50
```

Restart after env change:

```bash
pm2 restart ecosystem.config.cjs --update-env
```

### Production build

```bash
pnpm run build                          # typecheck + workspace builds
bash scripts/prepare-server-ui-dist.sh  # build UI → copy to server/ui-dist
pm2 restart paperclip-server
```

## Health Checks

| Endpoint | Returns |
|----------|---------|
| `GET /api/health` | `{ status, version, deploymentMode, authReady, bootstrapStatus, features }` |
| `GET /api/companies/{companyId}/delegations` | List (200 empty array OK even when delegation flag off) |

## Delegation Feature — Flip Procedure

The delegation feature (inline CEO → subagent handoff via MCP tools) ships
behind a flag. Full spec: `crypto-pattern-scanner/memory/reports/2026-04-21-delegate-to-agent-plan.md`.
Rollout runbook: `crypto-pattern-scanner/memory/reports/2026-04-21-delegation-rollout-runbook.md`.

**Pre-flip checks:**

1. `node -v` in paperclip dir → ≥ `v18.0.0` (MCP handler uses global `fetch`).
2. `pm2 describe paperclip-server` → confirm service healthy, uptime reasonable.
3. `curl -s http://127.0.0.1:3100/api/health | jq .status` → `ok`.
4. Flag currently off: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3100/api/delegations -H "content-type: application/json" -d '{}'` → `503`.

**Flip:**

Edit `server/ecosystem.config.cjs` env block:

```js
env: {
  // ... existing entries ...
  PAPERCLIP_DELEGATION_ENABLED: 'true',
}
```

Restart with env update:

```bash
pm2 restart ecosystem.config.cjs --update-env
```

**Post-flip smoke:**

```bash
# Should now return 400 (zod validation), not 503 (flag gate)
curl -s -X POST http://127.0.0.1:3100/api/delegations \
  -H "x-paperclip-run-id: <real-run-id>" \
  -H "content-type: application/json" \
  -d '{}' | jq .
```

**Rollback:**

Remove `PAPERCLIP_DELEGATION_ENABLED` or set to `false`, then restart. Active
delegations can be batch-cancelled via Supabase SQL — see runbook §Emergency
kill switch.

## Common Issues and Fixes

<!-- AUTO-GENERATED START : RUNBOOK -->

### Postgres connection failure

Symptom: server startup errors with `ECONNREFUSED` or `password authentication failed`.

Fix: verify `DATABASE_URL` matches the Supabase project. If using the pooler,
ensure the pooled user has the right password. Paperclip uses the **session
pooler on port 5432**, not the transaction pooler.

### Port 3100 already in use

```bash
npx kill-port 3100
pm2 restart paperclip-server
```

### Vietnamese / emoji mojibake in agent comments

Symptom: CTO / CEO agent comments appear as `"? **hoàn thành**"` → `"? ho�n th�nh"` in DB + UI.

Root cause: Windows cp1252 codepage was stripping Unicode in Claude CLI
subprocess stdin/stdout.

Fix (already applied in `packages/adapter-utils/src/server-utils.ts`
`buildPaperclipEnv()`): sets `LANG`, `LC_ALL`, `PYTHONIOENCODING`, `PYTHONUTF8`
on every agent subprocess spawn. If you see mojibake again, verify these vars
are present in `pm2 env 0` output. Reference: BUG-051 in
`crypto-pattern-scanner/paperclip-dashboard/architecture/troubleshooting_tips.md`.

### UI build fails with `esbuild remove ... Access is denied` on Windows

Symptom: `pnpm --filter @paperclipai/ui build` → 6422 modules transform, then
esbuild cleanup fails on Windows Defender lock.

Workaround: serve UI via Vite dev middleware instead of static `ui-dist/`.

```bash
# In ecosystem.config.cjs env block:
PAPERCLIP_UI_DEV_MIDDLEWARE: 'true'
```

Restart. Page loads are slower (~10s first-compile) but HMR works. Permanent
fix: add paperclip repo folder to Windows Defender exclusions, or downgrade
esbuild.

### Sidebar company-prefix routing — bare path redirects to `/UPPERCASE/dashboard`

Symptom: `/delegations` redirects to `/DELEGATIONS/dashboard`.

Fix: add the route root to `ui/src/lib/company-routes.ts` `BOARD_ROUTE_ROOTS`.
Rebuild / HMR-reload UI.

### Radix Dialog / Sheet crash

Known issue. Avoid Radix `Dialog` + `Sheet` modal surfaces where possible.
Prefer separate routes (`/delegations/:traceId` instead of drawer). See
`crypto-pattern-scanner/MEMORY.md` for the full note.

### Delegation stuck `in_progress` > 30min

Check the `agent_wakeup_requests` table for the target agent — is the wake
event present? If yes but run never started, target agent may have crashed
mid-run. Cancel manually via Supabase SQL:

```sql
update issues set status='cancelled', cancelled_at=now()
where origin_id='<traceId>' and status in ('todo','in_progress');
```

### Agent spawns black cmd.exe popup (Windows)

Covered by BUG-027 fix — `windowsHide: true` on every `spawn()` call. If
recurring, check `packages/adapter-utils/src/server-utils.ts`
`runChildProcess()` call still passes `windowsHide: true`.

<!-- AUTO-GENERATED END -->

## Monitoring

- `pm2 logs paperclip-server --lines 200 --nostream` — recent structured logs
- `~/.paperclip/logs/server.log` — persisted Pino output
- Supabase project `pgfkbcnzqozzkohwbgbk` — primary DB, check `heartbeat_runs` +
  `agent_wakeup_requests` for agent activity

## Rollback Procedures

### Feature-level rollback (delegation, UTF-8, etc.)

```bash
# Identify the commit(s) to revert
git log --oneline master | head -30

# Revert one commit
git revert <sha>
git push origin master
pm2 restart paperclip-server
```

### Hard rollback (restore from backup tag)

```bash
# Backup tags created at major checkpoints, e.g.
# backup/pre-delegate-2026-04-21-1730
git fetch --tags
git reset --hard <tag>
pm2 restart paperclip-server
```

### Database restore

Paperclip's scheduled `pg_dump` lands in `$PAPERCLIP_DB_BACKUP_DIR`. Restore
via `psql -f <backup.sql>` after stopping the server.

## Escalation Paths

- P0 incidents (agent loop, data loss, auth bypass) → ping Jennie on Telegram
  via `agents/ceo/telegram-notify.py` or the escalation handler
  (`server/src/channels/crm/escalation-handler.ts` — auto-invoked when agents
  emit `[[ESCALATE:]]` marker).
- Service outage → restart via PM2; if restart loop, `pm2 stop` and
  investigate logs before re-enabling autorestart.
- Billing / cost spike → check `costs` table + disable feature flags (e.g.
  `PAPERCLIP_DELEGATION_ENABLED=false`, `HEARTBEAT_SCHEDULER_ENABLED=false`).
