'use client';

// ============================================================================
// Hook: useRepurpose — Tái chế kịch bản thành multi-platform content
// GEM Content Control Center
// ============================================================================

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@gem/services';
import type { RepurposeTarget, RepurposeResult } from '@gem/services';
import { queryKeys } from './useQueryHooks';

// ── Types ───────────────────────────────────────────────────────
interface ScriptForRepurpose {
  id: string;
  title: string;
  content_type: string;
  track: string;
  persona: string;
  word_count: number;
  body: string;
  created_at: string;
  status: string;
}

interface RepurposeApiResponse {
  success: boolean;
  data?: RepurposeResult;
  error?: string;
}

interface TargetProgress {
  target: RepurposeTarget;
  status: 'pending' | 'generating' | 'done' | 'error';
}

// ── useScriptsForRepurpose — Fetch real scripts from DB ─────────
export function useScriptsForRepurpose() {
  return useQuery({
    queryKey: ['scripts', 'for-repurpose'],
    queryFn: async (): Promise<ScriptForRepurpose[]> => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('cc_scripts')
        .select('id, title, content_type, track, persona, word_count, body, created_at, status')
        .in('status', ['draft', 'review', 'approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useScriptsForRepurpose] Error:', error.message);
        return [];
      }
      return (data ?? []) as ScriptForRepurpose[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── useRepurposeScript — Mutation to call /api/repurpose ────────
export function useRepurposeScript() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<TargetProgress[]>([]);

  const mutation = useMutation({
    mutationFn: async ({
      scriptId,
      targets,
    }: {
      scriptId: string;
      targets: RepurposeTarget[];
    }): Promise<RepurposeResult> => {
      // Init progress tracking
      setProgress(targets.map((t) => ({ target: t, status: 'generating' })));

      const response = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, targets }),
      });

      const json = (await response.json()) as RepurposeApiResponse;

      if (!response.ok || !json.success || !json.data) {
        // Mark all as error
        setProgress((prev) =>
          prev.map((p) => ({ ...p, status: 'error' as const }))
        );
        throw new Error(json.error ?? 'Lỗi khi tái chế nội dung');
      }

      // Update progress based on results
      const result = json.data;
      setProgress(
        targets.map((t) => ({
          target: t,
          status: result.completedTargets.includes(t) ? 'done' as const : 'error' as const,
        }))
      );

      return result;
    },
    onSuccess: () => {
      // Invalidate social posts cache since new ones may have been created
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.all });
    },
  });

  const reset = useCallback(() => {
    setProgress([]);
    mutation.reset();
  }, [mutation]);

  return {
    repurpose: mutation.mutate,
    repurposeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error?.message ?? null,
    progress,
    reset,
  };
}

export type { ScriptForRepurpose, TargetProgress, RepurposeTarget };
