// ============================================================================
// @gem/services - Barrel Export
// GEM Content Control Center
// ============================================================================

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
export { getSupabase, getSupabaseAdmin } from "./api/supabase";

// ---------------------------------------------------------------------------
// Auth service
// ---------------------------------------------------------------------------
export {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getSession,
  getProfile,
  updateProfile,
  onAuthStateChange,
} from "./api/authService";

// ---------------------------------------------------------------------------
// Notification service
// ---------------------------------------------------------------------------
export {
  create as createNotification,
  getUnread as getUnreadNotifications,
  markAsRead as markNotificationAsRead,
  markAllRead as markAllNotificationsRead,
  getCount as getUnreadNotificationCount,
} from "./data/notificationService";

// ---------------------------------------------------------------------------
// Activity service
// ---------------------------------------------------------------------------
export { log as logActivity } from "./data/activityService";

// ---------------------------------------------------------------------------
// Claude AI service
// ---------------------------------------------------------------------------
export { claudeService } from "./api/claudeService";
export type {
  ClaudeGenerateParams,
  ClaudeGenerateResult,
} from "./api/claudeService";

// ---------------------------------------------------------------------------
// Content data services
// ---------------------------------------------------------------------------
export { scriptService } from "./data/scriptService";
export type { ScriptListParams, ScriptListResult, DashboardStats } from "./data/scriptService";

export { titleService } from "./data/titleService";
export { socialPostService } from "./data/socialPostService";
export type { SocialPostListParams } from "./data/socialPostService";

export { imagePromptService } from "./data/imagePromptService";
export { calendarService } from "./data/calendarService";
export { generationJobService } from "./data/generationJobService";
export { plannerService } from "./data/plannerService";
export type { PlannerItem, PlannerItemInsert } from "./data/plannerService";

// ---------------------------------------------------------------------------
// Content generation services
// ---------------------------------------------------------------------------
export {
  buildSystemPrompt,
  getPersonaDescription,
  getTrackDescription,
  getTermConversions,
  getGemFeatures,
  getStructureForType,
} from "./content/brandVoicePrompt";
export type { BuildPromptParams } from "./content/brandVoicePrompt";
export { brandVoiceChecker } from "./content/brandVoiceChecker";
export type { BrandVoiceCheckResult } from "./content/brandVoiceChecker";
export { scriptGenerator } from "./content/scriptGenerator";
export { titleGenerator } from "./content/titleGenerator";
export { exportService } from "./utils/exportService";
export { vietnameseNLP } from "./utils/vietnameseNLP";

// ---------------------------------------------------------------------------
// Phase 3: Advanced services
// ---------------------------------------------------------------------------
export { repurposeEngine } from "./content/repurposeEngine";
export type {
  RepurposeTarget,
  RepurposeParams,
  RepurposeResult,
  FacebookPost,
  EmailSequence,
  ShortClip,
  LandingPageCopy,
  CommunityQuestion,
} from "./content/repurposeEngine";

export { ctaRulesEngine, FUNNELS, CTA_PATTERNS } from "./content/ctaRulesEngine";
export type {
  CTAValidation,
  CTAStep,
  CTARecommendation,
  FunnelConfig,
} from "./content/ctaRulesEngine";

export { analyticsAI } from "./content/analyticsAI";
export type {
  YTInsight,
  TopPerformer,
  Underperformer,
  ActionPlanItem,
  ContentGaps,
  TitleInsights,
  RevenueInsights,
} from "./content/analyticsAI";

export { youtubeService } from "./api/youtubeService";
export type {
  ChannelStats,
  VideoPerformance,
  RetentionPoint,
  TrafficSource,
  DemographicData,
  AnalyticsData,
} from "./api/youtubeService";

export { syncService } from "./data/syncService";
export type { QueuedAction, SyncConflict, SyncResult } from "./data/syncService";

export { onboardingService, onboardingSteps } from "./data/onboardingService";
export type { OnboardingStep, ScreenId } from "./data/onboardingService";

// ---------------------------------------------------------------------------
// Phase 4: AI Optimization services
// ---------------------------------------------------------------------------
export { modelRouter } from "./api/modelRouter";
export type { ModelConfig, CostEstimate } from "./api/modelRouter";

export { cascadingPipeline } from "./content/cascadingPipeline";
export type { CascadingParams, CascadingResult } from "./content/cascadingPipeline";

// ---------------------------------------------------------------------------
// Phase 5: Job Queue & Scheduling services
// ---------------------------------------------------------------------------
export { jobQueue } from "./jobs/jobQueue";
export type {
  JobType,
  AddJobParams,
  JobListFilter,
  JobListResult,
} from "./jobs/jobQueue";

export { jobRunner } from "./jobs/jobRunner";
export type { JobRunnerConfig } from "./jobs/jobRunner";

export { schedulerService } from "./jobs/schedulerService";
export type {
  ScheduledTask,
  ReminderParams,
} from "./jobs/schedulerService";

// ---------------------------------------------------------------------------
// Phase 5: Webhook service
// ---------------------------------------------------------------------------
export { webhookService } from "./api/webhookService";
export type {
  WebhookEventType,
  WebhookChannel,
  WebhookConfig,
  WebhookPayload,
  WebhookSendResult,
} from "./api/webhookService";

// ---------------------------------------------------------------------------
// Phase 5: Backup service
// ---------------------------------------------------------------------------
export { backupService } from "./utils/backupService";
export type {
  BackupData,
  BackupInfo,
} from "./utils/backupService";

// ---------------------------------------------------------------------------
// Phase 5: Slug generator
// ---------------------------------------------------------------------------
export { slugGenerator } from "./utils/slugGenerator";

// ---------------------------------------------------------------------------
// Phase 5: AI Optimization services
// ---------------------------------------------------------------------------
export { anomalyDetector } from "./content/anomalyDetector";
export type { AnomalyAlert } from "./content/anomalyDetector";

export { contentClassifier } from "./content/contentClassifier";
export type { ClassificationResult } from "./content/contentClassifier";

export { seriesLinker } from "./content/seriesLinker";
export type { ScriptEntry, DetectedSeries } from "./content/seriesLinker";

export { duplicateDetector } from "./content/duplicateDetector";
export type { DuplicateCheckResult, SimilarScript } from "./content/duplicateDetector";

export { feedbackLoop } from "./content/feedbackLoop";
export type { VideoWithParams, ParamPerformance, OptimalParams, PerformanceAnalysis } from "./content/feedbackLoop";

export { ctrPredictor } from "./content/ctrPredictor";
export type { CTRPrediction, CTRFactor, PredictParams } from "./content/ctrPredictor";

export { clipScorer } from "./content/clipScorer";
export type { ClipScore, ClipFactors, ClipSuggestion } from "./content/clipScorer";

// ---------------------------------------------------------------------------
// Phase 5: Whisper service (desktop only)
// ---------------------------------------------------------------------------
export {
  transcribe as whisperTranscribe,
  transcribeVideo as whisperTranscribeVideo,
  checkModelAvailable as whisperCheckModel,
  checkFfmpegAvailable as whisperCheckFfmpeg,
  getVideoInfo as whisperGetVideoInfo,
  sendNotification as sendDesktopNotification,
} from "./api/whisperService";
export type {
  TranscriptionResult,
  TranscriptionSegment,
  VideoInfo,
  ProgressCallback,
} from "./api/whisperService";

// ---------------------------------------------------------------------------
// Phase 5: Cache configuration
// ---------------------------------------------------------------------------
export { STALE_TIMES, CACHE_TIMES, queryKeys, prefetchHints } from "./utils/cacheConfig";

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------
export { useAppStore } from "./store/useAppStore";
export type { AppStore, AuthSlice, UISlice, NotificationSlice } from "./store/useAppStore";

// ---------------------------------------------------------------------------
// Namespaced re-exports (for consumers that prefer `notificationService.create`)
// ---------------------------------------------------------------------------
import * as notificationService from "./data/notificationService";
import * as activityService from "./data/activityService";
import * as authService from "./api/authService";

export { notificationService, activityService, authService };
