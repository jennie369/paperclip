// Notion push helper — cc_scripts → Notion CONTENT PLANNER 2026.
//
// Used by content pipeline BE endpoints to sync create/approve events to Notion.
// Ports the core logic from scripts/notion_migrate_cc_to_content_planner.py so we
// don't need to spawn Python for every UI action.
//
// ENV required:
//   NOTION_TOKEN   — Notion internal integration token (shared with the
//                    CONTENT PLANNER 2026 database). Same token used by the
//                    notion-content-sync edge function.
//
// Design:
//   - pushScript(scriptId) is the single entry. It fetches the cc_scripts row,
//     checks for an existing Notion page (by Script ID property), then either
//     creates a new page (saving notion_page_id back) or PATCHes the existing
//     page properties. Fire-and-forget from callers — NEVER throw out.
//   - updatePageStatus(scriptId, status, extras?) is the lightweight variant
//     used by the approve/bulk-approve endpoints when we only need to flip
//     Status=Approved etc.
//
// Callers MUST wrap calls in .catch(log) — this helper never throws upward.

import { supabase } from './zalo-personal/supabase.js';

// Read token FRESHLY on each call — paperclip dotenv loads from paperclip/.env
// lazily, so capturing at module-load time (const) returned '' even when the
// value was present in .env. Helpers below call getNotionToken() each time.
function getNotionToken(): string {
  return process.env.NOTION_TOKEN ?? process.env.NOTION_INTEGRATION_TOKEN ?? '';
}
const NOTION_VERSION = '2025-09-03';
const NOTION_DATA_SOURCE_ID = '32a624a3-c453-807a-bdfe-000b3ec7b984';

type NotionStatus = 'Draft' | 'Approved' | 'Published' | 'Archived';

// cc_scripts.content_type → Notion "Content Type" select
const CONTENT_TYPE_MAP: Record<string, string> = {
  social_post: 'Social Post',
  news: 'News',
  email: 'Email',
  short_clip: 'Short Clip',
  latc: 'LATC',
  push_notification: 'Push Notification',
  chatbot_script: 'Chatbot Script',
  banner: 'Banner',
  image_prompt: 'Image Prompt',
  content_planner: 'Content Planner',
};
const CONTENT_TYPE_CATCH_ALL = 'Other';
// DOC-* content types (25 SOPs — 2026-04-17) map to a single Notion select
// "Doc-Tài Liệu Nội Dung". The SOP id is still preserved in cc_scripts.content_type
// and surfaced separately via "Script ID" / note fields.
const DOC_CONTENT_TYPE_LABEL = 'Doc-Tài Liệu Nội Dung';

const STATUS_MAP: Record<string, NotionStatus> = {
  draft: 'Draft',
  approved: 'Approved',
  published: 'Published',
  topic: 'Draft',
};

const VALID_ACCOUNTS = new Set(['profile_jennie', 'page_jennie', 'page_gemral', 'email', 'forum']);

// Social Channel page IDs in Notion (created 2026-04-14)
const CHANNEL_PAGE_IDS: Record<string, string> = {
  page_jennie: '342624a3-c453-8151-a849-d8d78c729067',
  profile_jennie: '342624a3-c453-8113-bc20-e9a23520d272',
  page_gemral: '342624a3-c453-8112-b314-ed50784096bc',
  email: '342624a3-c453-8180-92f3-e7c8e022946a',
  forum: '342624a3-c453-815e-805f-f9cf5a293db3',
};

type CcScriptRow = Record<string, unknown>;

function log(msg: string, extra?: unknown) {
  if (extra !== undefined) console.log(`[notion-push] ${msg}`, extra);
  else console.log(`[notion-push] ${msg}`);
}

function isEnabled(): boolean {
  return getNotionToken().length > 0;
}

async function notionFetch(pathname: string, init: RequestInit = {}): Promise<any> {
  const token = getNotionToken();
  if (!token) throw new Error('NOTION_TOKEN not set');
  const res = await fetch(`https://api.notion.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${init.method ?? 'GET'} ${pathname} → ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

function clip(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n).trimEnd() + '…';
}

function richText(txt: string): Array<{ type: 'text'; text: { content: string } }> {
  if (!txt) return [];
  const out: Array<{ type: 'text'; text: { content: string } }> = [];
  for (let i = 0; i < txt.length; i += 2000) {
    out.push({ type: 'text', text: { content: txt.slice(i, i + 2000) } });
  }
  return out;
}

function buildTitle(row: CcScriptRow): string {
  const t = String(row.title ?? '').trim();
  if (t) return clip(t, 200);
  const body = String(row.body ?? row.draft_body ?? '').trim();
  if (body) {
    const first = body.split('\n', 1)[0].trim();
    return clip(first || body, 120);
  }
  return `Post ${String(row.id ?? '').slice(0, 8)}`;
}

function mapPostedAccount(posted: string | null | undefined, ccType: string): string | null {
  if (posted && VALID_ACCOUNTS.has(posted)) return posted;
  if (ccType === 'email') return 'email';
  return null;
}

function mapPlatform(posted: string | null | undefined): string[] {
  if (posted === 'profile_jennie' || posted === 'page_jennie' || posted === 'page_gemral') return ['Facebook'];
  if (posted === 'forum') return ['Forum'];
  return [];
}

function paragraphBlock(text: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(text) } };
}

function headingBlock(text: string, level: 1 | 2 | 3 = 2) {
  const key = `heading_${level}` as const;
  return {
    object: 'block',
    type: key,
    [key]: { rich_text: [{ type: 'text' as const, text: { content: text } }] },
  };
}

function dividerBlock() {
  return { object: 'block', type: 'divider', divider: {} };
}

function imageBlock(url: string) {
  return { object: 'block', type: 'image', image: { type: 'external', external: { url } } };
}

function buildBlocks(row: CcScriptRow): any[] {
  const blocks: any[] = [];
  const hook = String(row.hook ?? '').trim();
  if (hook) {
    blocks.push(headingBlock('🎣 Hook'));
    blocks.push(paragraphBlock(hook));
  }
  const body = String(row.body ?? row.draft_body ?? '').trim();
  if (body) {
    blocks.push(headingBlock('📝 Full Content'));
    for (const chunk of body.split('\n\n')) {
      const t = chunk.trim();
      if (!t) continue;
      if (t.startsWith('## ')) blocks.push(headingBlock(t.slice(3).trim(), 2));
      else if (t.startsWith('# ')) blocks.push(headingBlock(t.slice(2).trim(), 1));
      else blocks.push(paragraphBlock(t));
    }
  }
  const cta = String(row.cta ?? '').trim();
  if (cta) {
    blocks.push(headingBlock('🎯 CTA'));
    blocks.push(paragraphBlock(cta));
  }
  const imgs = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [];
  if (imgs.length > 0) {
    blocks.push(headingBlock('🖼️ Hình ảnh đính kèm'));
    for (const u of imgs) {
      if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
        blocks.push(imageBlock(u));
      }
    }
  }
  blocks.push(dividerBlock());
  const meta: string[] = [];
  for (const k of ['pillar', 'persona', 'track', 'writing_mode', 'session_id']) {
    const v = row[k];
    if (v) meta.push(`${k}: ${String(v)}`);
  }
  meta.push(`Script ID: ${String(row.id ?? '')}`);
  meta.push(`CC Type: ${String(row.content_type ?? '')}`);
  if (row.created_at) meta.push(`Generated: ${String(row.created_at)}`);
  blocks.push(paragraphBlock(meta.join(' · ')));
  return blocks;
}

function buildProperties(row: CcScriptRow): Record<string, any> {
  const ct = String(row.content_type ?? '');
  // DOC-* → single "Doc-Tài Liệu Nội Dung" Notion select; regular types use direct map.
  const notionCt = ct.startsWith('DOC-')
    ? DOC_CONTENT_TYPE_LABEL
    : (CONTENT_TYPE_MAP[ct] ?? CONTENT_TYPE_CATCH_ALL);
  const props: Record<string, any> = {
    Name: { title: richText(buildTitle(row)) },
    'Content Type': { select: { name: notionCt } },
    Status: { select: { name: STATUS_MAP[String(row.status ?? 'draft')] ?? 'Draft' } },
    'Script ID': { rich_text: richText(String(row.id ?? '')) },
  };
  const bv = row.brand_voice;
  if (bv === 'jennie' || bv === 'generic') props['Brand Voice'] = { select: { name: bv } };
  const pa = mapPostedAccount(row.posted_account as string | null, ct);
  if (pa) props['Posted Account'] = { select: { name: pa } };
  const plats = mapPlatform(row.posted_account as string | null);
  if (plats.length > 0) props.Platform = { multi_select: plats.map((p) => ({ name: p })) };
  if (row.scheduled_at) props['Scheduled Date'] = { date: { start: String(row.scheduled_at) } };
  for (const [k, prop] of [
    ['pillar', 'Pillar'],
    ['track', 'Track'],
  ] as const) {
    const v = row[k];
    if (v) props[prop] = { select: { name: String(v).trim() } };
  }
  for (const [k, prop] of [
    ['persona', 'Persona'],
    ['hook', 'Hook'],
    ['cta', 'CTA'],
  ] as const) {
    const v = row[k];
    if (v) props[prop] = { rich_text: richText(String(v)) };
  }
  const imgs = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [];
  if (imgs.length > 0) props['Image URLs'] = { rich_text: richText(imgs.join('\n')) };
  if (row.word_count !== undefined && row.word_count !== null) {
    props['Word Count'] = { number: Number(row.word_count) };
  }
  if (row.created_at) props['Created At (CC)'] = { date: { start: String(row.created_at).slice(0, 10) } };
  if (row.updated_at) props['Updated At (CC)'] = { date: { start: String(row.updated_at).slice(0, 10) } };
  // Publish Mode — NEW 2026-04-15: keep Notion property in sync with DB
  const pm = row.publish_mode;
  if (pm === 'scheduled' || pm === 'immediate' || pm === 'threshold_5') {
    props['Publish Mode'] = { select: { name: String(pm) } };
  }
  const channelId = CHANNEL_PAGE_IDS[(row.posted_account as string) ?? ''] ?? (ct === 'email' ? CHANNEL_PAGE_IDS.email : undefined);
  if (channelId) props['Social Channel'] = { relation: [{ id: channelId }] };
  return props;
}

async function findPageByScriptId(scriptId: string): Promise<string | null> {
  try {
    const res = await notionFetch(`/data_sources/${NOTION_DATA_SOURCE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: 'Script ID', rich_text: { equals: scriptId } },
        page_size: 1,
      }),
    });
    const page = (res?.results ?? [])[0];
    return page?.id ?? null;
  } catch (err) {
    log(`findPageByScriptId(${scriptId}) failed`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function createPage(row: CcScriptRow): Promise<string | null> {
  const properties = buildProperties(row);
  const children = buildBlocks(row);
  try {
    const res = await notionFetch('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { type: 'data_source_id', data_source_id: NOTION_DATA_SOURCE_ID },
        properties,
        children,
      }),
    });
    const pageId: string | undefined = res?.id;
    if (pageId) {
      await supabase
        .from('cc_scripts')
        .update({ notion_page_id: pageId })
        .eq('id', String(row.id));
    }
    return pageId ?? null;
  } catch (err) {
    log(`createPage(${row.id}) failed`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Update ONLY selected Notion page properties for the given cc_scripts.id.
 * Fast path for approve/publish events. If no Notion page exists yet, returns
 * `{ ok: false, note: 'no-page' }` — caller can fall back to `pushScript()`.
 */
export async function updatePageStatus(
  scriptId: string,
  status: string,
  extras: { post_url?: string; scheduled_at?: string; publish_mode?: string } = {},
): Promise<{ ok: boolean; note?: string; page_id?: string }> {
  if (!isEnabled()) {
    log('skip: NOTION_TOKEN not configured');
    return { ok: false, note: 'no-token' };
  }
  const pageId = await findPageByScriptId(scriptId);
  if (!pageId) return { ok: false, note: 'no-page' };

  const properties: Record<string, any> = {
    Status: { select: { name: STATUS_MAP[status] ?? 'Draft' } },
  };
  if (extras.post_url) properties['Post URL'] = { url: extras.post_url };
  if (extras.scheduled_at) properties['Scheduled Date'] = { date: { start: extras.scheduled_at } };
  if (extras.publish_mode && ['scheduled', 'immediate', 'threshold_5'].includes(extras.publish_mode)) {
    properties['Publish Mode'] = { select: { name: extras.publish_mode } };
  }

  try {
    await notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
    return { ok: true, page_id: pageId };
  } catch (err) {
    log(`updatePageStatus(${scriptId}, ${status}) PATCH failed`, err instanceof Error ? err.message : err);
    return { ok: false, note: 'patch-failed' };
  }
}

/**
 * Full upsert: fetches cc_scripts row, creates Notion page if missing (and
 * writes notion_page_id back), otherwise PATCHes existing page properties.
 * Always resolves — never rejects.
 */
export async function pushScript(scriptId: string): Promise<{ ok: boolean; action?: string; note?: string; page_id?: string }> {
  if (!isEnabled()) {
    log('skip: NOTION_TOKEN not configured');
    return { ok: false, note: 'no-token' };
  }
  try {
    const { data: row, error } = await supabase
      .from('cc_scripts')
      .select('*')
      .eq('id', scriptId)
      .single();
    if (error || !row) {
      log(`pushScript(${scriptId}) — row not found`, error);
      return { ok: false, note: 'no-row' };
    }
    const existingPageId = (row.notion_page_id as string | null) ?? (await findPageByScriptId(scriptId));

    if (!existingPageId) {
      const newPageId = await createPage(row);
      return newPageId
        ? { ok: true, action: 'created', page_id: newPageId }
        : { ok: false, note: 'create-failed' };
    }

    const properties = buildProperties(row);
    await notionFetch(`/pages/${existingPageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
    return { ok: true, action: 'updated', page_id: existingPageId };
  } catch (err) {
    log(`pushScript(${scriptId}) failed`, err instanceof Error ? err.message : err);
    return { ok: false, note: 'unexpected-error' };
  }
}

/**
 * Bulk update status for multiple scripts. Paced at ~350ms/req to stay under
 * Notion rate limit (3 req/s). Non-blocking — safe to await in a setImmediate.
 */
export async function bulkUpdatePageStatus(
  scriptIds: string[],
  status: string,
): Promise<{ ok: number; failed: number }> {
  if (!isEnabled()) return { ok: 0, failed: 0 };
  let ok = 0;
  let failed = 0;
  for (const id of scriptIds) {
    const result = await updatePageStatus(id, status);
    if (result.ok) ok += 1;
    else failed += 1;
    await new Promise((r) => setTimeout(r, 350));
  }
  log(`bulkUpdatePageStatus(${scriptIds.length}, ${status}) → ok=${ok} failed=${failed}`);
  return { ok, failed };
}

export function notionPushEnabled(): boolean {
  return isEnabled();
}
