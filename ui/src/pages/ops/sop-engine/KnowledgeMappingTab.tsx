// Knowledge Mapping Tab — attach memory_files to each SOP.
//
// gem_sops already has a `knowledge_files TEXT[]` column. This UI lets Jennie
// pick files from the memory_files registry and save them per-SOP. Mirrors the
// HTML mockup's per-SOP knowledge attachment pattern.
//
// Left pane: searchable list of 208 SOPs with attached count badge.
// Right pane: detail for the selected SOP with chips + "+ Attach" picker.

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { Search, Plus, X, FileText, Save } from 'lucide-react';

interface Sop {
  sop_id: string;
  name: string;
  domain: string | null;
  description: string | null;
  knowledge_files: string[] | null;
  status: string | null;
}

// Search result from /api/ops/sop-engine/knowledge/search (live disk walk).
// This replaces the stale memory_files registry table — the picker now hits
// the filesystem directly so every file in memory/, gem-content-center/,
// etc. is attachable (including design/framework/.txt files that the DB
// registry never indexed).
interface KnowledgeSearchResult {
  rootId: string;
  rootLabel: string;
  name: string;
  relative_path: string;
  full_path: string;
  extension: string;
  match_type: string;
}

export function KnowledgeMappingTab() {
  const { pushToast } = useToast();
  const [sops, setSops] = useState<Sop[]>([]);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerResults, setPickerResults] = useState<KnowledgeSearchResult[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [draftFiles, setDraftFiles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load SOPs on mount — memory files are searched on-demand via
  // /api/ops/sop-engine/knowledge/search (live disk walk, no stale cache).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sopsRes = await fetch('/api/ops/sop-engine/sops?limit=500');
        if (cancelled) return;
        const sopsJson = await sopsRes.json();
        setSops(Array.isArray(sopsJson) ? sopsJson : sopsJson?.sops || []);
      } catch (err: any) {
        pushToast({ title: 'Lỗi load SOPs', body: err.message, tone: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  // Debounced live disk search — hits /knowledge/search endpoint which walks
  // KNOWLEDGE_ROOTS (memory/, gem-content-center/, skills-store/, ...) and
  // returns all files whose filename contains the query. No DB lookup.
  useEffect(() => {
    if (!pickerOpen) return;
    const q = pickerSearch.trim();
    if (q.length < 2) {
      setPickerResults([]);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ops/sop-engine/knowledge/search?q=${encodeURIComponent(q)}`,
        );
        if (cancelled) return;
        const data = await res.json();
        setPickerResults(Array.isArray(data?.matches) ? data.matches : []);
      } catch {
        if (!cancelled) setPickerResults([]);
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pickerOpen, pickerSearch]);

  const selectedSop = useMemo(
    () => sops.find((s) => s.sop_id === selectedSopId) || null,
    [sops, selectedSopId],
  );

  // When selected SOP changes, reset draft to current attached files
  useEffect(() => {
    setDraftFiles(selectedSop?.knowledge_files || []);
  }, [selectedSopId, selectedSop]);

  const filteredSops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sops;
    return sops.filter(
      (s) =>
        s.sop_id.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.domain?.toLowerCase().includes(q),
    );
  }, [sops, search]);

  // Filter out already-attached files from search results
  const availablePickerResults = useMemo(
    () => pickerResults.filter((r) => !draftFiles.includes(r.full_path)),
    [pickerResults, draftFiles],
  );

  const attachFile = (filePath: string) => {
    setDraftFiles((prev) => [...prev, filePath]);
  };

  const detachFile = (filePath: string) => {
    setDraftFiles((prev) => prev.filter((f) => f !== filePath));
  };

  const saveMapping = async () => {
    if (!selectedSop) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ops/sop-engine/sops/${selectedSop.sop_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_files: draftFiles }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      // Update local state
      setSops((prev) =>
        prev.map((s) =>
          s.sop_id === selectedSop.sop_id ? { ...s, knowledge_files: draftFiles } : s,
        ),
      );
      pushToast({
        title: '✅ Đã lưu',
        body: `${selectedSop.sop_id}: ${draftFiles.length} knowledge files`,
        tone: 'success',
      });
    } catch (err: any) {
      pushToast({ title: 'Lưu thất bại', body: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const current = selectedSop?.knowledge_files || [];
    if (current.length !== draftFiles.length) return true;
    return !current.every((f) => draftFiles.includes(f));
  }, [selectedSop, draftFiles]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Đang tải {sops.length} SOPs và memory files...
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background text-foreground">
      {/* LEFT: SOP list */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Tìm SOP (${sops.length})...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSops.map((sop) => {
            const count = sop.knowledge_files?.length || 0;
            const isSelected = sop.sop_id === selectedSopId;
            return (
              <button
                key={sop.sop_id}
                onClick={() => setSelectedSopId(sop.sop_id)}
                className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/40 transition-colors ${
                  isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{sop.sop_id}</div>
                    <div className="text-sm font-medium truncate">{sop.name || '—'}</div>
                    {sop.domain && (
                      <div className="text-xs text-muted-foreground truncate">{sop.domain}</div>
                    )}
                  </div>
                  {count > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                      {count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filteredSops.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">Không tìm thấy</div>
          )}
        </div>
      </div>

      {/* RIGHT: Detail + editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSop ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Chọn một SOP bên trái để map knowledge files
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    {selectedSop.sop_id}
                    {selectedSop.domain && (
                      <span className="px-1.5 py-0.5 bg-muted/50 rounded">{selectedSop.domain}</span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold mt-1">{selectedSop.name || selectedSop.sop_id}</h2>
                  {selectedSop.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {selectedSop.description}
                    </p>
                  )}
                </div>
                {hasChanges && (
                  <button
                    onClick={saveMapping}
                    disabled={saving}
                    className="shrink-0 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">
                    Knowledge files đã gắn ({draftFiles.length})
                  </h3>
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md flex items-center gap-1"
                  >
                    <Plus className="size-3" />
                    Thêm file
                  </button>
                </div>
                {draftFiles.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic border border-dashed border-border rounded-md p-4 text-center">
                    Chưa có knowledge file nào gắn với SOP này
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftFiles.map((filePath) => {
                      const displayName = filePath.split(/[\\/]/).pop() || filePath;
                      const ext = displayName.match(/\.(\w+)$/)?.[1]?.toUpperCase() || '';
                      return (
                        <div
                          key={filePath}
                          className="flex items-start gap-2 p-2 bg-muted/30 border border-border rounded-md"
                        >
                          <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{displayName}</div>
                            {ext && (
                              <div className="text-xs text-muted-foreground truncate">{ext}</div>
                            )}
                            <div className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
                              {filePath}
                            </div>
                          </div>
                          <button
                            onClick={() => detachFile(filePath)}
                            className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded"
                            title="Gỡ file này"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Picker modal */}
            {pickerOpen && (
              <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setPickerOpen(false)}
              >
                <div
                  className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Chọn memory files để gắn</h3>
                      <button
                        onClick={() => setPickerOpen(false)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Gõ ≥2 ký tự để tìm file trên disk (memory/, gem-content-center/, skills-store/...)"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1.5">
                      Live disk search — không dùng DB cache. Mọi file trên disk (.md, .txt, .json, .yml, design framework, content pipeline...) đều tìm được.
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {pickerLoading && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Đang tìm trên disk...
                      </div>
                    )}
                    {!pickerLoading && pickerSearch.trim().length < 2 && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Nhập từ khoá (≥2 ký tự) để search
                      </div>
                    )}
                    {!pickerLoading && pickerSearch.trim().length >= 2 && availablePickerResults.map((file) => (
                      <button
                        key={file.full_path}
                        onClick={() => {
                          attachFile(file.full_path);
                          setPickerSearch('');
                        }}
                        className="w-full text-left p-2 hover:bg-muted/40 rounded-md border-b border-border/30 flex items-start gap-2"
                      >
                        <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {file.rootLabel} · {file.extension || 'file'}
                          </div>
                          <div className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
                            {file.relative_path}
                          </div>
                        </div>
                      </button>
                    ))}
                    {!pickerLoading && pickerSearch.trim().length >= 2 && availablePickerResults.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Không tìm thấy file nào khớp "{pickerSearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
