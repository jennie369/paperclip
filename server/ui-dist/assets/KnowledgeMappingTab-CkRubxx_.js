import { as as useToast, r as reactExports, j as jsxRuntimeExports, y as Search, aA as Save, aB as Plus, F as FileText, X } from './index-C7HOhyqm.js';

function KnowledgeMappingTab() {
  const { pushToast } = useToast();
  const [sops, setSops] = reactExports.useState([]);
  const [selectedSopId, setSelectedSopId] = reactExports.useState(null);
  const [search, setSearch] = reactExports.useState("");
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const [pickerSearch, setPickerSearch] = reactExports.useState("");
  const [pickerResults, setPickerResults] = reactExports.useState([]);
  const [pickerLoading, setPickerLoading] = reactExports.useState(false);
  const [draftFiles, setDraftFiles] = reactExports.useState([]);
  const [saving, setSaving] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sopsRes = await fetch("/api/ops/sop-engine/sops?limit=500");
        if (cancelled) return;
        const sopsJson = await sopsRes.json();
        setSops(Array.isArray(sopsJson) ? sopsJson : sopsJson?.sops || []);
      } catch (err) {
        pushToast({ title: "Lỗi load SOPs", body: err.message, tone: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);
  reactExports.useEffect(() => {
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
          `/api/ops/sop-engine/knowledge/search?q=${encodeURIComponent(q)}`
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
  const selectedSop = reactExports.useMemo(
    () => sops.find((s) => s.sop_id === selectedSopId) || null,
    [sops, selectedSopId]
  );
  reactExports.useEffect(() => {
    setDraftFiles(selectedSop?.knowledge_files || []);
  }, [selectedSopId, selectedSop]);
  const filteredSops = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sops;
    return sops.filter(
      (s) => s.sop_id.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.domain?.toLowerCase().includes(q)
    );
  }, [sops, search]);
  const availablePickerResults = reactExports.useMemo(
    () => pickerResults.filter((r) => !draftFiles.includes(r.full_path)),
    [pickerResults, draftFiles]
  );
  const attachFile = (filePath) => {
    setDraftFiles((prev) => [...prev, filePath]);
  };
  const detachFile = (filePath) => {
    setDraftFiles((prev) => prev.filter((f) => f !== filePath));
  };
  const saveMapping = async () => {
    if (!selectedSop) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ops/sop-engine/sops/${selectedSop.sop_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledge_files: draftFiles })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setSops(
        (prev) => prev.map(
          (s) => s.sop_id === selectedSop.sop_id ? { ...s, knowledge_files: draftFiles } : s
        )
      );
      pushToast({
        title: "✅ Đã lưu",
        body: `${selectedSop.sop_id}: ${draftFiles.length} knowledge files`,
        tone: "success"
      });
    } catch (err) {
      pushToast({ title: "Lưu thất bại", body: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };
  const hasChanges = reactExports.useMemo(() => {
    const current = selectedSop?.knowledge_files || [];
    if (current.length !== draftFiles.length) return true;
    return !current.every((f) => draftFiles.includes(f));
  }, [selectedSop, draftFiles]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex items-center justify-center text-muted-foreground", children: [
      "Đang tải ",
      sops.length,
      " SOPs và memory files..."
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-80 border-r border-border flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: `Tìm SOP (${sops.length})...`,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-full pl-8 pr-2 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
        filteredSops.map((sop) => {
          const count = sop.knowledge_files?.length || 0;
          const isSelected = sop.sop_id === selectedSopId;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setSelectedSopId(sop.sop_id),
              className: `w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/40 transition-colors ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs text-muted-foreground", children: sop.sop_id }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: sop.name || "—" }),
                  sop.domain && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: sop.domain })
                ] }),
                count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full", children: count })
              ] })
            },
            sop.sop_id
          );
        }),
        filteredSops.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-sm text-muted-foreground text-center", children: "Không tìm thấy" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-col overflow-hidden", children: !selectedSop ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-center justify-center text-muted-foreground", children: "Chọn một SOP bên trái để map knowledge files" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground font-mono", children: [
            selectedSop.sop_id,
            selectedSop.domain && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 bg-muted/50 rounded", children: selectedSop.domain })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mt-1", children: selectedSop.name || selectedSop.sop_id }),
          selectedSop.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 line-clamp-2", children: selectedSop.description })
        ] }),
        hasChanges && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: saveMapping,
            disabled: saving,
            className: "shrink-0 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-1 disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-3.5" }),
              saving ? "Đang lưu..." : "Lưu thay đổi"
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold", children: [
            "Knowledge files đã gắn (",
            draftFiles.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setPickerOpen(true),
              className: "px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3" }),
                "Thêm file"
              ]
            }
          )
        ] }),
        draftFiles.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground italic border border-dashed border-border rounded-md p-4 text-center", children: "Chưa có knowledge file nào gắn với SOP này" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: draftFiles.map((filePath) => {
          const displayName = filePath.split(/[\\/]/).pop() || filePath;
          const ext = displayName.match(/\.(\w+)$/)?.[1]?.toUpperCase() || "";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex items-start gap-2 p-2 bg-muted/30 border border-border rounded-md",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4 text-muted-foreground mt-0.5 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: displayName }),
                  ext && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: ext }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/60 font-mono truncate mt-0.5", children: filePath })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => detachFile(filePath),
                    className: "p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded",
                    title: "Gỡ file này",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                  }
                )
              ]
            },
            filePath
          );
        }) })
      ] }) }),
      pickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4",
          onClick: () => setPickerOpen(false),
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border-b border-border", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Chọn memory files để gắn" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: () => setPickerOpen(false),
                        className: "p-1 hover:bg-muted rounded",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        autoFocus: true,
                        type: "text",
                        placeholder: "Gõ ≥2 ký tự để tìm file trên disk (memory/, gem-content-center/, skills-store/...)",
                        value: pickerSearch,
                        onChange: (e) => setPickerSearch(e.target.value),
                        className: "w-full pl-8 pr-2 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-1.5", children: "Live disk search — không dùng DB cache. Mọi file trên disk (.md, .txt, .json, .yml, design framework, content pipeline...) đều tìm được." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-2", children: [
                  pickerLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-sm text-muted-foreground text-center", children: "Đang tìm trên disk..." }),
                  !pickerLoading && pickerSearch.trim().length < 2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-sm text-muted-foreground text-center", children: "Nhập từ khoá (≥2 ký tự) để search" }),
                  !pickerLoading && pickerSearch.trim().length >= 2 && availablePickerResults.map((file) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: () => {
                        attachFile(file.full_path);
                        setPickerSearch("");
                      },
                      className: "w-full text-left p-2 hover:bg-muted/40 rounded-md border-b border-border/30 flex items-start gap-2",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4 text-muted-foreground mt-0.5 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: file.name }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground truncate", children: [
                            file.rootLabel,
                            " · ",
                            file.extension || "file"
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/60 font-mono truncate mt-0.5", children: file.relative_path })
                        ] })
                      ]
                    },
                    file.full_path
                  )),
                  !pickerLoading && pickerSearch.trim().length >= 2 && availablePickerResults.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 text-sm text-muted-foreground text-center", children: [
                    'Không tìm thấy file nào khớp "',
                    pickerSearch,
                    '"'
                  ] })
                ] })
              ]
            }
          )
        }
      )
    ] }) })
  ] });
}

export { KnowledgeMappingTab };
