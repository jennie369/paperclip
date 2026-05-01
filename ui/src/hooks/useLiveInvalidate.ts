// useLiveInvalidate — subscribe to Supabase Realtime on one or more tables
// and invalidate React Query keys when rows change. Debounced 300ms so
// burst updates don't thrash React Query cache.
//
// Usage:
//   useLiveInvalidate({
//     table: 'crm_tickets',
//     queryKeys: [['crm', 'tickets'], ['crm', 'stats']],
//   });
//
//   // Multiple tables → multiple subscriptions
//   useLiveInvalidate({
//     tables: ['gem_pipelines', 'gem_sops', 'gem_sop_executions'],
//     queryKeys: [['sop-engine', 'pipelines']],
//   });
//
// Event types subscribed: INSERT | UPDATE | DELETE (all by default).
//
// Uses the shared supabase client from lib/supabaseClient.ts. Falls back
// silently if Realtime connection fails — UI still works, just without
// auto-refresh (user can manually refetch).

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface UseLiveInvalidateOptions {
  /** Single table to subscribe to. */
  table?: string;
  /** Multiple tables to subscribe to (convenience). */
  tables?: string[];
  /** React Query keys to invalidate on change. */
  queryKeys: QueryKey[];
  /** Event types to listen for (default: '*' = all). */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Optional PostgREST filter (e.g. "status=eq.pending"). */
  filter?: string;
  /** Debounce window in ms (default 300). */
  debounceMs?: number;
  /** Called on each raw event (optional). */
  onEvent?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Disable subscription (e.g. until a prerequisite is loaded). */
  enabled?: boolean;
}

export function useLiveInvalidate({
  table,
  tables,
  queryKeys,
  event = '*',
  filter,
  debounceMs = 300,
  onEvent,
  enabled = true,
}: UseLiveInvalidateOptions) {
  const qc = useQueryClient();
  const queryKeysRef = useRef(queryKeys);
  const onEventRef = useRef(onEvent);
  const debounceTimer = useRef<number | null>(null);

  // Keep latest callbacks + keys without resubscribing
  queryKeysRef.current = queryKeys;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const allTables = tables || (table ? [table] : []);
    if (allTables.length === 0) return;

    const channels: RealtimeChannel[] = [];

    const invalidate = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        for (const key of queryKeysRef.current) {
          qc.invalidateQueries({ queryKey: key });
        }
        debounceTimer.current = null;
      }, debounceMs);
    };

    for (const t of allTables) {
      const channelName = `live:${t}${filter ? `:${filter}` : ''}`;
      const channel = supabase.channel(channelName);

      const config: any = {
        event,
        schema: 'public',
        table: t,
      };
      if (filter) config.filter = filter;

      channel.on('postgres_changes', config, (payload) => {
        onEventRef.current?.(payload);
        invalidate();
      });

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[useLiveInvalidate] Channel ${channelName} status: ${status}`);
        }
      });

      channels.push(channel);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      for (const ch of channels) {
        supabase.removeChannel(ch);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, table, filter, event, debounceMs, JSON.stringify(tables || [])]);
}
