'use client';

// ============================================================================
// Hook: useJobSubscription — Realtime job status monitoring
// GEM Content Control Center
//
// Subscribe to cc_generation_jobs changes via Supabase Realtime.
// Replaces long-polling / HTTP wait pattern.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@gem/services';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobUpdate {
  id: string;
  job_type: string;
  status: JobStatus;
  progress: number;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  generation_time_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface UseJobSubscriptionOptions {
  /** Only listen for specific job IDs */
  jobIds?: string[];
  /** Auto-unsubscribe when all jobs are terminal */
  autoCleanup?: boolean;
  /** Callbacks */
  onQueued?: (job: JobUpdate) => void;
  onProcessing?: (job: JobUpdate) => void;
  onCompleted?: (job: JobUpdate) => void;
  onFailed?: (job: JobUpdate) => void;
  onAnyUpdate?: (job: JobUpdate) => void;
}

// ── Hook ────────────────────────────────────────────────────────

export function useJobSubscription(options: UseJobSubscriptionOptions = {}) {
  const {
    jobIds,
    autoCleanup = true,
    onQueued,
    onProcessing,
    onCompleted,
    onFailed,
    onAnyUpdate,
  } = options;

  const [activeJobs, setActiveJobs] = useState<Map<string, JobUpdate>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef({ onQueued, onProcessing, onCompleted, onFailed, onAnyUpdate });

  // Keep callbacks ref fresh
  callbacksRef.current = { onQueued, onProcessing, onCompleted, onFailed, onAnyUpdate };

  // ── Subscribe to Realtime ──────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    let isMounted = true;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Build filter for user's jobs
      const filter = `created_by=eq.${user.id}`;

      const channel = supabase
        .channel('job-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cc_generation_jobs',
            filter,
          },
          (payload) => {
            if (!isMounted) return;
            const job = (payload.new ?? payload.old) as JobUpdate | undefined;
            if (!job?.id) return;

            // Filter by jobIds if specified
            if (jobIds && jobIds.length > 0 && !jobIds.includes(job.id)) return;

            // Update active jobs map
            setActiveJobs((prev) => {
              const next = new Map(prev);
              const isTerminal = ['completed', 'failed', 'cancelled'].includes(job.status);

              if (isTerminal && autoCleanup) {
                // Keep for 5 seconds then remove (so UI can show final state)
                setTimeout(() => {
                  setActiveJobs((p) => {
                    const n = new Map(p);
                    n.delete(job.id);
                    return n;
                  });
                }, 5000);
              }

              next.set(job.id, job);
              return next;
            });

            // Fire callbacks
            const cbs = callbacksRef.current;
            cbs.onAnyUpdate?.(job);

            switch (job.status) {
              case 'queued':
                cbs.onQueued?.(job);
                break;
              case 'processing':
                cbs.onProcessing?.(job);
                break;
              case 'completed':
                cbs.onCompleted?.(job);
                break;
              case 'failed':
                cbs.onFailed?.(job);
                break;
            }
          }
        )
        .subscribe((status) => {
          if (isMounted) {
            setIsSubscribed(status === 'SUBSCRIBED');
          }
        });

      channelRef.current = channel;
    }

    subscribe();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        const supabase = getSupabase();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds?.join(','), autoCleanup]);

  // ── Track a specific job ───────────────────────────────────────
  const trackJob = useCallback((jobId: string) => {
    setActiveJobs((prev) => {
      const next = new Map(prev);
      next.set(jobId, {
        id: jobId,
        job_type: '',
        status: 'queued',
        progress: 0,
        output_data: null,
        error_message: null,
        model_used: null,
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        generation_time_ms: null,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      });
      return next;
    });
  }, []);

  // ── Get job by ID ──────────────────────────────────────────────
  const getJob = useCallback(
    (jobId: string): JobUpdate | undefined => activeJobs.get(jobId),
    [activeJobs]
  );

  // ── Derived state ──────────────────────────────────────────────
  const processingCount = Array.from(activeJobs.values()).filter(
    (j) => j.status === 'processing' || j.status === 'queued'
  ).length;

  const hasActiveJobs = processingCount > 0;

  return {
    activeJobs,
    isSubscribed,
    processingCount,
    hasActiveJobs,
    trackJob,
    getJob,
  };
}
