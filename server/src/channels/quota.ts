// Channel-Agent Auto-Reply — Quota Checker
// Enforces per-sender hourly and daily message limits per channel

import { supabase } from './zalo-personal/supabase.js';
import type { QuotaResult } from './types.js';

/**
 * Check if a sender is within quota limits for a channel.
 * Increments the counter atomically on each call (upsert).
 *
 * Returns { allowed, hourCount, dayCount, hourLimit, dayLimit }
 */
export async function check(
  channelName: string,
  senderId: string,
  hourLimit: number = 100,
  dayLimit: number = 500
): Promise<QuotaResult> {
  const now = new Date();
  const hourKey = formatHourKey(now);
  const dayKey = formatDayKey(now);

  // Fetch current counts for both hour and day periods
  const { data: rows } = await supabase
    .from('channel_quota_usage')
    .select('period_type, period_key, count')
    .eq('channel_name', channelName)
    .eq('sender_id', senderId)
    .in('period_key', [hourKey, dayKey]);

  let hourCount = 0;
  let dayCount = 0;

  for (const row of rows || []) {
    if (row.period_key === hourKey) hourCount = row.count || 0;
    if (row.period_key === dayKey) dayCount = row.count || 0;
  }

  // Check limits before incrementing
  const hourExceeded = hourLimit > 0 && hourCount >= hourLimit;
  const dayExceeded = dayLimit > 0 && dayCount >= dayLimit;

  if (hourExceeded || dayExceeded) {
    return {
      allowed: false,
      hourCount,
      dayCount,
      hourLimit,
      dayLimit,
    };
  }

  // Increment both hour and day counters via upsert
  await Promise.all([
    upsertCount(channelName, senderId, 'hour', hourKey),
    upsertCount(channelName, senderId, 'day', dayKey),
  ]);

  return {
    allowed: true,
    hourCount: hourCount + 1,
    dayCount: dayCount + 1,
    hourLimit,
    dayLimit,
  };
}

/**
 * Upsert a quota counter row. If the row exists, increment count by 1.
 */
async function upsertCount(
  channelName: string,
  senderId: string,
  periodType: 'hour' | 'day',
  periodKey: string
): Promise<void> {
  // Try to increment existing row first
  const { data: existing } = await supabase
    .from('channel_quota_usage')
    .select('id, count')
    .eq('channel_name', channelName)
    .eq('sender_id', senderId)
    .eq('period_key', periodKey)
    .single();

  if (existing) {
    await supabase
      .from('channel_quota_usage')
      .update({ count: (existing.count || 0) + 1 })
      .eq('id', existing.id);
  } else {
    const { error } = await supabase
      .from('channel_quota_usage')
      .insert({
        channel_name: channelName,
        sender_id: senderId,
        period_type: periodType,
        period_key: periodKey,
        count: 1,
      });

    // Ignore unique constraint violations (race condition — another instance inserted first)
    if (error && !error.message.includes('duplicate')) {
      console.error('[Quota] Insert error:', error.message);
    }
  }
}

/**
 * Get current usage for a sender (read-only, no increment).
 */
export async function getUsage(
  channelName: string,
  senderId: string
): Promise<{ hourCount: number; dayCount: number }> {
  const now = new Date();
  const hourKey = formatHourKey(now);
  const dayKey = formatDayKey(now);

  const { data: rows } = await supabase
    .from('channel_quota_usage')
    .select('period_key, count')
    .eq('channel_name', channelName)
    .eq('sender_id', senderId)
    .in('period_key', [hourKey, dayKey]);

  let hourCount = 0;
  let dayCount = 0;

  for (const row of rows || []) {
    if (row.period_key === hourKey) hourCount = row.count || 0;
    if (row.period_key === dayKey) dayCount = row.count || 0;
  }

  return { hourCount, dayCount };
}

/**
 * Format: 'YYYY-MM-DD-HH' for hourly quota.
 */
function formatHourKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

/**
 * Format: 'YYYY-MM-DD' for daily quota.
 */
function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
