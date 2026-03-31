'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, SkipForward } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface OnboardingStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Step title */
  title: string;
  /** Step description body */
  body: string;
  /** Tooltip position relative to the target element */
  position: TooltipPosition;
}

interface OnboardingOverlayProps {
  /** Array of onboarding steps */
  steps: OnboardingStep[];
  /** Unique screen name for localStorage persistence */
  screenName: string;
  /** Callback when onboarding completes (all steps done or skipped) */
  onComplete?: () => void;
  /** Force show even if previously completed */
  forceShow?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'gem-cc-onboarding-';
const OVERLAY_Z = 9999;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 320;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStorageKey(screenName: string): string {
  return `${STORAGE_PREFIX}${screenName}`;
}

function isCompleted(screenName: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(getStorageKey(screenName)) === 'done';
  } catch {
    return false;
  }
}

function markCompleted(screenName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(screenName), 'done');
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

function getTargetRect(selector: string): TargetRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom + window.scrollY,
    right: rect.right + window.scrollX,
  };
}

interface TooltipPos {
  top: number;
  left: number;
}

function calculateTooltipPosition(
  targetRect: TargetRect,
  position: TooltipPosition,
): TooltipPos {
  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;

  switch (position) {
    case 'top':
      return {
        top: targetRect.top - TOOLTIP_GAP,
        left: centerX - TOOLTIP_WIDTH / 2,
      };
    case 'bottom':
      return {
        top: targetRect.bottom + TOOLTIP_GAP,
        left: centerX - TOOLTIP_WIDTH / 2,
      };
    case 'left':
      return {
        top: centerY,
        left: targetRect.left - TOOLTIP_WIDTH - TOOLTIP_GAP,
      };
    case 'right':
      return {
        top: centerY,
        left: targetRect.right + TOOLTIP_GAP,
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingOverlay({
  steps,
  screenName,
  onComplete,
  forceShow = false,
}: OnboardingOverlayProps): React.JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if we should show
  useEffect(() => {
    setMounted(true);
    if (forceShow || !isCompleted(screenName)) {
      // Slight delay to let the page render targets
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow, screenName]);

  // Update target rect when step changes
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (!visible || !currentStepData) return;

    const updateRect = (): void => {
      const rect = getTargetRect(currentStepData.target);
      setTargetRect(rect);
    };

    updateRect();

    // Recalculate on scroll/resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [visible, currentStep, steps]);

  // Scroll target into view
  useEffect(() => {
    if (!visible || !steps[currentStep]) return;

    const el = document.querySelector(steps[currentStep].target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [visible, currentStep, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Done
      markCompleted(screenName);
      setVisible(false);
      onComplete?.();
    }
  }, [currentStep, steps.length, screenName, onComplete]);

  const handleSkip = useCallback(() => {
    markCompleted(screenName);
    setVisible(false);
    onComplete?.();
  }, [screenName, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        handleNext();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleSkip, handleNext]);

  // Tooltip position
  const tooltipPos = useMemo(() => {
    if (!targetRect || !steps[currentStep]) return null;
    return calculateTooltipPosition(targetRect, steps[currentStep].position);
  }, [targetRect, currentStep, steps]);

  // Transform for arrow direction
  const arrowPosition = steps[currentStep]?.position ?? 'bottom';

  if (!mounted || !visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const spotlightPadding = 8;

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: OVERLAY_Z,
        pointerEvents: 'auto',
      }}
    >
      {/* Dark overlay with SVG cutout */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
      >
        <defs>
          <mask id="onboarding-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding - window.scrollX}
                y={targetRect.top - spotlightPadding - window.scrollY}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#onboarding-mask)"
        />
      </svg>

      {/* Spotlight border highlight */}
      {targetRect && (
        <div
          style={{
            position: 'absolute',
            top: targetRect.top - spotlightPadding - window.scrollY,
            left: targetRect.left - spotlightPadding - window.scrollX,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            borderRadius: 8,
            border: '2px solid rgba(212, 168, 67, 0.5)',
            boxShadow: '0 0 0 4px rgba(212, 168, 67, 0.15)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && step && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top:
              arrowPosition === 'top'
                ? (tooltipPos.top - window.scrollY)
                : arrowPosition === 'bottom'
                  ? (tooltipPos.top - window.scrollY)
                  : (tooltipPos.top - window.scrollY),
            left: tooltipPos.left - window.scrollX,
            width: TOOLTIP_WIDTH,
            zIndex: OVERLAY_Z + 1,
            pointerEvents: 'auto',
            transform:
              arrowPosition === 'top'
                ? 'translateY(-100%)'
                : arrowPosition === 'left'
                  ? 'translateY(-50%)'
                  : arrowPosition === 'right'
                    ? 'translateY(-50%)'
                    : 'none',
          }}
          className="animate-fade-in"
        >
          <div
            className="rounded-card border border-border-2 p-5 shadow-card-lg"
            style={{ background: '#13131d' }}
          >
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xxs text-txt-3 font-medium">
                {currentStep + 1}/{steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="p-1 rounded-sm text-txt-3 hover:text-txt hover:bg-bg-3/50 transition-all"
                aria-label="Bo qua huong dan"
              >
                <X size={14} />
              </button>
            </div>

            {/* Title */}
            <h4 className="font-heading text-base font-semibold text-txt mb-2">
              {step.title}
            </h4>

            {/* Body */}
            <p className="text-sm text-txt-2 leading-relaxed mb-4">
              {step.body}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="inline-flex items-center gap-1.5 text-xs text-txt-3 hover:text-txt transition-colors"
              >
                <SkipForward size={12} />
                Bo qua
              </button>

              <button
                onClick={handleNext}
                className="btn btn-p text-xs inline-flex items-center gap-1.5"
              >
                {isLastStep ? 'Hoan thanh' : 'Tiep theo'}
                {!isLastStep && <ChevronRight size={14} />}
              </button>
            </div>

            {/* Step dots */}
            {steps.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'bg-gold w-4'
                        : i < currentStep
                          ? 'bg-gold/40'
                          : 'bg-bg-4'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

// ---------------------------------------------------------------------------
// Helper export: reset onboarding for a screen
// ---------------------------------------------------------------------------

export function resetOnboarding(screenName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(screenName));
  } catch {
    // Silently fail
  }
}
