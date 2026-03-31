/**
 * GEM Content Control Center — Script Types
 *
 * Types for script generation, editing, compliance checking,
 * and brand voice validation. Covers the full scripting pipeline
 * from generation parameters through to final approved content.
 */

import type {
  ContentType,
  Track,
  Pillar,
  PersonaType,
  WritingMode,
  ScriptStatus,
  Severity,
  Json,
} from './common.types';

// ═══════════════════════════════════════════════════════════
// SCRIPT STRUCTURE
// ═══════════════════════════════════════════════════════════

/** A fully hydrated script with all relations */
export interface Script {
  readonly id: string;
  readonly title: string;
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly persona: PersonaType;
  readonly writing_mode: WritingMode;
  readonly status: ScriptStatus;
  readonly body: string;
  readonly sections: readonly ScriptSection[];
  readonly emotional_arc: EmotionalArc;
  readonly word_count: number;
  readonly estimated_duration_seconds: number;
  readonly hook: string;
  readonly cta: string;
  readonly tags: readonly string[];
  readonly compliance_result?: ComplianceResult;
  readonly brand_voice_result?: BrandVoiceResult;
  readonly version: number;
  readonly parent_script_id?: string;
  readonly notes?: string;
  readonly metadata: Record<string, Json>;
  readonly created_by: string;
  readonly updated_by?: string;
  readonly approved_by?: string;
  readonly approved_at?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** A discrete section within a script */
export interface ScriptSection {
  readonly id: string;
  readonly label: string;
  readonly type: ScriptSectionType;
  readonly content: string;
  readonly order: number;
  readonly duration_seconds?: number;
  readonly speaker_notes?: string;
  readonly visual_cues?: string;
  readonly transition?: string;
}

/** Section type within a script structure */
export type ScriptSectionType =
  | 'hook'
  | 'intro'
  | 'body'
  | 'story'
  | 'teaching'
  | 'example'
  | 'transition'
  | 'cta'
  | 'outro'
  | 'b_roll_note';

// ═══════════════════════════════════════════════════════════
// EMOTIONAL ARC
// ═══════════════════════════════════════════════════════════

/** Emotional journey mapping for a script */
export interface EmotionalArc {
  readonly overall_tone: string;
  readonly energy_level: EnergyLevel;
  readonly beats: readonly EmotionalBeat[];
  readonly peak_moment?: string;
  readonly resolution?: string;
}

/** Energy level classification */
export type EnergyLevel = 'low' | 'medium' | 'high' | 'intense';

/** A single emotional beat in the arc */
export interface EmotionalBeat {
  readonly timestamp_label: string;
  readonly emotion: string;
  readonly intensity: number; // 0-100
  readonly description: string;
  readonly section_id?: string;
}

// ═══════════════════════════════════════════════════════════
// SCRIPT GENERATION
// ═══════════════════════════════════════════════════════════

/** Parameters for generating a new script via AI */
export interface ScriptGenerationParams {
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly persona: PersonaType;
  readonly writing_mode: WritingMode;
  readonly topic: string;
  readonly target_duration_seconds: number;
  readonly key_points?: readonly string[];
  readonly tone_keywords?: readonly string[];
  readonly audience_segment?: string;
  readonly reference_script_ids?: readonly string[];
  readonly avoid_topics?: readonly string[];
  readonly include_cta: boolean;
  readonly cta_type?: CtaType;
  readonly language?: 'en' | 'vi';
  readonly custom_instructions?: string;
  readonly temperature?: number;
  readonly max_tokens?: number;
}

/** Call-to-action types */
export type CtaType =
  | 'subscribe'
  | 'comment'
  | 'share'
  | 'link_click'
  | 'product'
  | 'community'
  | 'none';

/** Result of AI script generation */
export interface GeneratedScript {
  readonly script: ParsedScript;
  readonly generation_id: string;
  readonly model_used: string;
  readonly token_count: TokenCount;
  readonly generation_time_ms: number;
  readonly confidence_score: number;
  readonly suggestions: readonly string[];
}

/** Token usage from generation */
export interface TokenCount {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/** Parsed output from AI generation before saving */
export interface ParsedScript {
  readonly title: string;
  readonly hook: string;
  readonly sections: readonly ScriptSection[];
  readonly cta: string;
  readonly emotional_arc: EmotionalArc;
  readonly word_count: number;
  readonly estimated_duration_seconds: number;
  readonly tags: readonly string[];
  readonly summary: string;
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE & BRAND VOICE
// ═══════════════════════════════════════════════════════════

/** Result of compliance checking on a script */
export interface ComplianceResult {
  readonly passed: boolean;
  readonly checked_at: string;
  readonly violations: readonly Violation[];
  readonly warnings: readonly Violation[];
  readonly score: number; // 0-100
  readonly categories_checked: readonly ComplianceCategory[];
}

/** A single compliance or brand voice violation */
export interface Violation {
  readonly id: string;
  readonly rule_id: string;
  readonly rule_name: string;
  readonly severity: Severity;
  readonly category: ComplianceCategory;
  readonly message: string;
  readonly suggestion: string;
  readonly location?: ViolationLocation;
  readonly auto_fixable: boolean;
  readonly fixed?: boolean;
}

/** Location of a violation within the script text */
export interface ViolationLocation {
  readonly section_id?: string;
  readonly line_start: number;
  readonly line_end: number;
  readonly char_start: number;
  readonly char_end: number;
  readonly excerpt: string;
}

/** Categories of compliance rules */
export type ComplianceCategory =
  | 'financial_disclaimer'
  | 'health_claims'
  | 'income_claims'
  | 'copyright'
  | 'platform_policy'
  | 'brand_guidelines'
  | 'sensitivity'
  | 'legal';

/** Result of brand voice analysis */
export interface BrandVoiceResult {
  readonly passed: boolean;
  readonly checked_at: string;
  readonly overall_score: number; // 0-100
  readonly persona_alignment: number; // 0-100
  readonly tone_consistency: number; // 0-100
  readonly vocabulary_match: number; // 0-100
  readonly violations: readonly Violation[];
  readonly recommendations: readonly string[];
  readonly detected_persona?: PersonaType;
  readonly detected_writing_mode?: WritingMode;
}

// ═══════════════════════════════════════════════════════════
// SCRIPT VERSIONING & DIFF
// ═══════════════════════════════════════════════════════════

/** A diff between two script versions */
export interface ScriptDiff {
  readonly from_version: number;
  readonly to_version: number;
  readonly changes: readonly ScriptChange[];
  readonly summary: string;
}

/** A single change within a script diff */
export interface ScriptChange {
  readonly field: string;
  readonly type: 'added' | 'removed' | 'modified';
  readonly old_value?: string;
  readonly new_value?: string;
  readonly section_id?: string;
}

// ═══════════════════════════════════════════════════════════
// TITLE GENERATION
// ═══════════════════════════════════════════════════════════

/** Parameters for generating title variants */
export interface TitleGenerationParams {
  readonly script_id?: string;
  readonly topic: string;
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly persona: PersonaType;
  readonly writing_mode: WritingMode;
  readonly count: number;
  readonly max_length?: number;
  readonly style_hints?: readonly string[];
  readonly avoid_words?: readonly string[];
}

/** A generated or manually created title variant */
export interface TitleVariant {
  readonly id: string;
  readonly script_id?: string;
  readonly title_text: string;
  readonly click_score?: number;
  readonly seo_score?: number;
  readonly is_selected: boolean;
  readonly source: 'ai_generated' | 'manual' | 'ab_test';
  readonly metadata: Record<string, Json>;
  readonly created_at: string;
}
