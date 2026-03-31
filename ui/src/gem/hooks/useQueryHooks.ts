'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@gem/services';
import type { CcScriptsRow, ContentType, Track, ScriptStatus, SocialPostStatus, SocialPlatform } from '@gem/types';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  scripts: {
    all: ['scripts'] as const,
    list: (filters?: Record<string, unknown>) => ['scripts', 'list', filters] as const,
    detail: (id: string) => ['scripts', 'detail', id] as const,
  },
  titles: {
    all: ['titles'] as const,
    list: (filters?: Record<string, unknown>) => ['titles', 'list', filters] as const,
    byScript: (scriptId: string) => ['titles', 'by-script', scriptId] as const,
  },
  socialPosts: {
    all: ['social-posts'] as const,
    list: (filters?: Record<string, unknown>) => ['social-posts', 'list', filters] as const,
    detail: (id: string) => ['social-posts', 'detail', id] as const,
  },
  imagePrompts: {
    all: ['image-prompts'] as const,
    list: (filters?: Record<string, unknown>) => ['image-prompts', 'list', filters] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    events: (start: string, end: string) => ['calendar', 'events', start, end] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
    count: ['notifications', 'count'] as const,
  },
  brandRules: {
    all: ['brand-rules'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    channel: (period: string) => ['analytics', 'channel', period] as const,
    videos: (filters?: Record<string, unknown>) => ['analytics', 'videos', filters] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    recentActivity: ['dashboard', 'recent-activity'] as const,
  },
  promptTemplates: {
    all: ['prompt-templates'] as const,
    byType: (type: string) => ['prompt-templates', 'by-type', type] as const,
  },
} as const;

// ============================================================================
// Stale Time Configuration
// ============================================================================

const STALE_TIMES = {
  scripts: 5 * 60 * 1000,       // 5 phút
  analytics: 60 * 60 * 1000,     // 1 giờ
  brandRules: 24 * 60 * 60 * 1000, // 24 giờ
  calendar: 30 * 1000,           // 30 giây
  notifications: 15 * 1000,      // 15 giây
  dashboard: 2 * 60 * 1000,      // 2 phút
  promptTemplates: 60 * 60 * 1000, // 1 giờ
} as const;

// ============================================================================
// Scripts Hooks
// ============================================================================

interface ScriptFilters {
  content_type?: string;
  track?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useScripts(filters?: ScriptFilters) {
  return useQuery({
    queryKey: queryKeys.scripts.list(filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from('cc_scripts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.content_type) {
        query = query.eq('content_type', filters.content_type as ContentType);
      }
      if (filters?.track) {
        query = query.eq('track', filters.track as Track);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as ScriptStatus);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const page = filters?.page ?? 0;
      const pageSize = filters?.pageSize ?? 20;
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);
      return { data: data ?? [], count: count ?? 0 };
    },
    staleTime: STALE_TIMES.scripts,
  });
}

export function useScript(id: string) {
  return useQuery({
    queryKey: queryKeys.scripts.detail(id),
    queryFn: async (): Promise<CcScriptsRow> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_scripts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as CcScriptsRow;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.scripts,
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (script: Record<string, unknown>) => {
      const supabase = getSupabase();

      let created_by = script.created_by;
      if (!created_by) {
        const { data: { user } } = await supabase.auth.getUser();
        created_by = user?.id;
      }

      const { data, error } = await supabase
        .from('cc_scripts')
        .insert({ ...script, created_by } as unknown as CcScriptsRow)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_scripts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts.detail(variables.id) });
    },
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('cc_scripts')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
}

// ============================================================================
// Titles Hooks
// ============================================================================

export function useTitles(scriptId?: string) {
  return useQuery({
    queryKey: scriptId ? queryKeys.titles.byScript(scriptId) : queryKeys.titles.all,
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from('cc_titles')
        .select('*')
        .order('created_at', { ascending: false });

      if (scriptId) {
        query = query.eq('script_id', scriptId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.scripts,
  });
}

// ============================================================================
// Social Posts Hooks
// ============================================================================

export function useSocialPosts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.socialPosts.list(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from('cc_social_posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as SocialPostStatus);
      }
      if (filters?.platform) {
        query = query.eq('platform', filters.platform as SocialPlatform);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { data: data ?? [], count: count ?? 0 };
    },
    staleTime: STALE_TIMES.scripts,
  });
}

export function useSocialPost(id: string) {
  return useQuery({
    queryKey: queryKeys.socialPosts.detail(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_social_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.scripts,
  });
}

export function useUpdateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_social_posts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.all });
    },
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Record<string, unknown>) => {
      const supabase = getSupabase();

      let created_by = post.created_by;
      if (!created_by) {
        const { data: { user } } = await supabase.auth.getUser();
        created_by = user?.id;
      }

      // We use 'any' here to avoid complex typing for now, assuming the payload matches the DB
      const { data, error } = await supabase
        .from('cc_social_posts')
        .insert({ ...post, created_by } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.all });
    },
  });
}

export function useDeleteSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('cc_social_posts')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.all });
    },
  });
}

// ============================================================================
// Calendar Hooks
// ============================================================================

export function useCalendarEvents(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.calendar.events(start, end),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_calendar_events')
        .select('*')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date', { ascending: true });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.calendar,
  });
}

// ============================================================================
// Notifications Hooks
// ============================================================================

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('cc_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.notifications,
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.count,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('cc_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: STALE_TIMES.notifications,
  });
}

// ============================================================================
// Brand Rules Hooks
// ============================================================================

export function useBrandRules() {
  return useQuery({
    queryKey: queryKeys.brandRules.all,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_brand_voice_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.brandRules,
  });
}

// ============================================================================
// Dashboard Stats Hook
// ============================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      const supabase = getSupabase();

      const [scriptsResult, publishedResult, reviewResult, draftResult] = await Promise.all([
        supabase.from('cc_scripts').select('*', { count: 'exact', head: true }),
        supabase.from('cc_scripts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('cc_scripts').select('*', { count: 'exact', head: true }).eq('status', 'review'),
        supabase.from('cc_scripts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);

      return {
        totalScripts: scriptsResult.count ?? 0,
        publishedScripts: publishedResult.count ?? 0,
        pendingReview: reviewResult.count ?? 0,
        drafts: draftResult.count ?? 0,
      };
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

// ============================================================================
// Recent Activity Hook
// ============================================================================

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivity,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cc_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

// ============================================================================
// Prompt Templates Hooks
// ============================================================================

export function usePromptTemplates(type?: string) {
  return useQuery({
    queryKey: type ? queryKeys.promptTemplates.byType(type) : queryKeys.promptTemplates.all,
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from('cc_prompt_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (type) {
        query = query.eq('content_type', type);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIMES.promptTemplates,
  });
}
