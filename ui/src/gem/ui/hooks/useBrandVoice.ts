'use client';

// ============================================================================
// useBrandVoice — Real-time Brand Voice Checking Hook
// GEM Content Control Center
//
// Debounced brand voice compliance checking on text change.
// Returns score, violations, checking state, and pass/fail status.
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { brandVoiceChecker } from '@gem/services';
import type { BrandVoiceCheckResult } from '@gem/services';
import type { ContentType } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseBrandVoiceOptions {
  /** Content type for rule application (default: 'latc') */
  contentType?: ContentType;
  /** Debounce delay in ms (default: 800) */
  debounceMs?: number;
  /** Minimum text length before checking (default: 50) */
  minLength?: number;
  /** Whether checking is enabled (default: true) */
  enabled?: boolean;
}

export interface UseBrandVoiceReturn {
  /** Brand voice compliance score (0-100) */
  score: number;
  /** List of violations found */
  violations: BrandVoiceCheckResult['violations'];
  /** Whether a check is currently running */
  isChecking: boolean;
  /** Whether the content passes compliance (no critical violations) */
  passed: boolean;
  /** Word count of last checked content */
  wordCount: number;
  /** Section count of last checked content */
  sectionCount: number;
  /** Manually trigger a check */
  checkNow: (text: string) => void;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Real-time brand voice checking with debounce.
 *
 * @example
 * ```tsx
 * const { score, violations, isChecking, passed } = useBrandVoice(content, {
 *   contentType: 'latc',
 *   debounceMs: 1000,
 * });
 * ```
 */
export function useBrandVoice(
  text: string,
  options: UseBrandVoiceOptions = {},
): UseBrandVoiceReturn {
  const {
    contentType = 'latc',
    debounceMs = 800,
    minLength = 50,
    enabled = true,
  } = options;

  const [score, setScore] = useState(100);
  const [violations, setViolations] = useState<BrandVoiceCheckResult['violations']>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [passed, setPassed] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // Run check
  // -----------------------------------------------------------------------

  const runCheck = useCallback(
    (content: string) => {
      if (content.length < minLength) {
        setScore(100);
        setViolations([]);
        setPassed(true);
        setWordCount(0);
        setSectionCount(0);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      // Brand voice checker is synchronous, but we wrap in setTimeout
      // to avoid blocking the main thread on large content
      setTimeout(() => {
        const result = brandVoiceChecker.check(content, contentType);
        setScore(result.score);
        setViolations(result.violations);
        setPassed(result.passed);
        setWordCount(result.wordCount);
        setSectionCount(result.sectionCount);
        setIsChecking(false);
      }, 0);
    },
    [contentType, minLength],
  );

  // -----------------------------------------------------------------------
  // Debounced check on text change
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      runCheck(text);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, debounceMs, enabled, runCheck]);

  // -----------------------------------------------------------------------
  // Manual check trigger
  // -----------------------------------------------------------------------

  const checkNow = useCallback(
    (content: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      runCheck(content);
    },
    [runCheck],
  );

  return {
    score,
    violations,
    isChecking,
    passed,
    wordCount,
    sectionCount,
    checkNow,
  };
}
