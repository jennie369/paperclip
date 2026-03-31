'use client';

// ============================================================================
// useOnboarding — Per-screen Onboarding Hook
// GEM Content Control Center
//
// Manages per-screen onboarding step progression.
// Returns steps, current step, navigation actions, and replay.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { onboardingService, useAppStore } from '@gem/services';
import type { OnboardingStep, ScreenId } from '@gem/services';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseOnboardingReturn {
  /** All steps for this screen */
  steps: OnboardingStep[];
  /** Index of the current step (0-based) */
  currentStep: number;
  /** Whether onboarding is currently active */
  isActive: boolean;
  /** Advance to the next step */
  next: () => void;
  /** Skip/dismiss onboarding for this screen */
  skip: () => Promise<void>;
  /** Complete onboarding for this screen */
  done: () => Promise<void>;
  /** Replay onboarding from step 0 */
  replay: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Per-screen onboarding progression hook.
 *
 * @example
 * ```tsx
 * const { steps, currentStep, isActive, next, skip, done, replay } =
 *   useOnboarding('dashboard');
 * ```
 */
export function useOnboarding(screenId: ScreenId): UseOnboardingReturn {
  const { user } = useAppStore();
  const [steps] = useState<OnboardingStep[]>(() =>
    onboardingService.getSteps(screenId),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // -----------------------------------------------------------------------
  // Check if onboarding was already completed
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!user?.id || steps.length === 0) {
      setIsActive(false);
      return;
    }

    let cancelled = false;

    onboardingService.isCompleted(user.id, screenId).then((completed) => {
      if (cancelled) return;
      setIsActive(!completed);
      setCurrentStep(0);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, screenId, steps.length]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const nextStep = prev + 1;
      if (nextStep >= steps.length) {
        // Auto-complete when past last step
        if (user?.id) {
          onboardingService.markCompleted(user.id, screenId);
        }
        setIsActive(false);
        return prev;
      }
      return nextStep;
    });
  }, [steps.length, user?.id, screenId]);

  const skip = useCallback(async () => {
    setIsActive(false);
    if (user?.id) {
      await onboardingService.markCompleted(user.id, screenId);
    }
  }, [user?.id, screenId]);

  const done = useCallback(async () => {
    setIsActive(false);
    if (user?.id) {
      await onboardingService.markCompleted(user.id, screenId);
    }
  }, [user?.id, screenId]);

  const replay = useCallback(async () => {
    if (user?.id) {
      await onboardingService.resetScreen(user.id, screenId);
    }
    setCurrentStep(0);
    setIsActive(true);
  }, [user?.id, screenId]);

  return {
    steps,
    currentStep,
    isActive,
    next,
    skip,
    done,
    replay,
  };
}
