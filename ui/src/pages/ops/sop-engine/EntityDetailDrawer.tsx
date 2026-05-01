// EntityDetailDrawer — reusable side drawer for Registry Marketplace rows.
//
// Phase 9 (2026-04-10) — replaces the read-only display anti-pattern. Every
// row in every Registry Marketplace sub-tab now opens this drawer on click,
// satisfying R-1 (no read-only UI), R-3 (drawer pattern), R-4 (action column).
//
// Features:
// - 2-column metadata table for all row fields (handles JSON/array/long strings)
// - File preview via /api/registry/file?path=... if the row has disk_path
// - Inline edit for whitelisted fields (name, description, enabled, trust_level, notes)
// - Action buttons row at bottom (caller passes them via `actions` prop)
// - Auto-PATCH on save → invalidates row's queryKey

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2, FileText, Pencil, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { MarkdownBody } from '@/components/MarkdownBody';
import type { RowAction } from './RegistryMarketplaceTab';

const EDITABLE_FIELDS = ['name', 'display_name', 'description', 'enabled', 'trust_level', 'notes', 'category', 'priority', 'tags'] as const;

interface EntityDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  entity: any | null;
  entityPath: string; // PATCH target — e.g. '/api/registry/scripts'
  idField?: string;   // default 'id'
  queryKey: string;   // for invalidation
  title?: string;
  actions?: RowAction[]; // bottom action bar (Run / Test / Navigate / Open in Editor)
}

async function fetchFileContent(diskPath: string): Promise<{ content: string; size: number; truncated: boolean } | null> {
  const res = await fetch(`/api/registry/file?path=${encodeURIComponent(diskPath)}`);
  if (!res.ok) return null;
  return res.json();
}

async function patchEntity(path: string, body: any): Promise<any> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function isEditableField(field: string): boolean {
  return (EDITABLE_FIELDS as readonly string[]).includes(field);
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓ true' : '✗ false';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '[]';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function EntityDetailDrawer({
  open,
  onClose,
  entity,
  entityPath,
  idField = 'id',
  queryKey,
  title,
  actions,
}: EntityDetailDrawerProps) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);

  // Reset draft when entity changes
  useEffect(() => {
    if (entity) {
      const initial: Record<string, any> = {};
      for (const f of EDITABLE_FIELDS) {
        if (entity[f] !== undefined) initial[f] = entity[f];
      }
      setDraft(initial);
      setEditing(false);
    }
  }, [entity]);

  // Auto-fetch file content if entity has disk_path
  const fileQuery = useQuery({
    queryKey: ['registry-file', entity?.disk_path],
    queryFn: () => (entity?.disk_path ? fetchFileContent(entity.disk_path) : Promise.resolve(null)),
    enabled: !!(open && entity?.disk_path),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: () => patchEntity(`${entityPath}/${entity[idField]}`, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registry', queryKey] });
      pushToast({ title: '✅ Đã lưu', tone: 'success' });
      setEditing(false);
    },
    onError: (err: Error) => pushToast({ title: 'Lưu thất bại', body: err.message, tone: 'error' }),
  });

  if (!open || !entity) return null;

  const allFields = Object.keys(entity).filter((k) => k !== idField && k !== 'disk_path');
  const idValue = entity[idField];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground font-mono uppercase">{idValue}</div>
            <h3 className="text-base font-semibold text-foreground truncate">
              {title || entity.name || entity.display_name || idValue}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                title="Sửa"
              >
                <Pencil className="size-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              title="Đóng (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Metadata table */}
          <div className="p-4">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Metadata</div>
            <table className="w-full text-xs">
              <tbody>
                {allFields.map((field) => {
                  const value = entity[field];
                  const editable = editing && isEditableField(field);
                  return (
                    <tr key={field} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground font-mono text-[10px] align-top whitespace-nowrap">
                        {field}
                      </td>
                      <td className="py-1.5 text-foreground">
                        {editable ? (
                          typeof value === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={!!draft[field]}
                              onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })}
                            />
                          ) : (
                            <input
                              type="text"
                              value={draft[field] ?? ''}
                              onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                              className="w-full px-2 py-1 bg-background border border-input rounded text-xs text-foreground focus:border-ring outline-none"
                            />
                          )
                        ) : (
                          <span className="block whitespace-pre-wrap break-words">{formatValue(value)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {editing && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saveMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Lưu thay đổi
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    const initial: Record<string, any> = {};
                    for (const f of EDITABLE_FIELDS) {
                      if (entity[f] !== undefined) initial[f] = entity[f];
                    }
                    setDraft(initial);
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          {/* File preview if disk_path present */}
          {entity.disk_path && (
            <div className="px-4 pb-4">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <FileText className="size-3" />
                Nội dung file
                <span className="font-mono normal-case text-muted-foreground/70 truncate">
                  · {entity.disk_path}
                </span>
              </div>
              {fileQuery.isLoading && (
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Đang đọc file...
                </div>
              )}
              {fileQuery.error && (
                <div className="text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-3" /> Không đọc được file
                </div>
              )}
              {fileQuery.data && (
                <div className="border border-border rounded-md bg-muted/20 p-3 max-h-96 overflow-y-auto">
                  {fileQuery.data.truncated && (
                    <div className="text-[10px] text-amber-500 mb-2">
                      ⚠️ File lớn hơn 1MB — đã cắt ngắn
                    </div>
                  )}
                  {/\.(md|markdown)$/i.test(entity.disk_path) ? (
                    <div className="prose prose-sm max-w-none">
                      <MarkdownBody>{fileQuery.data.content}</MarkdownBody>
                    </div>
                  ) : (
                    <pre className="font-mono text-[10px] whitespace-pre-wrap text-foreground">
                      {fileQuery.data.content}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        {actions && actions.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
            {actions.filter((a) => !a.show || a.show(entity)).map((action, i) => {
              const Icon = action.icon;
              const cls =
                action.tone === 'destructive'
                  ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30'
                  : action.tone === 'primary'
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary'
                    : 'bg-muted hover:bg-accent text-foreground border-border';
              return (
                <button
                  key={i}
                  onClick={() => action.onClick(entity)}
                  className={`px-3 py-1.5 text-xs rounded border flex items-center gap-1.5 ${cls}`}
                >
                  <Icon className="size-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default EntityDetailDrawer;
