// Purchase Journey Stage Handler
//
// Tracks the customer's position in the purchase funnel based on the agent's
// [[STAGE: ...]] markers. Stages are written in two places:
//
//   1. channel_sessions.metadata.purchase_stage  (fast, session-scoped)
//   2. crm_customers.status                      (cross-channel, slower)
//   3. crm_customers.ai_tags                     (auto-tagged for remarketing)
//
// All updates are best-effort — never throws.

import { supabase } from '../zalo-personal/supabase.js';

export type PurchaseStage =
  | 'discovery'      // Lần đầu tiếp xúc, hỏi thông tin chung
  | 'interest'        // Bắt đầu hỏi cụ thể về 1 sản phẩm
  | 'consideration'   // So sánh, đào sâu, đặt câu hỏi objection
  | 'intent'          // Sẵn sàng mua, hỏi thanh toán
  | 'purchase'        // Đã chốt + thanh toán xong
  | 'retention';      // Khách cũ, upsell / cross-sell

export const STAGE_WHITELIST: ReadonlySet<PurchaseStage> = new Set([
  'discovery',
  'interest',
  'consideration',
  'intent',
  'purchase',
  'retention',
]);

/**
 * Tag mapping — when stage changes, the customer gets these ai_tags added so
 * remarketing flows can pick them up later.
 */
const STAGE_TO_TAG: Record<PurchaseStage, string> = {
  discovery: 'new',
  interest: 'interested',
  consideration: 'consulting',
  intent: 'ready_to_buy',
  purchase: 'purchased',
  retention: 'returning_customer',
};

/**
 * Parse [[STAGE: stage_name]] marker out of agent reply text.
 * Strips the marker and returns the stage if valid.
 */
export function parseStageMarker(
  text: string,
): { cleanedText: string; stage: PurchaseStage | null } {
  if (!text) return { cleanedText: text, stage: null };

  const STAGE_RE = /\[\[\s*STAGE\s*:\s*([a-zA-Z_]+)\s*\]\]/i;
  const match = text.match(STAGE_RE);
  if (!match) return { cleanedText: text, stage: null };

  const candidate = match[1].toLowerCase().trim() as PurchaseStage;
  if (!STAGE_WHITELIST.has(candidate)) {
    console.warn(`[Stage] Unknown stage "${candidate}" — ignoring marker`);
    return { cleanedText: text.replace(STAGE_RE, '').trim(), stage: null };
  }

  return {
    cleanedText: text.replace(STAGE_RE, '').trim(),
    stage: candidate,
  };
}

/**
 * Persist a new purchase stage. Updates session metadata + (if customer_id
 * is known) mirrors to crm_customers + auto-tag.
 *
 * Fire-and-forget — never throws.
 */
export async function persistPurchaseStage(args: {
  sessionKey: string;
  customerId: string | null;
  agentSlug: string;
  newStage: PurchaseStage;
}): Promise<void> {
  const logPrefix = `[Stage/${args.agentSlug}]`;

  // ── 1. Update channel_sessions.metadata.purchase_stage ──────────────────
  // ATOMIC RPC chuyên biệt — append purchase_stage_history (giữ last-20) + set stage TRONG DB,
  // KHÔNG read-merge-write cả object (clobber bot_paused; shallow-merge không diễn tả được append).
  // No-op cùng stage + giữ last-20 xử lý bên trong RPC. Plan 2026-08-10-CSKH-BOT-PAUSE-CLOBBER.
  try {
    const { error } = await supabase.rpc('channel_session_set_purchase_stage', {
      p_session_key: args.sessionKey,
      p_stage: args.newStage,
    });
    if (error) console.error(`${logPrefix} ✗ session update failed: ${error.message}`);
    else console.log(`${logPrefix} ✓ stage → ${args.newStage}`);
  } catch (err: any) {
    console.error(`${logPrefix} ✗ session update failed: ${err.message}`);
  }

  // ── 2. Mirror to crm_customers.status + ai_tags (if customer linked) ─────
  if (!args.customerId) return;

  try {
    const { data: customer } = await supabase
      .from('crm_customers')
      .select('status, ai_tags')
      .eq('id', args.customerId)
      .single();

    const existingTags: string[] = (customer?.ai_tags as string[]) || [];
    const newTag = STAGE_TO_TAG[args.newStage];
    const mergedTags = Array.from(new Set([...existingTags, newTag]));

    await supabase
      .from('crm_customers')
      .update({
        status: args.newStage,
        ai_tags: mergedTags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', args.customerId);

    console.log(`${logPrefix} ✓ crm_customers ${args.customerId.substring(0, 8)} status=${args.newStage} +tag=${newTag}`);
  } catch (err: any) {
    console.error(`${logPrefix} ✗ crm_customers update failed: ${err.message}`);
  }
}

/**
 * Load the current purchase stage for a session (used by the agent's
 * system prompt so it knows the journey context across replies).
 */
export async function loadPurchaseStage(sessionKey: string): Promise<PurchaseStage | null> {
  if (!sessionKey) return null;
  try {
    const { data } = await supabase
      .from('channel_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .single();
    const meta = (data?.metadata as Record<string, unknown>) || {};
    const stage = meta.purchase_stage as PurchaseStage | undefined;
    return stage && STAGE_WHITELIST.has(stage) ? stage : null;
  } catch {
    return null;
  }
}
