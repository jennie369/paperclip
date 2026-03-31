// ============================================================================
// Cache Strategy — React Query Configuration
// GEM Content Control Center
// ============================================================================

// ---------------------------------------------------------------------------
// Stale times (how long data is considered fresh)
// ---------------------------------------------------------------------------

export const STALE_TIMES = {
  /** Scripts: 5 minutes — moderate frequency of changes */
  scripts: 5 * 60 * 1000,

  /** Titles: 5 minutes */
  titles: 5 * 60 * 1000,

  /** Social posts: 5 minutes */
  socialPosts: 5 * 60 * 1000,

  /** Image prompts: 5 minutes */
  imagePrompts: 5 * 60 * 1000,

  /** Calendar events: 30 seconds — frequently updated, needs near-realtime */
  calendarEvents: 30 * 1000,

  /** Analytics data: 1 hour — YouTube data updates slowly */
  analytics: 60 * 60 * 1000,

  /** AI insights: 1 hour — generated weekly */
  insights: 60 * 60 * 1000,

  /** Brand rules: 24 hours — rarely changes */
  brandRules: 24 * 60 * 60 * 1000,

  /** Profiles: 10 minutes */
  profiles: 10 * 60 * 1000,

  /** Notifications: 30 seconds — near-realtime */
  notifications: 30 * 1000,

  /** Dashboard stats: 2 minutes */
  dashboardStats: 2 * 60 * 1000,

  /** Generation jobs: 10 seconds — need live status */
  generationJobs: 10 * 1000,
} as const;

// ---------------------------------------------------------------------------
// Cache times (how long data stays in cache after component unmount)
// ---------------------------------------------------------------------------

export const CACHE_TIMES = {
  /** Short-lived: 5 minutes */
  short: 5 * 60 * 1000,

  /** Medium: 30 minutes */
  medium: 30 * 60 * 1000,

  /** Long: 1 hour */
  long: 60 * 60 * 1000,

  /** Persistent: 24 hours (brand rules, rarely changing data) */
  persistent: 24 * 60 * 60 * 1000,
} as const;

// ---------------------------------------------------------------------------
// Query key factory (consistent key generation)
// ---------------------------------------------------------------------------

export const queryKeys = {
  scripts: {
    all: ['scripts'] as const,
    list: (params?: Record<string, unknown>) => ['scripts', 'list', params] as const,
    detail: (id: string) => ['scripts', 'detail', id] as const,
    stats: ['scripts', 'stats'] as const,
  },
  titles: {
    all: ['titles'] as const,
    byScript: (scriptId: string) => ['titles', 'byScript', scriptId] as const,
  },
  socialPosts: {
    all: ['socialPosts'] as const,
    list: (params?: Record<string, unknown>) => ['socialPosts', 'list', params] as const,
    byCampaign: (campaignName: string) => ['socialPosts', 'campaign', campaignName] as const,
  },
  imagePrompts: {
    all: ['imagePrompts'] as const,
    byScript: (scriptId: string) => ['imagePrompts', 'byScript', scriptId] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    byRange: (start: string, end: string) => ['calendar', 'range', start, end] as const,
    thisWeek: ['calendar', 'thisWeek'] as const,
    distribution: ['calendar', 'distribution'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    videos: ['analytics', 'videos'] as const,
    insights: ['analytics', 'insights'] as const,
    latestInsight: ['analytics', 'latestInsight'] as const,
    retention: (videoId: string) => ['analytics', 'retention', videoId] as const,
  },
  brandRules: {
    all: ['brandRules'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
    count: ['notifications', 'count'] as const,
  },
  generationJobs: {
    all: ['generationJobs'] as const,
    active: ['generationJobs', 'active'] as const,
    detail: (id: string) => ['generationJobs', 'detail', id] as const,
  },
  profiles: {
    current: ['profiles', 'current'] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Prefetch hints (pages that should prefetch data for target page)
// ---------------------------------------------------------------------------

export const prefetchHints: Record<string, string[]> = {
  '/dashboard': ['scripts.stats', 'calendar.thisWeek', 'notifications.count'],
  '/ai-gen': ['scripts.list', 'brandRules.all'],
  '/latc': ['scripts.list', 'brandRules.all'],
  '/tmt': ['scripts.list', 'brandRules.all'],
  '/calendar': ['calendar.thisWeek', 'calendar.distribution'],
  '/analytics': ['analytics.videos', 'analytics.latestInsight'],
  '/repurpose': ['scripts.list'],
  '/brand': ['brandRules.all'],
};
