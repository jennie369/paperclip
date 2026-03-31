export { cn } from "./lib/utils";

// Layout components
export { Sidebar } from "./components/layout/Sidebar";
export { Header } from "./components/layout/Header";
export { PageContainer } from "./components/layout/PageContainer";

// Shared UI components (1-6)
export { Card } from "./components/Card";
export { StatCard } from "./components/StatCard";
export { Button } from "./components/Button";
export { Input } from "./components/Input";
export { Select } from "./components/Select";
export { Textarea } from "./components/Textarea";

// Shared UI components (7-12)
export { Tag } from "./components/Tag";
export { ProgressBar } from "./components/ProgressBar";
export { SectionStep } from "./components/SectionStep";
export { DataTable } from "./components/DataTable";
export { CodeBlock } from "./components/CodeBlock";
export { ChecklistItem } from "./components/ChecklistItem";

// Shared UI components (13-17)
export { Tooltip } from "./components/Tooltip";
export { Modal } from "./components/Modal";
export { ToastContainer, useToast } from "./components/Toast";
export { EmptyState } from "./components/EmptyState";
export { Badge } from "./components/Badge";

// Phase 2 components
export { BrandVoiceScore } from "./components/BrandVoiceScore";
export { ScriptEditor } from "./components/ScriptEditor";
export { StreamingOutput } from "./components/StreamingOutput";

// Phase 3 components
export { NotificationCenter } from "./components/NotificationCenter";
export { OnboardingOverlay, resetOnboarding } from "./components/layout/OnboardingOverlay";

// Phase 4 components
export { useKeyboardShortcuts, KeyboardShortcutsHelp } from "./components/KeyboardShortcuts";
export type { ShortcutConfig } from "./components/KeyboardShortcuts";
export { CommandPalette } from "./components/CommandPalette";
export { vi, t } from "./i18n/vi";
export type { TranslationKey } from "./i18n/vi";

// Phase 4 hooks
export { useAuth } from "./hooks/useAuth";
export { useRealtimeSubscriptions } from "./hooks/useRealtime";
export type { UseRealtimeOptions } from "./hooks/useRealtime";
export { useNotifications } from "./hooks/useNotifications";
export { useBrandVoice } from "./hooks/useBrandVoice";
export type { UseBrandVoiceOptions, UseBrandVoiceReturn } from "./hooks/useBrandVoice";
export { useOnboarding } from "./hooks/useOnboarding";
export type { UseOnboardingReturn } from "./hooks/useOnboarding";
export { useTheme } from "./hooks/useTheme";
export type { ThemeMode, UseThemeReturn } from "./hooks/useTheme";
