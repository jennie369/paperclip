// Knowledge Library Tab — browse memory/ + gem-content-center/knowledge/ files.
//
// Left pane: root selector + folder tree
// Right pane: file preview with copy-path button
// Top: full-text filename search across all roots
//
// Reads via safe server endpoints (whitelist of roots, size limit, extension
// filter). No arbitrary filesystem access.

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/context/ToastContext';
import {
  FolderOpen,
  Folder,
  FileText,
  Search,
  Loader2,
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
  Home,
  Info,
  Database,
  BookOpen,
  Brain,
  Users,
  Wrench,
  ClipboardList,
  BarChart3,
  FileCode,
} from 'lucide-react';

interface KnowledgeRoot {
  id: string;
  label: string;
  path: string;
  category: string;
  exists: boolean;
  fileCount: number;
}

interface KnowledgeEntry {
  name: string;
  relative_path: string;
  type: 'file' | 'dir';
  size: number;
  modified: string;
  extension?: string | null;
}

interface KnowledgeFile {
  name: string;
  full_path: string;
  relative_path: string;
  size: number;
  modified: string;
  extension: string;
  content: string;
}

interface SearchMatch {
  rootId: string;
  rootLabel: string;
  name: string;
  relative_path: string;
  match_type: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  memory: Brain,
  sops: ClipboardList,
  agents: Users,
  reports: BarChart3,
  patterns: Database,
  content: BookOpen,
  skills: Wrench,
};

function Tip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

async function fetchRoots(): Promise<KnowledgeRoot[]> {
  const res = await fetch('/api/ops/sop-engine/knowledge/roots');
  if (!res.ok) return [];
  return res.json();
}

async function fetchList(rootId: string, path: string): Promise<{ entries: KnowledgeEntry[]; current_path: string }> {
  const res = await fetch(
    `/api/ops/sop-engine/knowledge/list?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) return { entries: [], current_path: path };
  return res.json();
}

async function fetchFile(rootId: string, path: string): Promise<KnowledgeFile | null> {
  const res = await fetch(
    `/api/ops/sop-engine/knowledge/file?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không đọc được file');
  }
  return res.json();
}

async function searchFiles(q: string): Promise<SearchMatch[]> {
  if (!q || q.length < 2) return [];
  const res = await fetch(`/api/ops/sop-engine/knowledge/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.matches || [];
}

export default function KnowledgeLibraryTab() {
  const { pushToast } = useToast();
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ rootId: string; path: string } | null>(null);
  const [search, setSearch] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);

  const rootsQuery = useQuery({
    queryKey: ['knowledge', 'roots'],
    queryFn: fetchRoots,
  });

  const listQuery = useQuery({
    queryKey: ['knowledge', 'list', selectedRoot, currentPath],
    queryFn: () => (selectedRoot ? fetchList(selectedRoot, currentPath) : { entries: [], current_path: '' }),
    enabled: !!selectedRoot,
  });

  const fileQuery = useQuery({
    queryKey: ['knowledge', 'file', selectedFile?.rootId, selectedFile?.path],
    queryFn: async () => {
      if (!selectedFile) return null;
      setPreviewError(null);
      try {
        return await fetchFile(selectedFile.rootId, selectedFile.path);
      } catch (err: any) {
        setPreviewError(err.message);
        return null;
      }
    },
    enabled: !!selectedFile,
  });

  const searchQuery = useQuery({
    queryKey: ['knowledge', 'search', search],
    queryFn: () => searchFiles(search),
    enabled: search.length >= 2,
    staleTime: 10_000,
  });

  const roots = rootsQuery.data || [];
  const list = listQuery.data || { entries: [], current_path: '' };
  const file = fileQuery.data;
  const searchResults = searchQuery.data || [];

  const pathSegments = useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
  }, [currentPath]);

  const handleRootClick = (rootId: string) => {
    setSelectedRoot(rootId);
    setCurrentPath('');
    setSelectedFile(null);
  };

  const handleEntryClick = (entry: KnowledgeEntry) => {
    if (entry.type === 'dir') {
      setCurrentPath(entry.relative_path);
    } else {
      if (selectedRoot) {
        setSelectedFile({ rootId: selectedRoot, path: entry.relative_path });
      }
    }
  };

  const handleSearchResultClick = (match: SearchMatch) => {
    setSelectedRoot(match.rootId);
    setSelectedFile({ rootId: match.rootId, path: match.relative_path });
    setSearch('');
  };

  const handleNavUp = () => {
    if (!pathSegments.length) return;
    const parent = pathSegments.slice(0, -1).join('/');
    setCurrentPath(parent);
  };

  const handleNavSegment = (idx: number) => {
    const target = pathSegments.slice(0, idx + 1).join('/');
    setCurrentPath(target);
  };

  const handleCopyPath = async (fullPath: string) => {
    try {
      await navigator.clipboard.writeText(fullPath);
      pushToast({ title: '📋 Đã copy đường dẫn', body: fullPath, tone: 'success' });
    } catch {
      pushToast({ title: 'Copy thất bại', tone: 'error' });
    }
  };

  const handleCopyContent = async () => {
    if (!file?.content) return;
    try {
      await navigator.clipboard.writeText(file.content);
      pushToast({ title: '📋 Đã copy nội dung file', body: file.name, tone: 'success' });
    } catch {
      pushToast({ title: 'Copy thất bại', tone: 'error' });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 space-y-4">
        {/* Header + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            📚 Knowledge Library
            <Tip text="Browse memory/ + Content Center knowledge files. Preview markdown inline, copy path, drop vào Workflow Step Inputs/Outputs trong tương lai.">
              <Info className="size-3 text-muted-foreground" />
            </Tip>
          </h2>
          <div className="relative flex-1 max-w-md ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename trong tất cả roots..."
              className="w-full pl-7 pr-3 py-1.5 bg-background border border-input rounded text-xs text-foreground focus:border-ring outline-none"
            />
            {search.length >= 2 && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded shadow-xl z-10 max-h-64 overflow-y-auto">
                {searchResults.map((m) => (
                  <button
                    key={`${m.rootId}/${m.relative_path}`}
                    onClick={() => handleSearchResultClick(m)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-3 text-muted-foreground" />
                      <span className="text-foreground truncate">{m.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {m.rootLabel} · {m.relative_path}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main 2-pane layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Left pane: roots + file tree */}
          <div className="col-span-4 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            {/* Root selector */}
            <div className="border-b border-border p-2 max-h-56 overflow-y-auto">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Knowledge Roots
              </div>
              {rootsQuery.isLoading ? (
                <Loader2 className="size-3 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-0.5">
                  {roots.map((root) => {
                    const Icon = CATEGORY_ICONS[root.category] || Folder;
                    const isActive = selectedRoot === root.id;
                    return (
                      <Tip key={root.id} text={`${root.path} · ${root.fileCount} files${root.exists ? '' : ' (folder không tồn tại)'}`}>
                        <button
                          onClick={() => handleRootClick(root.id)}
                          disabled={!root.exists}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                            isActive
                              ? 'bg-primary/20 text-primary'
                              : root.exists
                                ? 'text-foreground hover:bg-accent'
                                : 'text-muted-foreground opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <Icon className="size-3.5 shrink-0" />
                          <span className="flex-1 truncate text-left">{root.label}</span>
                          <span className="text-[9px] text-muted-foreground">{root.fileCount}</span>
                        </button>
                      </Tip>
                    );
                  })}
                </div>
              )}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto">
              {!selectedRoot ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  👈 Chọn 1 root để browse files
                </div>
              ) : listQuery.isLoading ? (
                <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Đang tải...
                </div>
              ) : (
                <>
                  {/* Breadcrumb */}
                  <div className="px-2 py-1.5 border-b border-border text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    <button onClick={() => setCurrentPath('')} className="hover:text-foreground flex items-center gap-0.5">
                      <Home className="size-2.5" /> root
                    </button>
                    {pathSegments.map((seg, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <ChevronRight className="size-2.5" />
                        <button onClick={() => handleNavSegment(i)} className="hover:text-foreground">
                          {seg}
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Entries */}
                  <div className="p-1">
                    {currentPath && (
                      <button
                        onClick={handleNavUp}
                        className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:bg-accent rounded flex items-center gap-1.5"
                      >
                        ⬆️ <span>..</span>
                      </button>
                    )}
                    {list.entries.length === 0 ? (
                      <div className="p-3 text-center text-[10px] text-muted-foreground">Folder rỗng</div>
                    ) : (
                      list.entries.map((e) => {
                        const isSelected = selectedFile?.path === e.relative_path;
                        return (
                          <button
                            key={e.relative_path}
                            onClick={() => handleEntryClick(e)}
                            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center gap-1.5 ${
                              isSelected ? 'bg-primary/20 text-primary' : 'text-foreground hover:bg-accent'
                            }`}
                          >
                            {e.type === 'dir' ? (
                              <Folder className="size-3 text-amber-500" />
                            ) : (
                              <FileText className="size-3 text-muted-foreground" />
                            )}
                            <span className="flex-1 truncate">{e.name}</span>
                            {e.type === 'file' && (
                              <span className="text-[9px] text-muted-foreground">{formatSize(e.size)}</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right pane: file preview */}
          <div className="col-span-8 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            {!selectedFile ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                <div className="text-center">
                  <FileText className="size-8 mx-auto mb-2" />
                  <div>Click file từ tree bên trái để preview nội dung</div>
                </div>
              </div>
            ) : fileQuery.isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : previewError ? (
              <div className="flex-1 flex items-center justify-center text-xs text-destructive p-4 text-center">
                {previewError}
              </div>
            ) : file ? (
              <>
                {/* File header */}
                <div className="border-b border-border p-3 flex items-start gap-2">
                  <FileCode className="size-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{file.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                      {file.full_path}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatSize(file.size)} · {file.extension} · modified{' '}
                      {new Date(file.modified).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tip text="Copy đường dẫn full path">
                      <button
                        onClick={() => handleCopyPath(file.full_path)}
                        className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </Tip>
                    <Tip text="Copy toàn bộ nội dung file vào clipboard">
                      <button
                        onClick={handleCopyContent}
                        className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded"
                      >
                        <Download className="size-3.5" />
                      </button>
                    </Tip>
                  </div>
                </div>

                {/* File content preview */}
                <div className="flex-1 overflow-auto">
                  <pre className="p-4 text-[11px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
                    {file.content}
                  </pre>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
