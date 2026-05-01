// RegistryCombobox — searchable single-select + multi-select dropdown
// backed by the Registry SSOT. Every dropdown in SopStepsEditor uses this.
//
// Features:
//   • Searchable (type to filter)
//   • Category grouping (optional)
//   • "+ Register in Marketplace" CTA when user wants to add a missing option
//   • Supports single-value and multi-value (tag list)
//   • Keyboard navigation
//   • Respects Paperclip theme

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Plus, Search } from 'lucide-react';
import type { DropdownOption } from '@/api/registry-options';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BaseProps {
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  onRegisterNew?: () => void;   // callback when user clicks "+ Register new"
  registerHint?: string;         // tooltip for the + button
  isLoading?: boolean;
}

interface SingleProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  multi?: false;
}

interface MultiProps extends BaseProps {
  value: string[];
  onChange: (v: string[]) => void;
  multi: true;
}

export function RegistryCombobox(props: SingleProps | MultiProps) {
  const { options, placeholder = 'Chọn...', disabled = false, onRegisterNew, registerHint, isLoading } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          o.value.toLowerCase().includes(search.toLowerCase()) ||
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.category || '').toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // Group by category
  const grouped: Record<string, DropdownOption[]> = {};
  for (const o of filtered) {
    const cat = o.category || '';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(o);
  }
  const categories = Object.keys(grouped).sort();

  const isSelected = (v: string) =>
    props.multi ? props.value.includes(v) : props.value === v;

  const handlePick = (v: string) => {
    if (props.multi) {
      if (props.value.includes(v)) {
        props.onChange(props.value.filter((x) => x !== v));
      } else {
        props.onChange([...props.value, v]);
      }
    } else {
      props.onChange(v);
      setOpen(false);
    }
  };

  const singleLabel = !props.multi
    ? options.find((o) => o.value === props.value)?.label || (props.value || '')
    : '';

  return (
    <div ref={rootRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none text-left text-xs disabled:opacity-50"
      >
        {props.multi ? (
          <div className="flex-1 flex flex-wrap gap-1">
            {props.value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              props.value.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]"
                  >
                    {opt?.label || v}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        (props.onChange as (v: string[]) => void)(
                          props.value.filter((x) => x !== v),
                        );
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>
        ) : (
          <span className={`flex-1 truncate ${!props.value ? 'text-muted-foreground' : ''}`}>
            {singleLabel || placeholder}
          </span>
        )}
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="flex items-center gap-2 p-2 border-b border-border">
            <Search className="size-3 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent outline-none text-xs text-foreground"
            />
            {onRegisterNew && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      onRegisterNew();
                      setOpen(false);
                    }}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                  >
                    <Plus className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {registerHint || 'Thêm option mới vào Registry Marketplace'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Đang tải...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">
                Không có option nào khớp.
                {onRegisterNew && (
                  <button
                    onClick={() => {
                      onRegisterNew();
                      setOpen(false);
                    }}
                    className="ml-1 text-primary hover:underline"
                  >
                    + Register mới?
                  </button>
                )}
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat}>
                  {cat && (
                    <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                      {cat}
                    </div>
                  )}
                  {grouped[cat].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handlePick(opt.value)}
                      className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors border-b border-border/50 last:border-b-0 ${
                        isSelected(opt.value) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {props.multi && (
                          <input
                            type="checkbox"
                            checked={isSelected(opt.value)}
                            readOnly
                            className="pointer-events-none"
                          />
                        )}
                        <span className="text-foreground font-medium">{opt.label}</span>
                      </div>
                      {opt.description && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                          {opt.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer with register CTA */}
          {onRegisterNew && filtered.length > 0 && (
            <div className="border-t border-border p-1.5">
              <button
                onClick={() => {
                  onRegisterNew();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-primary hover:bg-primary/10 rounded"
              >
                <Plus className="size-3" />
                Register option mới vào Marketplace
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
