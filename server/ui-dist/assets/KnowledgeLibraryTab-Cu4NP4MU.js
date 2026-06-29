import { as as useToast, r as reactExports, ag as useQuery, j as jsxRuntimeExports, ah as TooltipProvider, W as Info, y as Search, F as FileText, k as LoaderCircle, at as Wrench, B as BookOpen, au as Database, q as ChartColumn, U as Users, av as ClipboardList, aw as Brain, ax as Folder, ay as House, K as ChevronRight, az as FileCode, ac as Copy, a2 as Download, ap as Tooltip, aq as TooltipTrigger, ar as TooltipContent } from './index-DE6uMbR4.js';

const CATEGORY_ICONS = {
  memory: Brain,
  sops: ClipboardList,
  agents: Users,
  reports: ChartColumn,
  patterns: Database,
  content: BookOpen,
  skills: Wrench
};
function Tip({ children, text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { className: "max-w-xs", children: text })
  ] });
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}
async function fetchRoots() {
  const res = await fetch("/api/ops/sop-engine/knowledge/roots");
  if (!res.ok) return [];
  return res.json();
}
async function fetchList(rootId, path) {
  const res = await fetch(
    `/api/ops/sop-engine/knowledge/list?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(path)}`
  );
  if (!res.ok) return { entries: [], current_path: path };
  return res.json();
}
async function fetchFile(rootId, path) {
  const res = await fetch(
    `/api/ops/sop-engine/knowledge/file?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(path)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Không đọc được file");
  }
  return res.json();
}
async function searchFiles(q) {
  if (!q || q.length < 2) return [];
  const res = await fetch(`/api/ops/sop-engine/knowledge/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.matches || [];
}
function KnowledgeLibraryTab() {
  const { pushToast } = useToast();
  const [selectedRoot, setSelectedRoot] = reactExports.useState(null);
  const [currentPath, setCurrentPath] = reactExports.useState("");
  const [selectedFile, setSelectedFile] = reactExports.useState(null);
  const [search, setSearch] = reactExports.useState("");
  const [previewError, setPreviewError] = reactExports.useState(null);
  const rootsQuery = useQuery({
    queryKey: ["knowledge", "roots"],
    queryFn: fetchRoots
  });
  const listQuery = useQuery({
    queryKey: ["knowledge", "list", selectedRoot, currentPath],
    queryFn: () => selectedRoot ? fetchList(selectedRoot, currentPath) : { entries: [], current_path: "" },
    enabled: !!selectedRoot
  });
  const fileQuery = useQuery({
    queryKey: ["knowledge", "file", selectedFile?.rootId, selectedFile?.path],
    queryFn: async () => {
      if (!selectedFile) return null;
      setPreviewError(null);
      try {
        return await fetchFile(selectedFile.rootId, selectedFile.path);
      } catch (err) {
        setPreviewError(err.message);
        return null;
      }
    },
    enabled: !!selectedFile
  });
  const searchQuery = useQuery({
    queryKey: ["knowledge", "search", search],
    queryFn: () => searchFiles(search),
    enabled: search.length >= 2,
    staleTime: 1e4
  });
  const roots = rootsQuery.data || [];
  const list = listQuery.data || { entries: []};
  const file = fileQuery.data;
  const searchResults = searchQuery.data || [];
  const pathSegments = reactExports.useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split("/").filter(Boolean);
  }, [currentPath]);
  const handleRootClick = (rootId) => {
    setSelectedRoot(rootId);
    setCurrentPath("");
    setSelectedFile(null);
  };
  const handleEntryClick = (entry) => {
    if (entry.type === "dir") {
      setCurrentPath(entry.relative_path);
    } else {
      if (selectedRoot) {
        setSelectedFile({ rootId: selectedRoot, path: entry.relative_path });
      }
    }
  };
  const handleSearchResultClick = (match) => {
    setSelectedRoot(match.rootId);
    setSelectedFile({ rootId: match.rootId, path: match.relative_path });
    setSearch("");
  };
  const handleNavUp = () => {
    if (!pathSegments.length) return;
    const parent = pathSegments.slice(0, -1).join("/");
    setCurrentPath(parent);
  };
  const handleNavSegment = (idx) => {
    const target = pathSegments.slice(0, idx + 1).join("/");
    setCurrentPath(target);
  };
  const handleCopyPath = async (fullPath) => {
    try {
      await navigator.clipboard.writeText(fullPath);
      pushToast({ title: "📋 Đã copy đường dẫn", body: fullPath, tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", tone: "error" });
    }
  };
  const handleCopyContent = async () => {
    if (!file?.content) return;
    try {
      await navigator.clipboard.writeText(file.content);
      pushToast({ title: "📋 Đã copy nội dung file", body: file.name, tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", tone: "error" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { delayDuration: 300, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-base font-semibold text-foreground flex items-center gap-2", children: [
        "📚 Knowledge Library",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Browse memory/ + Content Center knowledge files. Preview markdown inline, copy path, drop vào Workflow Step Inputs/Outputs trong tương lai.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3 text-muted-foreground" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-md ml-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search filename trong tất cả roots...",
            className: "w-full pl-7 pr-3 py-1.5 bg-background border border-input rounded text-xs text-foreground focus:border-ring outline-none"
          }
        ),
        search.length >= 2 && searchResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded shadow-xl z-10 max-h-64 overflow-y-auto", children: searchResults.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => handleSearchResultClick(m),
            className: "w-full text-left px-3 py-2 text-xs hover:bg-accent border-b border-border last:border-b-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground truncate", children: m.name })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: [
                m.rootLabel,
                " · ",
                m.relative_path
              ] })
            ]
          },
          `${m.rootId}/${m.relative_path}`
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[500px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-4 bg-card border border-border rounded-xl overflow-hidden flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border p-2 max-h-56 overflow-y-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Knowledge Roots" }),
          rootsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: roots.map((root) => {
            const Icon = CATEGORY_ICONS[root.category] || Folder;
            const isActive = selectedRoot === root.id;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: `${root.path} · ${root.fileCount} files${root.exists ? "" : " (folder không tồn tại)"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => handleRootClick(root.id),
                disabled: !root.exists,
                className: `w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs ${isActive ? "bg-primary/20 text-primary" : root.exists ? "text-foreground hover:bg-accent" : "text-muted-foreground opacity-40 cursor-not-allowed"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5 shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-left", children: root.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-muted-foreground", children: root.fileCount })
                ]
              }
            ) }, root.id);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: !selectedRoot ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-xs text-muted-foreground", children: "👈 Chọn 1 root để browse files" }) : listQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }),
          " Đang tải..."
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-2 py-1.5 border-b border-border text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setCurrentPath(""), className: "hover:text-foreground flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "size-2.5" }),
              " root"
            ] }),
            pathSegments.map((seg, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-2.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleNavSegment(i), className: "hover:text-foreground", children: seg })
            ] }, i))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-1", children: [
            currentPath && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleNavUp,
                className: "w-full text-left px-2 py-1 text-xs text-muted-foreground hover:bg-accent rounded flex items-center gap-1.5",
                children: [
                  "⬆️ ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ".." })
                ]
              }
            ),
            list.entries.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 text-center text-[10px] text-muted-foreground", children: "Folder rỗng" }) : list.entries.map((e) => {
              const isSelected = selectedFile?.path === e.relative_path;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => handleEntryClick(e),
                  className: `w-full text-left px-2 py-1 text-xs rounded flex items-center gap-1.5 ${isSelected ? "bg-primary/20 text-primary" : "text-foreground hover:bg-accent"}`,
                  children: [
                    e.type === "dir" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { className: "size-3 text-amber-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3 text-muted-foreground" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate", children: e.name }),
                    e.type === "file" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-muted-foreground", children: formatSize(e.size) })
                  ]
                },
                e.relative_path
              );
            })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-8 bg-card border border-border rounded-xl overflow-hidden flex flex-col", children: !selectedFile ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-center justify-center text-xs text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-8 mx-auto mb-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Click file từ tree bên trái để preview nội dung" })
      ] }) }) : fileQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-primary" }) }) : previewError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-center justify-center text-xs text-destructive p-4 text-center", children: previewError }) : file ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border p-3 flex items-start gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "size-4 text-primary mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-foreground truncate", children: file.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-0.5 font-mono truncate", children: file.full_path }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: [
              formatSize(file.size),
              " · ",
              file.extension,
              " · modified",
              " ",
              new Date(file.modified).toLocaleString("vi-VN")
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy đường dẫn full path", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => handleCopyPath(file.full_path),
                className: "p-1.5 text-muted-foreground hover:text-foreground border border-border rounded",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy toàn bộ nội dung file vào clipboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleCopyContent,
                className: "p-1.5 text-muted-foreground hover:text-foreground border border-border rounded",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" })
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "p-4 text-[11px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed", children: file.content }) })
      ] }) : null })
    ] })
  ] }) });
}

export { KnowledgeLibraryTab as default };
