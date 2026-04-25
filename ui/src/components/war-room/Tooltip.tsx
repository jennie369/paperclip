/**
 * Tooltip — lightweight CSS-only tooltip wrapper.
 * Avoids @radix-ui/react-tooltip dep (Paperclip has had Radix Select/Dialog crashes — keep surface minimal).
 * Uses .wr-tooltip-trigger / .wr-tooltip-content[-bottom] classes from war-room.css.
 */
import type { ReactNode } from "react";

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  /** Render a span (default) or div — pick based on the surrounding markup. */
  as?: "span" | "div";
  /** Position the tooltip above ("top", default) or below ("bottom") the trigger.
   *  Use "bottom" when the trigger lives inside a sticky header / clipped container — a top-positioned
   *  tooltip would render outside the visible area and get cut off. */
  position?: "top" | "bottom";
}

export function Tooltip({ label, children, className = "", as = "span", position = "top" }: TooltipProps) {
  const Tag = as;
  const contentClass = position === "bottom" ? "wr-tooltip-content wr-tooltip-content-bottom" : "wr-tooltip-content";
  return (
    <Tag className={`wr-tooltip-trigger ${className}`}>
      {children}
      <span className={contentClass}>{label}</span>
    </Tag>
  );
}
