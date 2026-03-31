// Channel-Agent Auto-Reply — Rapid Message Merger
// Groups messages from same chatId within a time window, then flushes as one merged message

import type { InboundMessage } from './types.js';

const DEFAULT_WINDOW_MS = 5000; // 5 second debounce — group rapid customer messages

interface PendingBatch {
  messages: InboundMessage[];
  timer: ReturnType<typeof setTimeout>;
  resolve: (merged: InboundMessage) => void;
}

class MessageDebouncer {
  private pending = new Map<string, PendingBatch>();
  private windowMs: number;

  constructor(windowMs: number = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Add a message to the debounce buffer.
   * Returns a Promise that resolves with the merged message when the window closes,
   * or null if this message was absorbed into an existing batch.
   *
   * Usage:
   *   const merged = await debouncer.add(msg);
   *   if (merged) { // process merged message }
   */
  add(msg: InboundMessage): Promise<InboundMessage | null> {
    const batchKey = `${msg.channel}:${msg.chatId}`;
    const existing = this.pending.get(batchKey);

    if (existing) {
      // Absorb into existing batch — extend the timer
      existing.messages.push(msg);
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => this.flush(batchKey), this.windowMs);
      // Return null — caller should not process this message individually
      return Promise.resolve(null);
    }

    // New batch — return a promise that resolves when the window closes
    return new Promise<InboundMessage>((resolve) => {
      const timer = setTimeout(() => this.flush(batchKey), this.windowMs);

      this.pending.set(batchKey, {
        messages: [msg],
        timer,
        resolve,
      });
    });
  }

  /**
   * Flush a batch: merge messages and resolve the promise.
   */
  private flush(batchKey: string): void {
    const batch = this.pending.get(batchKey);
    if (!batch) return;

    this.pending.delete(batchKey);

    if (batch.messages.length === 1) {
      batch.resolve(batch.messages[0]!);
      return;
    }

    // Merge multiple messages into one
    const first = batch.messages[0]!;
    const merged: InboundMessage = {
      ...first,
      content: batch.messages.map(m => m.content).join('\n'),
      // Use the latest timestamp
      timestamp: batch.messages[batch.messages.length - 1]!.timestamp,
      // Combine media from all messages
      media: batch.messages.flatMap(m => m.media || []),
      // Update dedupe key to reflect the merged batch
      dedupeKey: `merged:${batchKey}:${Date.now()}`,
      metadata: {
        ...first.metadata,
        mergedCount: batch.messages.length,
        originalIds: batch.messages.map(m => m.id),
      },
    };

    batch.resolve(merged);
  }

  /**
   * Force-flush all pending batches (for graceful shutdown).
   */
  flushAll(): void {
    for (const key of this.pending.keys()) {
      this.flush(key);
    }
  }

  /**
   * Destroy: clear all timers and pending batches.
   */
  destroy(): void {
    for (const batch of this.pending.values()) {
      clearTimeout(batch.timer);
    }
    this.pending.clear();
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}

// Singleton instance
export const debouncer = new MessageDebouncer();
