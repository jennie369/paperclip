// ReMe Memory Service — retrieve/summarize customer memories
// Graceful degradation: if ReMe is down, returns empty string silently (never blocks chat)

const REME_URL = process.env.REME_URL || 'http://localhost:8002';
const REME_TIMEOUT = 5000;

export class MemoryService {

  async retrieve(customerId: string, query: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REME_TIMEOUT);

      const res = await fetch(`${REME_URL}/retrieve_personal_memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: `customer_${customerId}`, query, top_k: 5 }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) return '';

      const data = await res.json();
      const memories = data.memories || data.results || [];
      if (!memories.length) return '';

      return '\n[MEMORY — TỪ HỘI THOẠI TRƯỚC]\n' +
        memories.map((m: any) =>
          `• ${m.date || m.created_at?.slice(0, 10) || ''}: ${m.content || m.text || ''}`
        ).join('\n');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[Memory] ReMe timeout — bỏ qua');
      } else {
        console.warn('[Memory] ReMe retrieve lỗi:', err.message);
      }
      return '';
    }
  }

  async summarize(customerId: string, messages: any[]): Promise<void> {
    if (!messages || messages.length < 3) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      await fetch(`${REME_URL}/summary_personal_memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: `customer_${customerId}`,
          messages: messages.slice(-50).map(m => ({
            role: m.sender_type === 'agent' ? 'assistant' : 'user',
            content: typeof m.content === 'string' ? m.content.slice(0, 2000) : String(m.content),
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log(`[Memory] Summarized ${messages.length} messages cho customer_${customerId}`);
    } catch (err: any) {
      console.warn('[Memory] ReMe summarize lỗi:', err.message);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${REME_URL}/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch { return false; }
  }
}

export const memoryService = new MemoryService();
