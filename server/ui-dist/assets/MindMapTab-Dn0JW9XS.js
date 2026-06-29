import { r as reactExports, ag as useQuery, j as jsxRuntimeExports, ah as TooltipProvider, ai as Network, W as Info, R as RefreshCw, aj as Minimize2, ak as Maximize2, k as LoaderCircle, al as Boxes, am as ForceGraph3D, an as GRAPH_PRESETS, ao as Funnel, ap as Tooltip, aq as TooltipTrigger, ar as TooltipContent } from './index-vfZhbUFH.js';

async function fetchSopGraph() {
  const res = await fetch("/api/ops/sop-engine/graph");
  if (!res.ok) throw new Error("Failed to fetch SOP graph");
  return res.json();
}
function Tip({ children, text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { className: "max-w-xs", children: text })
  ] });
}
function MindMapTab() {
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const [filter, setFilter] = reactExports.useState({
    pipelines: true,
    sops: true,
    agents: true
  });
  const [selectedEntityId, setSelectedEntityId] = reactExports.useState(void 0);
  const query = useQuery({
    queryKey: ["sop-engine", "graph"],
    queryFn: fetchSopGraph,
    refetchInterval: 3e4
  });
  const data = query.data;
  const entities = data?.entities || [];
  const relations = data?.relations || [];
  const filteredEntities = entities.filter((e) => {
    const kind = e.metadata?.kind;
    if (kind === "pipeline" && !filter.pipelines) return false;
    if (kind === "sop" && !filter.sops) return false;
    if (kind === "agent" && !filter.agents) return false;
    return true;
  });
  const filteredIds = new Set(filteredEntities.map((e) => e.id));
  const filteredRelations = relations.filter(
    (r) => filteredIds.has(r.source_entity_id) && filteredIds.has(r.target_entity_id)
  );
  const handleEntityClick = (entity) => {
    setSelectedEntityId(entity.id);
  };
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { delayDuration: 300, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-260px)] min-h-[600px]"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border-b border-border flex items-center gap-3 flex-wrap bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { className: "size-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-foreground", children: "Mind Map — Mắt Thần CEO (SOP Engine view)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "3D knowledge graph của Pipelines + SOPs + Agents. Dùng chung component ForceGraph3D với trang /ops/knowledge-graph.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3 text-muted-foreground" }) })
      ] }),
      data && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "📦 ",
          data.stats.pipelines,
          " pipelines"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "📋 ",
          data.stats.sops,
          " SOPs"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "🤖 ",
          data.stats.agents,
          " agents"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          data.stats.total_entities,
          " entities"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          data.stats.total_relations,
          " relations"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 border border-border rounded-md overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Toggle pipelines visibility", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setFilter((f) => ({ ...f, pipelines: !f.pipelines })),
              className: `px-2 py-1 text-[10px] ${filter.pipelines ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`,
              children: "📦 Pipelines"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Toggle SOPs visibility", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setFilter((f) => ({ ...f, sops: !f.sops })),
              className: `px-2 py-1 text-[10px] ${filter.sops ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`,
              children: "📋 SOPs"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Toggle agents visibility", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setFilter((f) => ({ ...f, agents: !f.agents })),
              className: `px-2 py-1 text-[10px] ${filter.agents ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`,
              children: "🤖 Agents"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Refresh graph data", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => query.refetch(),
            className: "p-1.5 text-muted-foreground hover:text-foreground border border-border rounded",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `size-3.5 ${query.isFetching ? "animate-spin" : ""}` })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: fullscreen ? "Thoát fullscreen" : "Fullscreen (toàn màn hình)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setFullscreen((v) => !v),
            className: "p-1.5 text-muted-foreground hover:text-foreground border border-border rounded",
            children: fullscreen ? /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "size-3.5" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Mở trang Mắt Thần CEO đầy đủ với tất cả controls + style panels", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "/GEM/ops/knowledge-graph",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "px-2 py-1 text-[10px] border border-primary text-primary rounded hover:bg-primary/10",
            children: "Mở Mắt Thần CEO →"
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 relative bg-background", children: [
      query.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex items-center justify-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-8 animate-spin text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-sm text-muted-foreground", children: "Loading graph..." })
      ] }) : query.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-destructive", children: "Error loading graph data" }) : filteredEntities.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Boxes, { className: "size-12 mx-auto mb-2 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "Không có entity nào" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: "Bật lại filter hoặc tạo pipeline/SOP trước." })
      ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        ForceGraph3D,
        {
          entities: filteredEntities,
          relations: filteredRelations,
          selectedEntityId,
          onEntityClick: handleEntityClick,
          onEntityDoubleClick: handleEntityClick,
          maxNodes: 500,
          graphStyle: GRAPH_PRESETS.gem_gold
        }
      ),
      selectedEntity && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 max-w-sm shadow-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-foreground", children: selectedEntity.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: selectedEntity.description }),
          selectedEntity.metadata?.kind === "pipeline" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-primary mt-1", children: [
            "📦 ",
            selectedEntity.metadata.block_count,
            " blocks · ",
            selectedEntity.metadata.category
          ] }),
          selectedEntity.metadata?.kind === "sop" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-primary mt-1", children: [
            "📋 ",
            selectedEntity.metadata.domain,
            " · ",
            selectedEntity.metadata.priority
          ] }),
          selectedEntity.metadata?.kind === "agent" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-primary mt-1", children: [
            "🤖 ",
            selectedEntity.metadata.provider,
            "/",
            selectedEntity.metadata.model
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSelectedEntityId(void 0),
            className: "text-muted-foreground hover:text-foreground p-0.5",
            children: "✕"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-4 right-4 bg-card/90 backdrop-blur border border-border rounded-lg p-2 text-[10px] space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-semibold text-muted-foreground mb-1 flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "size-3" }),
          " Legend"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-indigo-500" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: "Pipeline" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-emerald-500" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: "SOP" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-violet-500" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: "Agent" })
        ] })
      ] })
    ] })
  ] }) });
}

export { MindMapTab as default };
