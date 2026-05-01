// Registry Options — SSOT dropdown values for all Workflow Step fields.
//
// Every dropdown in SopStepsEditor reads from this module. All 9 categories
// (notify_channels, hooks, preconditions, trigger_types, cron_expressions,
// executor_types, db_tables, input_sources, output_destinations) are now
// DB-backed via the `dropdown_options` table — no more hardcoding. The
// constants below remain as LAST-RESORT fallbacks if the API is down.
//
// To add a new option, user should use Registry Marketplace → Dropdown
// Options sub-tab (creates a row in dropdown_options table), NOT edit code.
//
// This enforces SSOT consistency — no free-text for values that should be
// consistent across the whole system.

import { useQuery } from '@tanstack/react-query';

// ─── DB-backed catalog fetch ──────────────────────────────────────────────

async function fetchDropdownCategory(category: string): Promise<DropdownOption[]> {
  try {
    const res = await fetch(`/api/registry/dropdown-options/by-category/${category}`);
    if (!res.ok) return [];
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      value: r.value,
      label: r.label,
      description: r.description || undefined,
      category: r.metadata?.category || undefined,
    }));
  } catch {
    return [];
  }
}

export function useDropdownOptions(category: string) {
  return useQuery({
    queryKey: ['registry', 'dropdown-options', category],
    queryFn: () => fetchDropdownCategory(category),
    staleTime: 60_000,
  });
}

// Convenience hooks — one per category
export const useNotifyChannels = () => useDropdownOptions('notify_channels');
export const useHookOptions = () => useDropdownOptions('hooks');
export const usePreconditionOptions = () => useDropdownOptions('preconditions');
export const useTriggerTypeOptions = () => useDropdownOptions('trigger_types');
export const useCronExpressionOptions = () => useDropdownOptions('cron_expressions');
export const useExecutorTypeOptions = () => useDropdownOptions('executor_types');
export const useDbTableOptions = () => useDropdownOptions('db_tables');
export const useInputSourceOptions = () => useDropdownOptions('input_sources');
export const useOutputDestinationOptions = () => useDropdownOptions('output_destinations');

// ─── Types ────────────────────────────────────────────────────────────────

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

export interface RegistryCatalog {
  agents: DropdownOption[];
  crons: DropdownOption[];
  sops: DropdownOption[];
  dbTables: DropdownOption[];
  notifyChannels: DropdownOption[];
  hooks: DropdownOption[];
  preconditions: DropdownOption[];
  triggerTypes: DropdownOption[];
  cronExpressions: DropdownOption[];
  executorTypes: DropdownOption[];
  inputSources: DropdownOption[];
  outputDestinations: DropdownOption[];
}

// ─── Static catalogs (no DB, curated) ─────────────────────────────────────

/**
 * Known notification channels. To add a new one, it must also be registered
 * in the Registry Marketplace (Phase 3). Hard-coded now for SSOT consistency.
 */
export const NOTIFY_CHANNELS: DropdownOption[] = [
  { value: 'telegram:jennie',     label: '📱 Telegram → Jennie',       description: 'DM cá nhân cho Jennie (@baobao_lawbewbew)' },
  { value: 'telegram:team',       label: '📱 Telegram → Team',         description: 'Group chat GEM Team' },
  { value: 'telegram:public',     label: '📱 Telegram → Public',       description: 'Channel công khai GEM Trading' },
  { value: 'email:resend',        label: '📧 Email via Resend',        description: 'Gửi email qua api.resend.com' },
  { value: 'zalo_personal:send',  label: '💬 Zalo Personal',           description: 'Gửi tin nhắn Zalo qua cookie auth' },
  { value: 'facebook:messenger',  label: '💬 Facebook Messenger',      description: 'FB Graph API send message' },
  { value: 'push:mobile_app',     label: '🔔 Expo Push (mobile app)',  description: 'Push notification cho Gemral mobile app' },
  { value: 'forum:auto_post',     label: '💭 Gemral Forum',            description: 'Auto-post lên gemral.com/forum' },
  { value: 'war_room:channel',    label: '⚔️ War Room Channel',        description: 'Post vào war_room_channels table (Phase 5.5)' },
  { value: 'activity_log:write',  label: '📝 Activity Log',            description: 'Ghi vào activity_log table (audit trail)' },
];

/**
 * Known hook types — "what to do after step completes".
 * To add custom: register in Marketplace → Hooks sub-tab (Phase 3).
 */
export const HOOKS: DropdownOption[] = [
  { value: 'notify:telegram:jennie',  label: '📱 Notify Jennie (Telegram)',   description: 'Gửi DM cho Jennie khi step xong' },
  { value: 'notify:email',            label: '📧 Notify via Email',           description: 'Gửi email notification' },
  { value: 'notify:zalo',             label: '💬 Notify via Zalo',            description: 'Gửi tin nhắn Zalo' },
  { value: 'retry:3',                 label: '🔁 Retry 3 times',              description: 'Tự động retry 3 lần nếu fail' },
  { value: 'retry:5',                 label: '🔁 Retry 5 times',              description: 'Tự động retry 5 lần nếu fail' },
  { value: 'escalate:ticket',         label: '🚨 Create CRM ticket',          description: 'Tự tạo crm_tickets khi fail' },
  { value: 'escalate:jennie',         label: '🚨 Escalate to Jennie',         description: 'Ping @jennie qua Telegram với context' },
  { value: 'write_log:activity_log',  label: '📝 Write to activity_log',      description: 'Append row vào activity_log table' },
  { value: 'write_log:training_log',  label: '📝 Write to training-log.md',   description: 'Append vào file training log (cho agent learning)' },
  { value: 'webhook:custom',          label: '🪝 Custom webhook callback',    description: 'POST tới URL tùy chỉnh với result' },
  { value: 'chain:next_sop',          label: '🔗 Trigger next SOP',           description: 'Auto-run SOP khác sau khi xong' },
  { value: 'chain:pipeline',          label: '🔗 Trigger pipeline',           description: 'Fan-out tới pipeline khác' },
  { value: 'wait:approval',           label: '✋ Wait for approval',           description: 'Pause pipeline, chờ human approve' },
];

/**
 * Known pre-condition patterns. Custom ones register via Marketplace (Phase 3).
 */
export const PRECONDITIONS: DropdownOption[] = [
  { value: 'step:previous:done',      label: '✅ Step trước đã xong',         description: 'Step liền trước trong SOP phải status=success' },
  { value: 'approval:jennie',         label: '👑 Jennie approved',             description: 'Phải có approval từ jennie_chu' },
  { value: 'approval:any_admin',      label: '👤 Any admin approved',         description: 'Bất kỳ admin nào approve cũng được' },
  { value: 'file:exists',             label: '📄 File tồn tại',               description: 'Check file path tồn tại trước khi chạy' },
  { value: 'db:row_exists',           label: '🗃️ DB row exists',               description: 'Query check row trong DB' },
  { value: 'agent:available',         label: '🤖 Agent not busy',             description: 'Target agent status=idle' },
  { value: 'budget:sufficient',       label: '💰 Budget còn đủ',              description: 'Budget còn > min threshold' },
  { value: 'cron:inside_window',      label: '⏰ Đang trong giờ hoạt động',    description: 'Chỉ chạy 8h-20h Mon-Fri' },
  { value: 'feature_flag:enabled',    label: '🚩 Feature flag ON',            description: 'Check system_config flag' },
  { value: 'quota:not_exceeded',      label: '📊 Chưa vượt quota',            description: 'Rate limit hoặc quota còn available' },
];

/**
 * Trigger types for Field 8.
 */
export const TRIGGER_TYPES: DropdownOption[] = [
  { value: 'manual',   label: '👆 Manual',             description: 'Chạy thủ công khi bấm nút' },
  { value: 'cron',     label: '⏰ Cron schedule',       description: 'Theo cron expression (5 field)' },
  { value: 'event',    label: '⚡ Event',               description: 'Trigger bởi DB event / Supabase Realtime' },
  { value: 'webhook',  label: '🪝 Webhook',            description: 'HTTP POST từ external service' },
  { value: 'after',    label: '➡️ After previous step', description: 'Chạy ngay sau step trước done' },
  { value: 'queue',    label: '📬 Queue poll',         description: 'Poll queue table mỗi N giây' },
  { value: 'db_trigger', label: '🔔 DB trigger',        description: 'Postgres trigger on insert/update' },
];

/**
 * Common cron expressions pre-built. User can still type custom.
 */
export const CRON_EXPRESSIONS: DropdownOption[] = [
  { value: '* * * * *',          label: 'Mỗi phút' },
  { value: '*/5 * * * *',        label: 'Mỗi 5 phút' },
  { value: '*/15 * * * *',       label: 'Mỗi 15 phút' },
  { value: '*/30 * * * *',       label: 'Mỗi 30 phút' },
  { value: '0 * * * *',          label: 'Mỗi giờ (phút 0)' },
  { value: '0 */2 * * *',        label: 'Mỗi 2 giờ' },
  { value: '0 */6 * * *',        label: 'Mỗi 6 giờ' },
  { value: '0 0 * * *',          label: 'Mỗi ngày lúc 00:00' },
  { value: '0 6 * * *',          label: 'Mỗi ngày lúc 06:00' },
  { value: '0 7 * * *',          label: 'Mỗi ngày lúc 07:00' },
  { value: '0 8 * * *',          label: 'Mỗi ngày lúc 08:00' },
  { value: '0 9 * * *',          label: 'Mỗi ngày lúc 09:00' },
  { value: '0 17 * * *',         label: 'Mỗi ngày lúc 17:00' },
  { value: '0 20 * * *',         label: 'Mỗi ngày lúc 20:00' },
  { value: '0 23 * * *',         label: 'Mỗi ngày lúc 23:00' },
  { value: '0 8 * * 1',          label: 'Mỗi thứ 2 lúc 08:00' },
  { value: '0 20 * * 0',         label: 'Mỗi Chủ Nhật lúc 20:00' },
  { value: '0 0 * * 1',          label: 'Mỗi thứ 2 lúc 00:00' },
  { value: '0 0 1 * *',          label: 'Ngày 1 mỗi tháng 00:00' },
];

/**
 * Executor types — field 2.
 */
export const EXECUTOR_TYPES: DropdownOption[] = [
  { value: 'agent',    label: '🤖 AI Agent',        description: 'Paperclip agent từ paperclip_agents table' },
  { value: 'script',   label: '⚙️ Script / Shell',  description: 'Python/Bash/PowerShell script file' },
  { value: 'api',      label: '🌐 HTTP API call',   description: 'POST/GET tới URL' },
  { value: 'approval', label: '✋ Approval gate',    description: 'Cần human approve trước khi tiếp' },
  { value: 'manual',   label: '👤 Manual task',     description: 'Human (Jennie) làm thủ công' },
  { value: 'event',    label: '⚡ Event emitter',    description: 'Emit event cho listeners' },
];

/**
 * Known DB tables — used for Inputs/Outputs source/destination dropdowns.
 * Grouped by category. Custom tables register via Marketplace.
 */
export const DB_TABLES: DropdownOption[] = [
  // Content pipeline
  { value: 'cc_scripts',              label: 'cc_scripts',              category: 'Content', description: 'Generated content scripts' },
  { value: 'cc_generation_jobs',      label: 'cc_generation_jobs',      category: 'Content', description: 'Content batch job queue' },
  { value: 'cc_calendar_events',      label: 'cc_calendar_events',      category: 'Content', description: 'Scheduled posts calendar' },
  { value: 'cc_social_posts',         label: 'cc_social_posts',         category: 'Content', description: 'Published social posts tracker' },
  { value: 'cc_email_campaigns',      label: 'cc_email_campaigns',      category: 'Content', description: 'Email campaign queue' },
  { value: 'cc_email_sends',          label: 'cc_email_sends',          category: 'Content', description: 'Individual email send log' },
  { value: 'cc_news_articles',        label: 'cc_news_articles',        category: 'Content', description: 'News article aggregator' },
  // CRM
  { value: 'crm_customers',           label: 'crm_customers',           category: 'CRM' },
  { value: 'crm_interactions',        label: 'crm_interactions',        category: 'CRM' },
  { value: 'crm_orders',              label: 'crm_orders',              category: 'CRM' },
  { value: 'crm_tickets',             label: 'crm_tickets',             category: 'CRM' },
  { value: 'crm_notes',               label: 'crm_notes',               category: 'CRM' },
  // Commerce
  { value: 'shopify_orders',          label: 'shopify_orders',          category: 'Commerce' },
  { value: 'course_enrollments',      label: 'course_enrollments',      category: 'Commerce' },
  { value: 'profiles',                label: 'profiles',                category: 'Commerce' },
  { value: 'partnership_applications',label: 'partnership_applications',category: 'Commerce' },
  { value: 'affiliate_commissions',   label: 'affiliate_commissions',   category: 'Commerce' },
  // Channels
  { value: 'channel_instances',       label: 'channel_instances',       category: 'Channels' },
  { value: 'channel_sessions',        label: 'channel_sessions',        category: 'Channels' },
  { value: 'channel_pending_messages',label: 'channel_pending_messages',category: 'Channels' },
  { value: 'channel_sent_messages',   label: 'channel_sent_messages',   category: 'Channels' },
  // SOP Engine
  { value: 'gem_sops',                label: 'gem_sops',                category: 'SOP Engine' },
  { value: 'gem_sop_executions',      label: 'gem_sop_executions',      category: 'SOP Engine' },
  { value: 'gem_pipelines',           label: 'gem_pipelines',           category: 'SOP Engine' },
  { value: 'cron_registry',           label: 'cron_registry',           category: 'SOP Engine' },
  // Knowledge
  { value: 'kb_documents',            label: 'kb_documents',            category: 'Knowledge' },
  { value: 'kb_chunks',               label: 'kb_chunks',               category: 'Knowledge' },
  { value: 'kb_collections',          label: 'kb_collections',          category: 'Knowledge' },
  // Analytics
  { value: 'daily_analytics_snapshots', label: 'daily_analytics_snapshots', category: 'Analytics' },
  { value: 'paper_trades',            label: 'paper_trades',            category: 'Trading' },
  { value: 'activity_log',            label: 'activity_log',            category: 'System' },
  // Goals & Agents
  { value: 'goals',                   label: 'goals',                   category: 'System' },
  { value: 'paperclip_agents',        label: 'paperclip_agents',        category: 'System' },
  { value: 'companies',               label: 'companies',               category: 'System' },
];

/**
 * Input source types (for Inputs field).
 */
export const INPUT_SOURCES: DropdownOption[] = [
  { value: 'db_query',      label: '🗃️ DB query',          description: 'Query 1 hoặc nhiều DB tables' },
  { value: 'file_path',     label: '📄 File path (local)',  description: 'Đọc file từ filesystem' },
  { value: 'knowledge_kb',  label: '📚 Knowledge KB',       description: 'Từ kb_documents / kb_chunks' },
  { value: 'api_response',  label: '🌐 API response',       description: 'Từ step API trước đó' },
  { value: 'webhook_body',  label: '🪝 Webhook body',       description: 'Từ webhook payload trigger' },
  { value: 'previous_step', label: '⬅️ Output step trước',  description: 'Từ step N-1 trong SOP' },
  { value: 'user_input',    label: '👤 User input',         description: 'Form data user nhập' },
  { value: 'env_var',       label: '🔐 Environment variable', description: 'Đọc từ process.env' },
  { value: 'secret_store',  label: '🔑 Secret store',       description: 'Từ Supabase vault / 1password' },
];

/**
 * Output destination types.
 */
export const OUTPUT_DESTINATIONS: DropdownOption[] = [
  { value: 'db_insert',         label: '🗃️ DB insert',          description: 'INSERT vào table' },
  { value: 'db_update',         label: '🗃️ DB update',          description: 'UPDATE row existing' },
  { value: 'file_write',        label: '📄 Write to file',      description: 'Ghi vào filesystem path' },
  { value: 'channel_send',      label: '💬 Send to channel',    description: 'Zalo/FB/Email/Telegram' },
  { value: 'next_step_input',   label: '➡️ Next step input',    description: 'Truyền vào step kế tiếp' },
  { value: 'event_emit',        label: '⚡ Emit event',         description: 'Broadcast event cho listeners' },
  { value: 'webhook_callback',  label: '🪝 POST webhook',       description: 'HTTP POST tới URL callback' },
  { value: 'push_notification', label: '🔔 Push notification',  description: 'Expo push to mobile app' },
  { value: 'platform_publish',  label: '📢 Publish to platform', description: 'Meta BS / YouTube / TikTok' },
  { value: 'knowledge_append',  label: '📚 Append to KB',        description: 'Thêm vào kb_documents' },
];

// ─── Live API-backed catalogs ─────────────────────────────────────────────

/**
 * Fetch agents from paperclip_agents SSOT.
 */
async function fetchAgentOptions(): Promise<DropdownOption[]> {
  try {
    const res = await fetch('/api/channels/agent-configs');
    if (!res.ok) return [];
    const agents = await res.json();
    return (Array.isArray(agents) ? agents : []).map((a: any) => ({
      value: a.slug,
      label: `🤖 ${a.display_name || a.slug}`,
      description: a.description || `${a.provider} · ${a.model}`,
      category: a.enabled ? 'active' : 'disabled',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch SOPs for linked_sops dropdown.
 */
async function fetchSopOptions(): Promise<DropdownOption[]> {
  try {
    // Server returns { sops: [...], total: N } (paginated). Default limit=50, so
    // we must request limit=500 to cover all 208 SOPs. Also handle both array
    // and wrapped response shapes for robustness.
    const res = await fetch('/api/ops/sop-engine/sops?limit=500');
    if (!res.ok) return [];
    const body = await res.json();
    const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.sops) ? body.sops : [];
    return list.map((s: any) => ({
      value: s.sop_id,
      label: `${s.sop_id} — ${s.name}`,
      description: `${s.domain} · ${s.status}`,
      category: s.domain,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch cron_registry for trigger "link existing cron" dropdown.
 */
async function fetchCronOptions(): Promise<DropdownOption[]> {
  try {
    const res = await fetch('/api/registry/crons');
    if (!res.ok) return [];
    const crons = await res.json();
    return (Array.isArray(crons) ? crons : []).map((c: any) => ({
      value: c.id,
      label: `${c.display_name} (${c.cron_humanized || c.cron_expression || '—'})`,
      description: `${c.category || 'uncategorized'} · ${c.schedule_type}`,
      category: c.schedule_type,
    }));
  } catch {
    return [];
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useAgentOptions() {
  return useQuery({
    queryKey: ['registry', 'agents'],
    queryFn: fetchAgentOptions,
    staleTime: 60_000,
  });
}

export function useSopOptions() {
  return useQuery({
    queryKey: ['registry', 'sops'],
    queryFn: fetchSopOptions,
    staleTime: 60_000,
  });
}

export function useCronOptions() {
  return useQuery({
    queryKey: ['registry', 'crons'],
    queryFn: fetchCronOptions,
    staleTime: 60_000,
  });
}
