import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { ChevronRight, GripVertical } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "../lib/utils";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
  action?: ReactNode;
  dragHandleListeners?: Record<string, any>;
  dragHandleAttributes?: Record<string, any>;
  onLabelChange?: (newLabel: string) => void;
}

export function SidebarSection({ label, children, action, dragHandleListeners, dragHandleAttributes, onLabelChange }: SidebarSectionProps) {
  const [open, setOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(label);
  }, [label, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() !== "" && editValue !== label && onLabelChange) {
      onLabelChange(editValue);
    } else {
      setEditValue(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditValue(label);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group/section relative">
        <div 
          className="flex items-center px-3 py-1.5 cursor-pointer group/row"
          onClick={() => setOpen(!open)}
        >
          {dragHandleListeners && (
            <div
              {...dragHandleAttributes}
              {...dragHandleListeners}
              className="absolute -left-1 opacity-0 group-hover/section:opacity-100 cursor-grab active:cursor-grabbing z-20 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="size-3 text-muted-foreground" />
            </div>
          )}
          <button className="flex items-center justify-center p-0.5 -ml-0.5 mr-0.5 rounded hover:bg-muted/50 text-muted-foreground/60 transition-colors">
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform opacity-0 group-hover/section:opacity-100 group-hover/row:opacity-100",
                open && "rotate-90"
              )}
            />
          </button>
          
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-medium uppercase tracking-widest font-mono text-foreground bg-accent border border-border rounded px-1 flex-1 min-w-0 outline-none focus:ring-1 focus:ring-ring h-4"
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60 flex-1 min-w-0 hover:text-foreground transition-colors select-none"
              title="Double click to rename"
            >
              {label}
            </span>
          )}
          {action && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              {action}
            </div>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 mt-0.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
