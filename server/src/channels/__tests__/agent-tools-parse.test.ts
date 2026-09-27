import { describe, it, expect, vi } from 'vitest';
vi.mock('../zalo-personal/supabase.js', () => ({ supabase: {} }));
vi.mock('../crm/mcp-server.js', () => ({}));
vi.mock('../crm/agent-tool-handlers.js', () => ({ GATED_TOOL_NAMES: new Set() }));
import { parseToolCalls, isSideEffectOnlyTool } from '../agent-tools.js';

describe('parseToolCalls', () => {
  it('parses AGENTS.md key="value" contract form', () => {
    const t = 'Dạ em lên đơn ạ [[CALL: create_shopify_order(variant_id="41620252164273", quantity=1, customer_phone="0938674413", shipping_address1="243/31/37B Tôn Đản (gần chợ)", discount_pct=10)]] nha';
    const { calls, cleanedText } = parseToolCalls(t);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('create_shopify_order');
    expect(calls[0].args).toMatchObject({ variant_id: '41620252164273', quantity: 1, discount_pct: 10, shipping_address1: '243/31/37B Tôn Đản (gần chợ)' });
    expect(cleanedText).toBe('Dạ em lên đơn ạ  nha');
  });
  it('still parses JSON args', () => {
    const { calls } = parseToolCalls('[[CALL: create_ticket({"title":"x","priority":"high"})]]');
    expect(calls[0].args).toEqual({ title: 'x', priority: 'high' });
  });
  it('drops non-whitelisted tools', () => {
    expect(parseToolCalls('[[CALL: rm_rf(x="1")]]').calls).toHaveLength(0);
  });
  it('classifies side-effect tools', () => {
    expect(isSideEffectOnlyTool('create_shopify_order')).toBe(true);
    expect(isSideEffectOnlyTool('verify_customer_identity')).toBe(false);
  });
});
