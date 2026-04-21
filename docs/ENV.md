# Environment Variables Documentation

Paperclip reads configuration from `.env` in `$PAPERCLIP_HOME` (or `server/` for
workspace mode), with overrides from the shell environment. The PM2 ecosystem
file at `server/ecosystem.config.cjs` sets runtime env for daemonized
deployments.

<!-- AUTO-GENERATED START : ENV SETUP -->

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string for Drizzle ORM. Supports pgBouncer pooler URLs. | `postgres://postgres:secret@localhost:5432/paperclip` |
| `GEMRAL_SUPABASE_URL` | Supabase project URL (same project as `DATABASE_URL` but the HTTP API). | `https://pgfkbcnzqozzkohwbgbk.supabase.co` |
| `GEMRAL_SUPABASE_SERVICE_KEY` | Supabase service-role JWT (bypasses RLS). Required by MCP server + CRM tools. | `eyJhbGciOi...` |

## Optional — Server runtime

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind host for the HTTP server. `0.0.0.0` to expose LAN. |
| `PORT` | `3100` | Application listening port. |
| `PAPERCLIP_LISTEN_HOST` | — | Alias for `HOST` used by `buildPaperclipEnv` when deriving `PAPERCLIP_API_URL`. |
| `PAPERCLIP_LISTEN_PORT` | — | Alias for `PORT` used by `buildPaperclipEnv`. |
| `PAPERCLIP_API_URL` | `http://<host>:<port>` | Inherited by agent subprocesses for HTTP callbacks (MCP stdio → parent server). |
| `SERVE_UI` | `true` | Whether the server statically serves `ui-dist/`. Set `false` for API-only. |
| `PAPERCLIP_UI_DEV_MIDDLEWARE` | `false` | Use Vite dev middleware instead of `ui-dist/`. Workaround when esbuild build fails on Windows (Defender blocks temp cleanup). |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | `local_trusted` \| `authenticated`. Controls auth strictness. |
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `private` | `private` \| `public`. |
| `PAPERCLIP_ALLOWED_HOSTNAMES` | — | Comma-separated hostnames permitted in `authenticated` mode. |
| `PAPERCLIP_LOG_DIR` | `~/.paperclip/logs` | Pino logger output directory. |

## Optional — Heartbeat + agents

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_SCHEDULER_ENABLED` | `true` | Toggle the background agent heartbeat scheduler. |
| `HEARTBEAT_SCHEDULER_INTERVAL_MS` | `30000` | Interval (ms) between scheduler polls. Min `10000`. |
| `PAPERCLIP_AGENT_ID` | — | Injected per-agent-spawn by `buildPaperclipEnv`; not a user setting. |
| `PAPERCLIP_COMPANY_ID` | — | Injected per-agent-spawn. |
| `PAPERCLIP_RUN_ID` | — | Injected per-heartbeat-run. MCP subprocess uses it as `x-paperclip-run-id` header. |
| `PAPERCLIP_TASK_ID` | — | Injected when wake context includes an issue. |
| `PAPERCLIP_WAKE_REASON` | — | Injected. Human-readable wake cause. |
| `PAPERCLIP_WAKE_COMMENT_ID` | — | Injected when wake is triggered by a new comment. |
| `PAPERCLIP_APPROVAL_ID` | — | Injected when run processes an approval. |
| `PAPERCLIP_APPROVAL_STATUS` | — | Injected with the approval state. |
| `PAPERCLIP_LINKED_ISSUE_IDS` | — | Comma-separated issues linked to an approval. |
| `PAPERCLIP_WORKSPACE_CWD` | — | Workspace cwd for the agent run. |

## Optional — UTF-8 locale (set automatically by `buildPaperclipEnv`)

Agents spawned on Windows inherit these to stop cp1252 codepage from mangling
Vietnamese + emoji in comments / outputs. Override only if you have a reason.

| Variable | Default | Description |
|----------|---------|-------------|
| `LANG` | `en_US.UTF-8` | POSIX locale (affects libc string handling). |
| `LC_ALL` | `en_US.UTF-8` | Forces all LC_* categories. |
| `PYTHONIOENCODING` | `utf-8` | Python stdin/stdout encoding. |
| `PYTHONUTF8` | `1` | Python UTF-8 mode. |

## Optional — Delegation feature (`delegate_to_agent` / `await_delegation`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PAPERCLIP_DELEGATION_ENABLED` | `false` | Master switch. When `false`, every mutating delegation route returns `503`. The read-only list + detail endpoints remain available for the UI. |
| `PAPERCLIP_DELEGATION_DEFAULT_TIMEOUT_MS` | `300000` | Default timeout applied when a delegation is created without an explicit value. Min `30_000`. |
| `PAPERCLIP_DELEGATION_MAX_TIMEOUT_MS` | `1800000` | Hard upper bound. Delegations requesting longer get clamped. |
| `PAPERCLIP_DELEGATION_MAX_CONCURRENT` | `10` | Max active delegations per caller agent. Exceeds returns `409 Conflict`. |
| `PAPERCLIP_DELEGATION_MAX_DEPTH` | `3` | Max chain depth (A→B→C→D blocked at depth 4). Cycle detection still runs regardless. |

## Optional — Storage + secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `PAPERCLIP_STORAGE_PROVIDER` | `local_disk` | `local_disk` \| `s3`. |
| `PAPERCLIP_STORAGE_LOCAL_DIR` | `~/.paperclip/storage` | Local disk root for attachments. |
| `PAPERCLIP_STORAGE_S3_BUCKET` | `paperclip` | S3 bucket name (when provider=s3). |
| `PAPERCLIP_STORAGE_S3_REGION` | `us-east-1` | — |
| `PAPERCLIP_STORAGE_S3_ENDPOINT` | — | Custom endpoint (MinIO / R2). |
| `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | `false` | — |
| `PAPERCLIP_SECRETS_PROVIDER` | `local_encrypted` | — |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | `~/.paperclip/secrets.key` | Path to master key file. |
| `PAPERCLIP_SECRETS_STRICT_MODE` | `false` | If `true`, startup fails when encrypted secrets can't decrypt. |

## Optional — Database backup

| Variable | Default | Description |
|----------|---------|-------------|
| `PAPERCLIP_DB_BACKUP_ENABLED` | `true` | Toggle periodic `pg_dump` of the server DB. |
| `PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES` | `60` | — |
| `PAPERCLIP_DB_BACKUP_RETENTION_DAYS` | `30` | — |
| `PAPERCLIP_DB_BACKUP_DIR` | `~/.paperclip/backups` | — |

## Optional — Integrations

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend email API key, used by `send_email` MCP tool + onboarding emails. |
| `SHOPIFY_STORE_URL` | Shopify domain (no scheme), e.g. `gemral-store.myshopify.com`. |
| `SHOPIFY_ACCESS_TOKEN` | Shopify admin API token for `search_product` / `lookup_order_shopify`. |
| `ANTHROPIC_API_KEY` | Alternative to Claude CLI subscription; presence switches billing mode. |

<!-- AUTO-GENERATED END -->

## Where these land in `ecosystem.config.cjs`

The PM2 ecosystem file sets the runtime env for daemonized deployments. Edit
the `env` block to override defaults, then `pm2 restart paperclip-server
--update-env`. See `RUNBOOK.md` §"Delegation flip procedure" for an example.
