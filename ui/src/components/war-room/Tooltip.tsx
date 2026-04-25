/**
 * Tooltip — lightweight CSS-only tooltip wrapper.
 * Avoids @radix-ui/react-tooltip dep (Paperclip has had Radix Select/Dialog crashes — keep surface minimal).
 * Uses .wr-tooltip-trigger / .wr-tooltip-content classes from war-room.css.
 */
import type { ReactNode } from "react";

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  /** When true, render a span. Default: span. Use "inline" element when nested in interactive parents. */
  as?: "span" | "div";
}

export function Tooltip({ label, children, className = "", as = "span" }: TooltipProps) {
  const Tag = as;
  return (
    <Tag className={`wr-tooltip-trigger ${className}`}>
      {children}
      <span className="wr-tooltip-content">{label}</span>
    </Tag>
  );
}
