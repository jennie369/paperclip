// AI Summarizer — summarize conversations after idle, update CRM customer
// Triggered when conversation is idle > 5 minutes

import { execFileSync } from 'node:child_process';
import { supabase } from '../zalo-personal/supabase.js';

// Track idle timers per session
const idleTimers = new Map<string, NodeJS.Timeout>();
const IDLE_TIMEOUT_MS = 5 * 60_000; // 5 minutes

export class AISummarizer {

  /**
   * Schedule a summary after idle timeout.
   * Call this after each agent reply — resets the timer.
   */
  scheduleSummary(sessionKey: string, customerId: string): void {
    // Clear existing timer
    const existing = idleTimers.get(sessionKey);
    if (existing) clearTimeout(existing);

    // Set new idle timer
    const timer = setTimeout(async () => {
      idleTimers.delete(sessionKey);
      await this.runSummary(sessionKey, customerId);
    }, IDLE_TIMEOUT_MS);

    idleTimers.set(sessionKey, timer);
  }

  /**
   * Cancel pending summary (e.g., when new message arrives).
   */
  cancelPending(sessionKey: string): void {
    const existing = idleTimers.get(sessionKey);
    if (existing) {
      clearTimeout(existing);
      idleTimers.delete(sessionKey);
    }
  }

  /**
   * Run AI summary on conversation history.
   */
  private async runSummary(sessionKey: string, customerId: string): Promise<void> {
    if (!customerId) return;

    try {
      // Load session history
      const { data: session } = await supabase
        .from('channel_sessions')
        .select('history')
        .eq('session_key', sessionKey)
        .single();

      const history = (session?.history || []) as Array<{
        role: string;
        content: string;
        senderName?: string;
      }>;

      if (history.length < 3) return; // Too short to summarize

      const messagesText = history
        .map(m => `${m.role === 'assistant' ? 'Agent' : (m.senderName || 'Khách')}: ${m.content}`)
        .join('\n')
        .slice(0, 3000); // Limit context

      const prompt = `Tóm tắt hội thoại CSKH sau thành 2-3 câu tiếng Việt có dấu.
Trả về ĐÚNG JSON (không markdown, không backtick):
{"summary":"...","tags":["tag1","tag2"],"sentiment":"positive|neutral|negative"}

Hội thoại:
${messagesText}`;

      const result = execFileSync('claude', [
        '-p', prompt,
        '--output-format', 'text',
        '--max-turns', '1',
      ], { encoding: 'utf-8', timeout: 30_000 });

      // Parse AI response
      const cleaned = result.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned);

      // Update CRM customer
      const customerMessages = history.filter(m => m.role === 'user').length;
      const agentMessages = history.filter(m => m.role === 'assistant').length;

      await supabase.from('crm_customers').update({
        ai_summary: parsed.summary,
        ai_summary_updated_at: new Date().toISOString(),
        ai_tags: parsed.tags || [],
      }).eq('id', customerId);

      // Create interaction record
      await supabase.from('crm_interactions').insert({
        customer_id: customerId,
        interaction_type: 'chat',
        session_key: sessionKey,
        title: `Hội thoại: ${(parsed.summary || '').slice(0, 50)}...`,
        content: parsed.summary,
        metadata: {
          message_count: history.length,
          customer_messages: customerMessages,
          agent_messages: agentMessages,
          sentiment: parsed.sentiment,
          tags: parsed.tags,
        },
      });

      // Update conversation stats
      await supabase.rpc('increment_customer_stats', {
        p_id: customerId,
        p_orders: 0,
        p_revenue: 0,
      }).catch(() => {});

      // Increment total_conversations directly
      const { data: cust } = await supabase
        .from('crm_customers')
        .select('total_conversations')
        .eq('id', customerId)
        .single();

      if (cust) {
        await supabase.from('crm_customers').update({
          total_conversations: (cust.total_conversations || 0) + 1,
        }).eq('id', customerId);
      }

      console.log(`[AISummarizer] Tóm tắt cho ${customerId}: ${(parsed.summary || '').slice(0, 80)}`);
    } catch (err: any) {
      console.error('[AISummarizer] Lỗi:', err.message);
    }
  }
}
