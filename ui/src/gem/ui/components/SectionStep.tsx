'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface SectionStepProps {
  stepNumber: number;
  label: string;
  color: 'gold' | 'purple' | 'emerald' | 'blue';
  children: React.ReactNode;
  isActive?: boolean;
  isCompleted?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const colorClasses: Record<SectionStepProps['color'], {
  section: string;
  circle: string;
  circleText: string;
  activeBorder: string;
}> = {
  gold: {
    section: 'gold',
    circle: 'bg-gold/20 border-gold/40',
    circleText: 'text-gold',
    activeBorder: 'shadow-[0_0_12px_rgba(212,168,83,0.3)]',
  },
  purple: {
    section: 'purple',
    circle: 'bg-purple/20 border-purple/40',
    circleText: 'text-purple',
    activeBorder: 'shadow-[0_0_12px_rgba(155,109,255,0.3)]',
  },
  emerald: {
    section: 'emerald',
    circle: 'bg-emerald/20 border-emerald/40',
    circleText: 'text-emerald',
    activeBorder: 'shadow-[0_0_12px_rgba(52,211,153,0.3)]',
  },
  blue: {
    section: 'blue',
    circle: 'bg-blue/20 border-blue/40',
    circleText: 'text-blue',
    activeBorder: 'shadow-[0_0_12px_rgba(91,156,245,0.3)]',
  },
};

export function SectionStep({
  stepNumber,
  label,
  color,
  children,
  isActive = false,
  isCompleted = false,
  collapsible = false,
  defaultExpanded = true,
}: SectionStepProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colors = colorClasses[color];

  const handleToggle = () => {
    if (collapsible) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        'ss',
        colors.section,
        isActive && cn('animate-gold-pulse', colors.activeBorder),
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3',
          collapsible && 'cursor-pointer select-none',
        )}
        onClick={handleToggle}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? expanded : undefined}
      >
        {/* Step circle */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-semibold',
            colors.circle,
            colors.circleText,
          )}
        >
          {isCompleted ? (
            <Check className="w-4 h-4" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>

        {/* Label */}
        <span className="text-md font-semibold text-txt flex-1">{label}</span>

        {/* Collapse toggle */}
        {collapsible && (
          <span className="text-txt-3">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="mt-3 pl-11">
          {children}
        </div>
      )}
    </div>
  );
}
