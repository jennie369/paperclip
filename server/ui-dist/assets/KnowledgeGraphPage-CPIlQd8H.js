import { b5 as useQueryClient, r as reactExports, ag as useQuery, b6 as useMutation, cw as knowledgeGraphApi, j as jsxRuntimeExports, cx as ENTITY_TYPES, X, cy as RELATION_TYPES, x as ExternalLink, bW as GitBranch, af as Trash2, cz as queryKeys, cA as useGraphStore, y as Search, E as Eye, bu as EyeOff, q as ChartColumn, aj as Minimize2, ak as Maximize2, an as GRAPH_PRESETS, am as ForceGraph3D, cB as GraphStylePanel } from './index-Cxd0f6Om.js';

function EntityDetailPanel({
  entityId,
  onClose,
  onEntityClick,
  onTraverse
}) {
  const queryClient = useQueryClient();
  const [editName, setEditName] = reactExports.useState("");
  const [editDesc, setEditDesc] = reactExports.useState("");
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.entity(entityId),
    queryFn: () => knowledgeGraphApi.getEntity(entityId),
    enabled: !!entityId
  });
  const entity = data?.entity;
  const relations = data?.relations || [];
  const relatedEntities = data?.related_entities || [];
  const entityLookup = new Map(relatedEntities.map((e) => [e.id, e]));
  const deleteMutation = useMutation({
    mutationFn: () => knowledgeGraphApi.deleteEntity(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
      onClose();
    }
  });
  const updateMutation = useMutation({
    mutationFn: (updates) => knowledgeGraphApi.upsertEntity({
      external_id: entity.external_id,
      entity_type: entity.entity_type,
      name: updates.name || entity.name,
      description: updates.description,
      metadata: updates.metadata || entity.metadata
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
      setIsEditing(false);
    }
  });
  const startEditing = reactExports.useCallback(() => {
    if (!entity) return;
    setEditName(entity.name);
    setEditDesc(entity.description || "");
    setIsEditing(true);
  }, [entity]);
  const saveEdits = reactExports.useCallback(() => {
    updateMutation.mutate({ name: editName, description: editDesc });
  }, [editName, editDesc, updateMutation]);
  if (isLoading || !entity) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-80 border-l border-border bg-card p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-pulse space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-6 bg-muted rounded w-3/4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 bg-muted rounded w-1/2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-20 bg-muted rounded" })
    ] }) });
  }
  const config = ENTITY_TYPES[entity.entity_type];
  const groupedRelations = /* @__PURE__ */ new Map();
  for (const r of relations) {
    const otherId = r.source_entity_id === entityId ? r.target_entity_id : r.source_entity_id;
    const target = entityLookup.get(otherId);
    const group = groupedRelations.get(r.relation_type) || [];
    group.push({ relation: r, target });
    groupedRelations.set(r.relation_type, group);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full bg-transparent flex flex-col h-full overflow-hidden text-slate-800 dark:text-slate-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: config?.icon || "📌" }),
        isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: editName,
            onChange: (e) => setEditName(e.target.value),
            className: "text-sm font-semibold bg-input border border-border rounded px-2 py-0.5 w-full",
            title: "Tên thực thể",
            placeholder: "Tên..."
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold truncate", children: entity.name })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-1 hover:bg-muted rounded text-slate-800 dark:text-slate-100", title: "Đóng bảng chia tiết", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `px-2 py-0.5 rounded-full text-xs font-medium ${config?.bgClass || ""} ${config?.textClass || ""}`,
            title: config?.tooltip,
            children: config?.label || entity.entity_type
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
          "Tin cậy: ",
          Math.round(entity.confidence * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground block mb-1", children: "Mô tả" }),
        isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: editDesc,
            onChange: (e) => setEditDesc(e.target.value),
            className: "w-full text-sm bg-input border border-border rounded p-2 resize-none",
            rows: 3,
            title: "Mô tả thực thể",
            placeholder: "Nhập mô tả..."
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/80", children: entity.description || "Chưa có mô tả" })
      ] }),
      Object.keys(entity.metadata).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground block mb-1", children: "Thuộc tính" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: Object.entries(entity.metadata).map(([key, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: key }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-mono", children: String(value) })
        ] }, key)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs text-muted-foreground block mb-2", children: [
          "Quan hệ (",
          relations.length,
          ")"
        ] }),
        Array.from(groupedRelations.entries()).map(([type, items]) => {
          const relConfig = RELATION_TYPES[type];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `w-2 h-2 rounded-full inline-block ${relConfig?.bgClass || "bg-gray-500"}`
                }
              ),
              relConfig?.label || type,
              " (",
              items.length,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5 pl-3", children: items.map(({ relation, target }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => target && onEntityClick(target.id),
                className: "text-xs text-foreground/80 hover:text-foreground flex items-center gap-1 w-full text-left py-0.5",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-3 h-3 flex-shrink-0 text-muted-foreground" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: target?.name || "?" })
                ]
              },
              relation.id
            )) })
          ] }, type);
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground space-y-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Nguồn: ",
          entity.source
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "ID: ",
          entity.external_id
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Tạo: ",
          new Date(entity.created_at).toLocaleDateString("vi-VN")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border p-3 space-y-2", children: isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: saveEdits,
          disabled: updateMutation.isPending,
          className: "flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90",
          children: updateMutation.isPending ? "Đang lưu..." : "Lưu"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setIsEditing(false),
          className: "px-3 py-1.5 bg-muted text-muted-foreground rounded text-xs",
          children: "Hủy"
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: startEditing,
          className: "flex-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80",
          children: "✏ Sửa"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => onTraverse(entityId),
          className: "flex-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80 flex items-center justify-center gap-1",
          title: "Khám phá các liên kết lân cận theo dạng mạng lưới tuyến đường",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { className: "w-3 h-3" }),
            "Traverse"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            if (confirm("Xóa entity này? Tất cả quan hệ sẽ bị xóa theo.")) {
              deleteMutation.mutate();
            }
          },
          className: "px-2 py-1.5 bg-destructive/10 text-destructive rounded text-xs hover:bg-destructive/20",
          title: "Xóa vĩnh viễn thực thể",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3" })
        }
      )
    ] }) })
  ] });
}

const ALL_TYPES = Object.keys(ENTITY_TYPES);
function GraphControls({
  stats,
  visibleCount,
  onRefresh,
  onSeed,
  seeding
}) {
  const {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    maxDepth,
    setMaxDepth,
    isFullscreen,
    toggleFullscreen,
    showLabels,
    toggleLabels,
    showStats,
    toggleStats
  } = useGraphStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[200px]", title: "Tìm kiếm theo Tên và Mô tả của Thực thể", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Tìm thực thể...",
            className: "w-full pl-8 pr-3 py-1.5 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring",
            title: "Nhập chuỗi tìm kiếm..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 bg-muted rounded-md p-0.5", children: [1, 2, 3].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setMaxDepth(d),
          title: `Lọc đến ${d} node liên kết xung quanh`,
          className: `px-2 py-1 text-xs rounded font-medium transition-colors ${maxDepth === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
          children: [
            d,
            " hop"
          ]
        },
        d
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: toggleLabels,
          className: "p-1.5 rounded hover:bg-muted text-muted-foreground",
          title: showLabels ? "Ẩn nhãn" : "Hiện nhãn",
          children: showLabels ? /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: toggleStats,
          className: "p-1.5 rounded hover:bg-muted text-muted-foreground",
          title: showStats ? "Ẩn thống kê" : "Hiện thống kê",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: toggleFullscreen,
          className: "p-1.5 rounded hover:bg-muted text-muted-foreground",
          title: isFullscreen ? "Thu nhỏ" : "Toàn màn hình",
          children: isFullscreen ? /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onSeed,
          disabled: seeding,
          className: "px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50",
          title: "Tạo lại các liên kết mặc định và seed Graph dữ liệu hệ thống",
          children: seeding ? "Đang seed..." : "Seed dữ liệu"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onRefresh,
          className: "px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80",
          title: "Tải lại toàn bộ dữ liệu 3D Graphic Canvas từ đầu",
          children: "Làm mới"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: ALL_TYPES.map((type) => {
      const config = ENTITY_TYPES[type];
      const isActive = activeFilters.size === 0 || activeFilters.has(type);
      const count = stats?.entities[type] || 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => toggleFilter(type),
          title: `Bật/Tắt hiển thị cho Loại: ${config.label}`,
          className: `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${isActive ? `${config.bgClass || ""} ${config.textClass || ""} ring-1 ring-border` : `opacity-40 hover:opacity-70 ${config.textClass || ""} bg-transparent`}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `w-2 h-2 rounded-full ${config.bgClass?.replace("/20", "") || ""}`
              }
            ),
            config.label,
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
              "(",
              count,
              ")"
            ] })
          ]
        },
        type
      );
    }) }),
    showStats && stats && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        stats.total_entities,
        " thực thể"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        stats.total_relations,
        " quan hệ"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Hiện ",
        visibleCount,
        " nodes"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Depth: ",
        maxDepth
      ] })
    ] })
  ] });
}

const CODE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|c|cpp|h|hpp|cs|rb|php|lua|zig|scala|ps1|sh)$/i;
const DOC_EXT_RE = /\.(md|mdx|rst|txt|adoc)$/i;
const FUNC_RE = /\(\)$/;
const PASCAL_RE = /^[A-Z][A-Za-z0-9_]*$/;
function classifyGraphifyNode(node) {
  const label = node.label ?? node.id ?? "";
  const fileType = node.file_type ?? "";
  if (fileType === "doc" || fileType === "paper") return "code_doc";
  if (fileType === "image") return "code_concept";
  if (FUNC_RE.test(label)) return "code_function";
  if (DOC_EXT_RE.test(label)) return "code_doc";
  if (CODE_EXT_RE.test(label)) return "code_module";
  if (PASCAL_RE.test(label)) return "code_class";
  return "code_concept";
}
const RELATION_MAP = {
  contains: "contains",
  calls: "calls",
  invokes: "calls",
  uses: "calls",
  imports: "imports",
  import: "imports",
  requires: "imports",
  extends: "extends",
  inherits: "extends",
  implements: "implements",
  references: "references",
  refers_to: "references",
  mentions: "references"
};
function classifyGraphifyLink(link) {
  if (link.confidence === "INFERRED" || link.confidence === "AMBIGUOUS") {
    return "inferred_link";
  }
  const rel = (link.relation ?? "").toLowerCase().trim();
  return RELATION_MAP[rel] ?? "references";
}
function graphifyToPaperclip(raw) {
  const entities = [];
  const relations = [];
  const byEntityType = {};
  const byRelation = {};
  const communitySet = /* @__PURE__ */ new Set();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const n of raw.nodes ?? []) {
    const entity_type = classifyGraphifyNode(n);
    byEntityType[entity_type] = (byEntityType[entity_type] ?? 0) + 1;
    if (typeof n.community === "number") communitySet.add(n.community);
    entities.push({
      id: n.id,
      external_id: n.id,
      entity_type,
      name: n.label ?? n.id,
      description: n.source_file ? `${n.source_file}${n.source_location ? ":" + n.source_location : ""}` : null,
      metadata: {
        source_file: n.source_file,
        source_location: n.source_location,
        community: n.community,
        file_type: n.file_type
      },
      confidence: 1,
      source: "graphify",
      source_ref: n.source_file ?? null,
      created_at: now,
      updated_at: now
    });
  }
  let edgeId = 0;
  let extracted = 0;
  let inferred = 0;
  for (const l of raw.links ?? []) {
    const relation_type = classifyGraphifyLink(l);
    byRelation[relation_type] = (byRelation[relation_type] ?? 0) + 1;
    if (l.confidence === "EXTRACTED") extracted++;
    else if (l.confidence === "INFERRED" || l.confidence === "AMBIGUOUS") inferred++;
    relations.push({
      id: `gfy_r_${edgeId++}`,
      source_entity_id: String(l.source),
      target_entity_id: String(l.target),
      relation_type,
      confidence: l.confidence_score ?? (l.confidence === "EXTRACTED" ? 1 : 0.5),
      metadata: {
        raw_relation: l.relation,
        confidence_label: l.confidence,
        weight: l.weight,
        source_file: l.source_file,
        source_location: l.source_location
      },
      source: "graphify",
      created_at: now
    });
  }
  const totalRelations = relations.length || 1;
  const stats = {
    total_entities: entities.length,
    total_relations: relations.length,
    communities: communitySet.size,
    by_entity_type: byEntityType,
    by_relation: byRelation,
    extracted_pct: Math.round(extracted / totalRelations * 100),
    inferred_pct: Math.round(inferred / totalRelations * 100)
  };
  return { entities, relations, stats };
}

function KnowledgeGraphPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = reactExports.useState("graph");
  const [detailEntityId, setDetailEntityId] = reactExports.useState(null);
  const [showSidebars, setShowSidebars] = reactExports.useState(true);
  const [activePreset, setActivePreset] = reactExports.useState("gem_gold");
  const [graphStyle, setGraphStyle] = reactExports.useState(GRAPH_PRESETS.gem_gold);
  const {
    selectedEntityId,
    selectEntity,
    setHighlights,
    activeFilters,
    toggleFilter,
    clearFilters,
    searchQuery,
    maxDepth,
    isFullscreen
  } = useGraphStore();
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.graph(
      activeFilters.size > 0 ? Array.from(activeFilters).join(",") : void 0,
      50
    ),
    queryFn: () => knowledgeGraphApi.getGraph({
      limit: 50,
      types: activeFilters.size > 0 ? Array.from(activeFilters).join(",") : void 0
    })
  });
  const { data: stats } = useQuery({
    queryKey: queryKeys.knowledgeGraph.stats,
    queryFn: () => knowledgeGraphApi.getStats()
  });
  const seedMutation = useMutation({
    mutationFn: () => knowledgeGraphApi.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
    }
  });
  const [sourceMode, setSourceMode] = reactExports.useState("live");
  const [graphifyEntities, setGraphifyEntities] = reactExports.useState([]);
  const [graphifyRelations, setGraphifyRelations] = reactExports.useState([]);
  const [graphifyStats, setGraphifyStats] = reactExports.useState(null);
  const [graphifyLabel, setGraphifyLabel] = reactExports.useState("");
  const [graphifyError, setGraphifyError] = reactExports.useState(null);
  const [topNOnly, setTopNOnly] = reactExports.useState(50);
  const [minDegree, setMinDegree] = reactExports.useState(3);
  const [hideInferred, setHideInferred] = reactExports.useState(false);
  const [graphifySearch, setGraphifySearch] = reactExports.useState("");
  const handleGraphifyFile = reactExports.useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        if (!Array.isArray(raw.nodes) || !Array.isArray(raw.links)) {
          throw new Error("JSON missing nodes/links — không phải graphify graph.json");
        }
        const { entities: ge, relations: gr, stats: gs } = graphifyToPaperclip(raw);
        setGraphifyEntities(ge);
        setGraphifyRelations(gr);
        setGraphifyStats(gs);
        setGraphifyLabel(file.name);
        setGraphifyError(null);
        setSourceMode("graphify");
      } catch (err) {
        setGraphifyError(err?.message ?? "Parse failed");
        setSourceMode("graphify");
      }
    };
    reader.onerror = () => setGraphifyError("File read failed");
    reader.readAsText(file);
    e.target.value = "";
  }, []);
  const liveEntities = graphData?.entities || [];
  const liveRelations = graphData?.relations || [];
  const entities = sourceMode === "graphify" ? graphifyEntities : liveEntities;
  const relations = sourceMode === "graphify" ? graphifyRelations : liveRelations;
  const { filteredEntities, filteredRelations, maxDegree } = reactExports.useMemo(() => {
    if (sourceMode === "live") {
      const q2 = searchQuery.toLowerCase();
      const fe2 = !searchQuery ? entities : entities.filter(
        (e) => e.name.toLowerCase().includes(q2) || e.external_id.toLowerCase().includes(q2) || e.description && e.description.toLowerCase().includes(q2)
      );
      return { filteredEntities: fe2, filteredRelations: relations, maxDegree: 0 };
    }
    if (entities.length === 0) {
      return { filteredEntities: [], filteredRelations: [], maxDegree: 0 };
    }
    const degMap = /* @__PURE__ */ new Map();
    for (const r of relations) {
      degMap.set(r.source_entity_id, (degMap.get(r.source_entity_id) ?? 0) + 1);
      degMap.set(r.target_entity_id, (degMap.get(r.target_entity_id) ?? 0) + 1);
    }
    let mx = 0;
    degMap.forEach((v) => {
      if (v > mx) mx = v;
    });
    let keptIds;
    if (topNOnly && topNOnly > 0) {
      const sorted = [...degMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, topNOnly);
      keptIds = new Set(sorted.map(([id]) => id));
    } else {
      keptIds = /* @__PURE__ */ new Set();
      for (const e of entities) {
        if ((degMap.get(e.id) ?? 0) >= minDegree) keptIds.add(e.id);
      }
    }
    const q = graphifySearch.trim().toLowerCase();
    if (q) {
      const seed = new Set(
        entities.filter((e) => keptIds.has(e.id) && e.name.toLowerCase().includes(q)).map((e) => e.id)
      );
      keptIds = new Set(seed);
      for (const r of relations) {
        if (seed.has(r.source_entity_id)) keptIds.add(r.target_entity_id);
        if (seed.has(r.target_entity_id)) keptIds.add(r.source_entity_id);
      }
    }
    const fe = entities.filter((e) => keptIds.has(e.id));
    const finalIds = new Set(fe.map((e) => e.id));
    const fr = relations.filter((r) => {
      if (!finalIds.has(r.source_entity_id) || !finalIds.has(r.target_entity_id)) return false;
      if (hideInferred && r.relation_type === "inferred_link") return false;
      return true;
    });
    return { filteredEntities: fe, filteredRelations: fr, maxDegree: mx };
  }, [sourceMode, entities, relations, searchQuery, topNOnly, minDegree, hideInferred, graphifySearch]);
  const adjacency = reactExports.useMemo(() => {
    const adj = /* @__PURE__ */ new Map();
    for (const r of filteredRelations) {
      if (!adj.has(r.source_entity_id)) adj.set(r.source_entity_id, /* @__PURE__ */ new Set());
      if (!adj.has(r.target_entity_id)) adj.set(r.target_entity_id, /* @__PURE__ */ new Set());
      adj.get(r.source_entity_id).add(r.target_entity_id);
      adj.get(r.target_entity_id).add(r.source_entity_id);
    }
    return adj;
  }, [filteredRelations]);
  const computeHighlights = reactExports.useCallback(
    (entityId) => {
      const highlights = /* @__PURE__ */ new Map();
      highlights.set(entityId, 0);
      const queue = [[entityId, 0]];
      while (queue.length > 0) {
        const [current, depth] = queue.shift();
        if (depth >= maxDepth) continue;
        const neighbors = adjacency.get(current);
        if (!neighbors) continue;
        for (const n of neighbors) {
          if (!highlights.has(n)) {
            highlights.set(n, depth + 1);
            queue.push([n, depth + 1]);
          }
        }
      }
      return highlights;
    },
    [adjacency, maxDepth]
  );
  const handleEntityClick = reactExports.useCallback(
    (entity) => {
      selectEntity(entity.id);
      const highlights = computeHighlights(entity.id);
      setHighlights(highlights);
    },
    [selectEntity, computeHighlights, setHighlights]
  );
  const handleEntityDoubleClick = reactExports.useCallback(
    (entity) => {
      setDetailEntityId(entity.id);
    },
    []
  );
  const handleTraverse = reactExports.useCallback(
    (entityId) => {
      selectEntity(entityId);
      const highlights = computeHighlights(entityId);
      setHighlights(highlights);
    },
    [selectEntity, computeHighlights, setHighlights]
  );
  reactExports.useEffect(() => {
    if (selectedEntityId) {
      const highlights = computeHighlights(selectedEntityId);
      setHighlights(highlights);
    }
  }, [maxDepth, selectedEntityId, computeHighlights, setHighlights]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full h-full text-foreground font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 z-0", children: sourceMode === "live" && graphLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: "Đang tải đồ thị không gian..." }) : filteredEntities.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground", children: sourceMode === "live" ? "Hãy Seed dữ liệu để khởi tạo Vũ Trụ AI" : "Upload graph.json từ một thư mục graphify-out/ để bắt đầu" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      ForceGraph3D,
      {
        entities: filteredEntities,
        relations: filteredRelations,
        selectedEntityId: selectedEntityId ?? void 0,
        onEntityClick: handleEntityClick,
        onEntityDoubleClick: handleEntityDoubleClick,
        maxNodes: sourceMode === "graphify" ? 500 : 80,
        graphStyle
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 bg-primary rounded-sm shadow-lg" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold tracking-wide text-foreground", children: "Vũ Trụ AI — KNOWLEDGE GRAPH" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground flex items-center gap-2", children: "Hệ thống Quản trị > Mắt Thần CEO Toàn cảnh" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 mt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSourceMode("live"),
            className: `px-2 py-1 rounded-full border text-xs font-medium backdrop-blur-md pointer-events-auto cursor-pointer transition-colors ${sourceMode === "live" ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-accent"}`,
            children: "🌌 Live (Mắt Thần CEO)"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSourceMode("graphify"),
            className: `px-2 py-1 rounded-full border text-xs font-medium backdrop-blur-md pointer-events-auto cursor-pointer transition-colors ${sourceMode === "graphify" ? "border-chart-2 bg-chart-2/20 text-chart-2" : "border-border bg-muted/40 text-muted-foreground hover:bg-accent"}`,
            children: "⚡ Graphify (Code/Knowledge)"
          }
        ),
        sourceMode === "live" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-1 rounded-full border border-chart-2/40 bg-chart-2/10 text-xs text-chart-2 font-medium backdrop-blur-md pointer-events-auto cursor-pointer", title: "Số lượng Agent đang liên kết trong vũ trụ", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-1", children: "🤖" }),
          stats?.entities?.agent || 0,
          " Agents"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "label",
          {
            className: "px-2 py-1 rounded-full border border-chart-2/40 bg-chart-2/10 text-xs text-chart-2 font-medium backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-chart-2/20 transition-colors",
            title: "Upload graph.json từ thư mục graphify-out/ của bất kỳ project nào",
            children: [
              "📁 Upload graph.json",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  accept: "application/json,.json",
                  onChange: handleGraphifyFile,
                  className: "hidden"
                }
              )
            ]
          }
        ),
        sourceMode === "graphify" && graphifyEntities.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setGraphifyEntities([]);
              setGraphifyRelations([]);
              setGraphifyStats(null);
              setGraphifyLabel("");
              setGraphifyError(null);
              setSourceMode("live");
            },
            className: "px-2 py-1 rounded-full border border-destructive/40 bg-destructive/10 text-xs text-destructive font-medium backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-destructive/20 transition-colors",
            title: "Xóa graph đã upload, quay về live mode",
            children: "✕ Xóa upload"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowSidebars(!showSidebars), className: "px-2 py-1 rounded-full border border-border bg-card text-xs text-foreground font-medium backdrop-blur-md hover:bg-accent transition-colors pointer-events-auto shadow-lg hover:shadow-xl", children: showSidebars ? "🗖 Đóng Panel" : "🗗 Mở Panel" })
      ] }),
      sourceMode === "graphify" && entities.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-2 bg-[#0f172a]/70 backdrop-blur-xl border border-[#22d3ee]/20 rounded-xl px-3 py-2 pointer-events-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-[#22d3ee] tracking-wider", children: "VIEW:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setTopNOnly(50);
              setMinDegree(0);
            },
            className: `px-2 py-1 rounded text-[10px] font-mono border ${topNOnly === 50 ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]" : "border-border text-muted-foreground hover:bg-accent"}`,
            children: "🌟 Top 50"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setTopNOnly(150);
              setMinDegree(0);
            },
            className: `px-2 py-1 rounded text-[10px] font-mono border ${topNOnly === 150 ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]" : "border-border text-muted-foreground hover:bg-accent"}`,
            children: "⚡ Top 150"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setTopNOnly(null);
              setMinDegree(3);
            },
            className: `px-2 py-1 rounded text-[10px] font-mono border ${!topNOnly && minDegree === 3 ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]" : "border-border text-muted-foreground hover:bg-accent"}`,
            children: "📊 Deg ≥3"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              setTopNOnly(null);
              setMinDegree(0);
            },
            className: `px-2 py-1 rounded text-[10px] font-mono border ${!topNOnly && minDegree === 0 ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]" : "border-border text-muted-foreground hover:bg-accent"}`,
            children: [
              "🌐 All (",
              entities.length,
              ")"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-[10px] text-white/70 cursor-pointer ml-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: hideInferred,
              onChange: (e) => setHideInferred(e.target.checked)
            }
          ),
          "Hide INFERRED"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "🔍 Tìm node...",
            value: graphifySearch,
            onChange: (e) => setGraphifySearch(e.target.value),
            className: "px-2 py-1 bg-[#030712] border border-white/10 rounded text-[10px] text-[#22d3ee] font-mono outline-none focus:border-[#22d3ee]/60 min-w-[160px]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-[#10b981] ml-auto font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: filteredEntities.length }),
          "/",
          entities.length,
          " · ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: filteredRelations.length }),
          "/",
          relations.length,
          " edges · max deg ",
          maxDegree
        ] })
      ] }),
      sourceMode === "graphify" && graphifyStats && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-white/50 mt-1 flex flex-wrap gap-3 pointer-events-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "📊 ",
          graphifyStats.total_entities,
          " nodes · ",
          graphifyStats.total_relations,
          " edges · ",
          graphifyStats.communities,
          " communities"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[#10b981]", children: [
          "EXTRACTED ",
          graphifyStats.extracted_pct,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[#f59e0b]", children: [
          "INFERRED ",
          graphifyStats.inferred_pct,
          "%"
        ] }),
        graphifyLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[#22d3ee]", children: [
          "📁 ",
          graphifyLabel
        ] })
      ] }),
      graphifyError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-red-300 mt-1 pointer-events-auto", children: [
        "⚠ ",
        graphifyError
      ] })
    ] }),
    showSidebars && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-28 left-4 bottom-4 w-52 z-10 flex flex-col gap-4 pointer-events-auto overflow-y-auto no-scrollbar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card backdrop-blur-xl border border-border rounded-md p-4 shadow-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-3 text-center", children: "BỘ LỌC DỮ LIỆU" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: [
            { id: "all", label: "Tất cả", color: "#8b5cf6" },
            { id: "agent", label: "Agent Tham gia", color: "#10b981" },
            { id: "task", label: "Theo Công việc", color: "#3b82f6" }
          ].map((item) => {
            const isActive = item.id === "all" ? activeFilters.size === 0 : activeFilters.has(item.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => {
                  if (item.id === "all") {
                    clearFilters();
                  } else {
                    toggleFilter(item.id);
                  }
                },
                className: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isActive ? "bg-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-[#c4b5fd]" : "hover:bg-[#334155]/50 border border-transparent"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${isActive ? "bg-[" + item.color + "] shadow-[0_0_5px_" + item.color + "]" : "bg-[#475569]"}` }),
                  item.label
                ]
              },
              item.id
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card backdrop-blur-xl border border-border rounded-md p-4 shadow-xl pointer-events-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-3 text-center", children: "PHÂN LOẠI NODE" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2 text-xs", children: Object.entries(ENTITY_TYPES).map(([type, config]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2.5 h-2.5 rounded-full`, style: { backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: config.label })
          ] }, type)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          GraphControls,
          {
            stats,
            visibleCount: filteredEntities.length,
            onRefresh: () => queryClient.invalidateQueries({ queryKey: ["kg"] }),
            onSeed: () => seedMutation.mutate(),
            seeding: seedMutation.isPending
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-4 right-4 bottom-4 w-72 z-10 flex flex-col gap-4 pointer-events-auto overflow-y-auto no-scrollbar", children: [
        detailEntityId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-[#0B0C10]/60 backdrop-blur-sm p-4 pointer-events-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-300 dark:border-[#38bdf8]/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.15)] w-full max-w-2xl max-h-[85vh] flex flex-col relative text-slate-800 dark:text-slate-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetailEntityId(null), className: "absolute top-5 right-5 text-slate-500 hover:text-foreground/50 dark:hover:text-white z-20 bg-slate-200/50 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors", children: "✕" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            EntityDetailPanel,
            {
              entityId: detailEntityId,
              onClose: () => setDetailEntityId(null),
              onEntityClick: (id) => {
                setDetailEntityId(id);
                selectEntity(id);
                setHighlights(computeHighlights(id));
              },
              onTraverse: handleTraverse
            }
          )
        ] }) }),
        !detailEntityId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card backdrop-blur-xl border border-border rounded-md p-4 shadow-xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-3 border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2", children: "📊 THỐNG KÊ TOÀN CẢNH" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Tổng số Node" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-[#38bdf8]", children: filteredEntities.length })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Kết nối lưới" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-[#f472b6]", children: relations.length })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px bg-border my-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Tình trạng phân phối" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-[#fbbf24]", children: "85%" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Năng suất hệ thống" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-[#4ade80]", children: "9.2/10 ⭐" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card backdrop-blur-xl border border-border rounded-md p-4 flex-1 shadow-xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-3 border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2", children: "🗓 DÒNG THỜI GIAN NHIỆM VỤ" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative pl-3 mt-4 flex flex-col gap-4 border-l border-slate-200 dark:border-[#334155]", children: [
              { date: "Hôm nay", info: "Workflow Kiến trúc đồ thị - Hoàn thành Graphic Canvas", cssClass: "bg-[#a855f7] shadow-[0_0_5px_#a855f7]" },
              { date: "Hôm qua", info: "Lưu trữ vector SQL pgvector", cssClass: "bg-[#10b981] shadow-[0_0_5px_#10b981]" },
              { date: "2 ngày trước", info: "Trích xuất 7 loại Entity tự động", cssClass: "bg-[#3b82f6] shadow-[0_0_5px_#3b82f6]" },
              { date: "3 ngày trước", info: "Thiết lập SOP quy trình chuẩn", cssClass: "bg-[#f59e0b] shadow-[0_0_5px_#f59e0b]" }
            ].map((ev, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0C10] ${ev.cssClass}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-bold text-slate-500 dark:text-[#94a3b8]", children: ev.date }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-foreground mt-0.5 leading-relaxed", children: ev.info })
            ] }, i)) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GraphStylePanel,
      {
        style: graphStyle,
        activePreset,
        onStyleChange: setGraphStyle,
        onPresetChange: (key) => {
          setActivePreset(key);
          setGraphStyle(GRAPH_PRESETS[key]);
        }
      }
    )
  ] });
}

export { KnowledgeGraphPage as default };
