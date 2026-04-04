// Message Buffer — gom tin nhắn liên tiếp từ cùng sender trong 4s
// Tránh agent reply từng tin riêng lẻ khi khách gửi nhiều tin nhanh

type BufferedMessage = {
  channel: string;
  chatId: string;
  senderId: string;
  messages: string[];
  firstAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const buffers = new Map<string, BufferedMessage>();
const BUFFER_WINDOW_MS = 4_000; // 4 seconds

/**
 * Buffer incoming messages by sender.
 * Calls onFlush with combined message after BUFFER_WINDOW_MS of silence.
 */
export function bufferMessage(
  channel: string,
  chatId: string,
  senderId: string,
  message: string,
  onFlush: (combined: string) => void,
): void {
  const key = `${channel}:${chatId}:${senderId}`;
  const existing = buffers.get(key);

  if (existing) {
    // Add to existing buffer, reset timer
    existing.messages.push(message);
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flush(key, onFlush), BUFFER_WINDOW_MS);
  } else {
    // Start new buffer
    const entry: BufferedMessage = {
      channel,
      chatId,
      senderId,
      messages: [message],
      firstAt: Date.now(),
      timer: setTimeout(() => flush(key, onFlush), BUFFER_WINDOW_MS),
    };
    buffers.set(key, entry);
  }
}

function flush(key: string, onFlush: (combined: string) => void): void {
  const entry = buffers.get(key);
  if (!entry) return;
  buffers.delete(key);

  const combined = entry.messages.join('\n');
  console.log(`[Buffer] Flushing ${entry.messages.length} messages from ${entry.senderId} (${Date.now() - entry.firstAt}ms window)`);
  onFlush(combined);
}

/**
 * Check if a sender currently has buffered messages (pending flush).
 */
export function hasPendingBuffer(channel: string, chatId: string, senderId: string): boolean {
  return buffers.has(`${channel}:${chatId}:${senderId}`);
}

/**
 * Cancel and discard a pending buffer (e.g., on disconnect).
 */
export function cancelBuffer(channel: string, chatId: string, senderId: string): void {
  const key = `${channel}:${chatId}:${senderId}`;
  const entry = buffers.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    buffers.delete(key);
  }
}
