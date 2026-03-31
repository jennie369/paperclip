// Channel-Agent Auto-Reply — Message Deduplicator
// In-memory Map with TTL to prevent processing the same message twice

const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface DedupeEntry {
  expiresAt: number;
}

class MessageDeduplicator {
  private seen = new Map<string, DedupeEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.startCleanup();
  }

  /**
   * Check if a message key has been seen recently.
   * If not seen, marks it as seen and returns false.
   * If already seen, returns true (is duplicate).
   */
  isDuplicate(key: string): boolean {
    const now = Date.now();
    const entry = this.seen.get(key);

    if (entry && entry.expiresAt > now) {
      return true;
    }

    // Mark as seen
    this.seen.set(key, { expiresAt: now + this.ttlMs });
    return false;
  }

  /**
   * Manually mark a key as seen (e.g., from DB check).
   */
  mark(key: string): void {
    this.seen.set(key, { expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Remove expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.seen) {
      if (entry.expiresAt <= now) {
        this.seen.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Dedupe] Cleaned up ${removed} expired entries, ${this.seen.size} remaining`);
    }
  }

  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup timer (for graceful shutdown).
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.seen.clear();
  }

  get size(): number {
    return this.seen.size;
  }
}

// Singleton instance
export const deduplicator = new MessageDeduplicator();
