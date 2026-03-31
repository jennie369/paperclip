'use client';

// ============================================================================
// Hook: useAnalytics — CTR Prediction & AI Insights
// GEM Content Control Center
// ============================================================================

import { useMutation, useQuery } from '@tanstack/react-query';
import type { CTRPrediction, PredictParams, YTInsight } from '@gem/services';
import { queryKeys } from './useQueryHooks';

// ── Types ───────────────────────────────────────────────────────

interface CTRPredictResponse {
  success: boolean;
  data?: CTRPrediction;
  error?: string;
}

interface InsightsResponse {
  success: boolean;
  data?: YTInsight | YTInsight[];
  error?: string;
}

// ── useCTRPredict — Dự đoán CTR cho tiêu đề/thumbnail ──────────

export function useCTRPredict() {
  return useMutation({
    mutationFn: async (params: PredictParams): Promise<CTRPrediction> => {
      const response = await fetch('/api/analytics/ctr-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const json = (await response.json()) as CTRPredictResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Lỗi khi dự đoán CTR');
      }

      return json.data;
    },
  });
}

// ── useLatestInsight — Lấy insight mới nhất ─────────────────────

export function useLatestInsight() {
  return useQuery({
    queryKey: [...queryKeys.analytics.all, 'latest-insight'],
    queryFn: async (): Promise<YTInsight | null> => {
      const response = await fetch('/api/analytics/insights?latest=true');
      const json = (await response.json()) as InsightsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Lỗi khi tải insight');
      }

      return (json.data as YTInsight) ?? null;
    },
    staleTime: 60 * 60 * 1000, // 1 giờ
  });
}

// ── useInsightHistory — Lịch sử insights ────────────────────────

export function useInsightHistory(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.analytics.all, 'insight-history', limit],
    queryFn: async (): Promise<YTInsight[]> => {
      const response = await fetch(`/api/analytics/insights?limit=${limit}`);
      const json = (await response.json()) as InsightsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Lỗi khi tải lịch sử insights');
      }

      return (json.data as YTInsight[]) ?? [];
    },
    staleTime: 60 * 60 * 1000, // 1 giờ
  });
}

// ── useGenerateInsight — Tạo insight mới ────────────────────────

export function useGenerateInsight() {
  return useMutation({
    mutationFn: async (params?: { periodStart?: string; periodEnd?: string }): Promise<YTInsight> => {
      const response = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params ?? {}),
      });

      const json = (await response.json()) as InsightsResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Lỗi khi tạo insight');
      }

      return json.data as YTInsight;
    },
  });
}

export type { CTRPrediction, PredictParams, YTInsight };
