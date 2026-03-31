'use client';

// ============================================================================
// useRealtime — Shared Realtime Subscription Hook
// GEM Content Control Center
//
// Subscribe to Supabase Realtime channels for scripts, generation_jobs,
// notifications, and calendar_events. Auto-invalidates React Query
// caches when changes are detected.
// ============================================================================

import { useEffect, useRef } from 'react';
import { getSupabase } from '@gem/services';

// Minimal QueryClient interface to avoid hard dependency on @tanstack/react-query
interface QueryClient {
  invalidateQueries: (options: { queryKey: readonly string[] }) => void;
}

// ---------------------------------------------------------------------------
// Channel configuration
// ---------------------------------------------------------------------------

interface ChannelConfig {
  readonly table: string;
  readonly queryKeys: readonly string[][];
}

const CHANNELS: readonly ChannelConfig[] = [
  {
    table: 'cc_scripts',
    queryKeys: [['scripts'], ['dashboard']],
  },
  {
    table: 'cc_generation_jobs',
    queryKeys: [['generation-jobs'], ['dashboard']],
  },
  {
    table: 'cc_notifications',
    queryKeys: [['notifications']],
  },
  {
    table: 'cc_calendar_events',
    queryKeys: [['calendar']],
  },
];

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseRealtimeOptions {
  /** Whether realtime subscriptions are enabled (default: true) */
  enabled?: boolean;
  /** Additional tables to subscribe to beyond the default 4 */
  additionalTables?: readonly ChannelConfig[];
  /** Callback when any realtime event is received */
  onEvent?: (table: string, eventType: string) => void;
  /** QueryClient instance from @tanstack/react-query */
  queryClient: QueryClient;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Subscribe to Supabase Realtime on 4 core channels:
 * cc_scripts, cc_generation_jobs, cc_notifications, cc_calendar_events.
 *
 * Automatically invalidates React Query caches when changes are detected.
 *
 * @example
 * ```tsx
 * useRealtimeSubscriptions({ enabled: isAuthenticated });
 * ```
 */
export function useRealtimeSubscriptions(options: UseRealtimeOptions): void {
  const { enabled = true, additionalTables, onEvent, queryClient } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    const allChannels = [...CHANNELS, ...(additionalTables ?? [])];
    const subscriptions: ReturnType<typeof supabase.channel>[] = [];

    for (const config of allChannels) {
      const channelName = `realtime:public:${config.table}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: config.table },
          (payload) => {
            // Invalidate all associated query keys
            for (const queryKey of config.queryKeys) {
              queryClient.invalidateQueries({ queryKey });
            }

            // Fire optional callback
            onEventRef.current?.(config.table, payload.eventType);
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error(`[useRealtime] Lỗi kênh "${channelName}".`);
          }
        });

      subscriptions.push(channel);
    }

    // Cleanup: remove all channels on unmount
    return () => {
      for (const channel of subscriptions) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, queryClient, additionalTables]);
}
