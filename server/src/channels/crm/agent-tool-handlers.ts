// Shared tool handlers for the 5 NEW tools beyond the original MCP 9.
//
// These are imported by BOTH:
//   - crm/mcp-server.ts        — for Claude/Gemini CLI agents (MCP stdio protocol)
//   - channels/agent-tools.ts  — for Ollama/marker-pattern agents
//
// Single source of truth so 14 tools work identically across all providers.
//
// Identity gate state lives in channel_sessions.metadata and is read/written
// by both sides through the Supabase service role.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryService } from './memory-service.js';

const memoryService = new MemoryService();

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolHandlerContext {
  supabase: SupabaseClient;
  /** Required so handlers can scope queries + log audit. */
  agentSlug: string;
  /** session_key from channel_sessions; used for identity gate persistence. */
  sessionKey: string;
  /** Verified customer_id (UUID). null if identity gate not yet passed. */
  verifiedCustomerId: string | null;
  /** Inbound channel name for audit. */
  channelName: string | null;
}

export interface SharedToolResult {
  ok: boolean;
  /** Vietnamese summary fed back to LLM as observation */
  summary: string;
  /** Optional structured data — for audit, not shown to LLM */
  data?: unknown;
  error?: string;
}

/**
 * Resolve a fresh ToolHandlerContext from env vars + DB.
 *
 * Used by mcp-server.ts (Claude/Gemini path) where the MCP subprocess inherits
 * env vars from the parent Node process spawning Claude. The parent (router.ts
 * runViaClaude/runViaGemini) sets:
 *   PAPERCLIP_AGENT_SLUG=<slug>
 *   PAPERCLIP_SESSION_KEY=<sessionKey>
 *   PAPERCLIP_CHANNEL_NAME=<channelName>
 */
export async function resolveToolContextFromEnv(supabase: SupabaseClient): Promise<ToolHandlerContext> {
  const agentSlug = process.env.PAPERCLIP_AGENT_SLUG || 'unknown';
  const sessionKey = process.env.PAPERCLIP_SESSION_KEY || '';
  const channelName = process.env.PAPERCLIP_CHANNEL_NAME || null;

  let verifiedCustomerId: string | null = null;
  if (sessionKey) {
    try {
      const { data } = await supabase
        .from('channel_sessions')
        .select('metadata')
        .eq('session_key', sessionKey)
        .maybeSingle();
      const meta = (data?.metadata || {}) as any;
      const verifiedAt = meta.verified_at ? new Date(meta.verified_at).getTime() : 0;
      const ageMs = Date.now() - verifiedAt;
      const VERIFY_TTL_MS = 30 * 60 * 1000;
      if (meta.verified_customer_id && ageMs < VERIFY_TTL_MS) {
        verifiedCustomerId = meta.verified_customer_id;
      }
    } catch (err: any) {
      console.warn(`[shared-tools] Failed to read session ${sessionKey}: ${err.message}`);
    }
  }

  return { supabase, agentSlug, sessionKey, verifiedCustomerId, channelName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity gate enforcement helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool names that require a verified customer in the session before they run.
 * Same set used by both providers for consistency.
 */
export const GATED_TOOL_NAMES = new Set([
  'get_customer_info',
  'check_course_access',
  'link_gemral_account',
  'crm_update',
  'send_email',
  'create_order',
  'lookup_order_shopify',
  'recall_memory',
]);

export function checkIdentityGate(toolName: string, ctx: ToolHandlerContext): SharedToolResult | null {
  if (!GATED_TOOL_NAMES.has(toolName)) return null; // not gated → allow
  if (ctx.verifiedCustomerId) return null; // already verified → allow
  return {
    ok: false,
    summary: `Tool ${toolName} bị chặn — cần gọi verify_customer_identity trước (yêu cầu khách cung cấp 2/3: SĐT, email, mã đơn).`,
    error: 'identity_gate_locked',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 NEW tool implementations (not in original MCP 9)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * verify_customer_identity — match phone/email/order# (or address) against
 * shopify_orders + crm_customers. Requires ≥2/3 to pass.
 *
 * On success: persists verified_customer_id into channel_sessions.metadata
 * AND mutates ctx in place so subsequent calls in same loop see new state.
 */
export async function handleVerifyCustomerIdentity(
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<SharedToolResult> {
  const phone = normalizePhone(args.phone as string | undefined);
  const email = normalizeEmail(args.email as string | undefined);
  const orderNumber = (args.order_number as string | undefined)?.replace(/^#/, '').trim() || null;
  const addressHint = (args.address as string | undefined)?.trim() || null;

  const provided = [phone, email, orderNumber || addressHint].filter(Boolean).length;
  if (provided < 2) {
    return {
      ok: false,
      summary: 'Cần ít nhất 2 trong 3: số điện thoại, email, mã đơn hàng (hoặc địa chỉ).',
      error: 'insufficient_inputs',
    };
  }

  let candidates: any[] = [];
  if (orderNumber) {
    const { data } = await ctx.supabase
      .from('shopify_orders')
      .select('id, order_number, email, phone, customer_email, shipping_address, user_id')
      .eq('order_number', orderNumber)
      .limit(5);
    candidates = data || [];
  } else if (email) {
    const { data } = await ctx.supabase
      .from('shopify_orders')
      .select('id, order_number, email, phone, customer_email, shipping_address, user_id')
      .or(`email.eq.${email},customer_email.eq.${email}`)
      .order('created_at', { ascending: false })
      .limit(5);
    candidates = data || [];
  } else if (phone) {
    const { data } = await ctx.supabase
      .from('shopify_orders')
      .select('id, order_number, email, phone, customer_email, shipping_address, user_id')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(5);
    candidates = data || [];
  }

  let best: { score: number; row: any } | null = null;
  for (const row of candidates) {
    let score = 0;
    if (orderNumber && row.order_number === orderNumber) score++;
    if (email && (normalizeEmail(row.email) === email || normalizeEmail(row.customer_email) === email)) score++;
    if (phone && normalizePhone(row.phone) === phone) score++;
    if (addressHint && typeof row.shipping_address === 'object' && row.shipping_address) {
      const addrText = JSON.stringify(row.shipping_address).toLowerCase();
      if (addrText.includes(addressHint.toLowerCase())) score++;
    }
    if (!best || score > best.score) best = { score, row };
  }

  if (!best || best.score < 2) {
    return {
      ok: false,
      summary: 'Không khớp đủ 2/3 thông tin. Vui lòng kiểm tra lại số điện thoại, email và mã đơn hàng dùng lúc đặt hàng.',
      error: 'no_match',
    };
  }

  // Resolve crm_customers row by email/phone for scoping
  let customerId: string | null = best.row.user_id || null;
  if (!customerId && (email || phone)) {
    const filters: string[] = [];
    if (email) filters.push(`email.eq.${email}`);
    if (phone) filters.push(`phone.eq.${phone}`);
    const { data: c } = await ctx.supabase
      .from('crm_customers')
      .select('id, display_name, email, phone')
      .or(filters.join(','))
      .limit(1);
    if (c && c.length > 0) customerId = c[0].id;
  }
  if (!customerId) customerId = best.row.id;

  // Persist into channel_sessions so MCP handlers see verification across CLI re-spawns
  if (ctx.sessionKey) {
    await ctx.supabase
      .from('channel_sessions')
      .update({
        metadata: {
          verified_customer_id: customerId,
          verified_at: new Date().toISOString(),
          verified_via: { phone: !!phone, email: !!email, order_number: !!orderNumber },
        } as any,
      })
      .eq('session_key', ctx.sessionKey);
  }

  ctx.verifiedCustomerId = customerId;

  return {
    ok: true,
    summary: `Đã xác minh danh tính khách (match ${best.score}/3 fields). Có thể tra cứu trong 30 phút.`,
    data: { customer_id: customerId, match_score: best.score, order_number: best.row.order_number },
  };
}

/**
 * lookup_order_shopify — query shopify_orders. Identity gate enforced upstream.
 */
export async function handleLookupOrderShopify(
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<SharedToolResult> {
  const orderNumber = (args.order_number as string | undefined)?.replace(/^#/, '').trim() || null;
  if (!orderNumber) {
    return { ok: false, summary: 'Thiếu order_number.', error: 'missing_order_number' };
  }

  const { data, error } = await ctx.supabase
    .from('shopify_orders')
    .select('order_number, financial_status, fulfillment_status, tracking_number, tracking_url, carrier, fulfilled_at, paid_at, total_price, currency, shipping_address, line_items, email, phone')
    .eq('order_number', orderNumber)
    .limit(1);

  if (error) return { ok: false, summary: `Lỗi DB: ${error.message}`, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, summary: `Không tìm thấy đơn hàng #${orderNumber}.`, error: 'not_found' };
  }

  const order = data[0];
  const items = Array.isArray(order.line_items)
    ? order.line_items.map((it: any) => `${it.title || it.name || 'sp'} x${it.quantity || 1}`).join(', ')
    : '';

  return {
    ok: true,
    summary: [
      `Đơn #${order.order_number}: ${order.financial_status || 'pending'} / ${order.fulfillment_status || 'chưa giao'}.`,
      items ? `Items: ${items}.` : '',
      order.tracking_number ? `Tracking: ${order.tracking_number}${order.carrier ? ' (' + order.carrier + ')' : ''}.` : '',
      order.tracking_url ? `Link tracking: ${order.tracking_url}.` : '',
      order.fulfilled_at ? `Đã giao lúc ${order.fulfilled_at}.` : '',
      `Tổng: ${order.total_price || 0} ${order.currency || 'VND'}.`,
    ].filter(Boolean).join(' '),
    data: order,
  };
}

/**
 * recall_memory — call ReMe via MemoryService.retrieve()
 */
export async function handleRecallMemory(
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<SharedToolResult> {
  const customerId = (args.customer_id as string | undefined) || ctx.verifiedCustomerId;
  const query = (args.query as string | undefined)?.trim();
  if (!customerId) return { ok: false, summary: 'Thiếu customer_id.', error: 'missing_customer_id' };
  if (!query) return { ok: false, summary: 'Thiếu query.', error: 'missing_query' };

  const memText = await memoryService.retrieve(customerId, query);
  if (!memText) {
    return { ok: true, summary: 'Không tìm thấy memory liên quan.', data: { count: 0 } };
  }
  return { ok: true, summary: memText.substring(0, 1500), data: { raw: memText } };
}

/**
 * kg_lookup_entity — query kg_entities by name OR id.
 */
export async function handleKgLookupEntity(
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<SharedToolResult> {
  const id = args.id as string | undefined;
  const name = args.name as string | undefined;
  const type = args.type as string | undefined;

  if (!id && !name) {
    return { ok: false, summary: 'Thiếu id hoặc name.', error: 'missing_input' };
  }

  let q = ctx.supabase.from('kg_entities').select('id, name, entity_type, description, properties').limit(5);
  if (id) q = q.eq('id', id);
  else if (name) q = q.ilike('name', `%${name}%`);
  if (type) q = q.eq('entity_type', type);

  const { data, error } = await q;
  if (error) return { ok: false, summary: `Lỗi KG: ${error.message}`, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, summary: `Không tìm thấy entity ${name || id}.`, error: 'not_found' };
  }

  const lines = data.map((e: any) => `[${e.entity_type}] ${e.name}: ${e.description || ''}`);
  return { ok: true, summary: lines.join('\n'), data };
}

/**
 * kg_traverse — fetch all relations from a starting entity.
 */
export async function handleKgTraverse(
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<SharedToolResult> {
  const entityId = args.entity_id as string | undefined;
  const depth = Math.min(Number(args.depth) || 1, 3);
  if (!entityId) return { ok: false, summary: 'Thiếu entity_id.', error: 'missing_entity_id' };

  const { data: relations, error } = await ctx.supabase
    .from('kg_relations')
    .select('source_entity_id, target_entity_id, relation_type, properties')
    .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
    .limit(50);

  if (error) return { ok: false, summary: `Lỗi KG: ${error.message}`, error: error.message };
  if (!relations || relations.length === 0) {
    return { ok: true, summary: 'Không có relations nào.', data: { count: 0, depth } };
  }

  const lines = relations.map((r: any) => `${r.source_entity_id} —[${r.relation_type}]→ ${r.target_entity_id}`);
  return { ok: true, summary: `Tìm thấy ${relations.length} relations:\n${lines.join('\n')}`, data: relations };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function normalizePhone(p: string | undefined | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.startsWith('84') && digits.length === 11) return '0' + digits.slice(2);
  if (digits.startsWith('840')) return '0' + digits.slice(3);
  return digits;
}

export function normalizeEmail(e: string | undefined | null): string | null {
  if (!e) return null;
  return e.trim().toLowerCase() || null;
}
