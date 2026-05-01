import { o as createLucideIcon, b5 as useQueryClient, as as useToast, r as reactExports, ag as useQuery, c2 as useLiveInvalidate, b6 as useMutation, c3 as useSensors, c4 as useSensor, c5 as arrayMove, j as jsxRuntimeExports, ah as TooltipProvider, Z as Zap, c6 as GripVertical, aB as Plus, c7 as DndContext, c8 as closestCenter, c9 as SortableContext, ca as verticalListSortingStrategy, ap as Tooltip, aq as TooltipTrigger, ar as TooltipContent, cb as PointerSensor, cc as useSortable, cd as CSS, bj as ChevronDown, K as ChevronRight, v as Play, ac as Copy, af as Trash2 } from './index-DY_auHjr.js';
import { S as SopStepsEditor } from './SopStepsEditor-_g7quc80.js';

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  [
    "path",
    { d: "M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1", key: "1oajmo" }
  ],
  [
    "path",
    { d: "M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1", key: "mpwhp6" }
  ]
];
const FileBraces = createLucideIcon("file-braces", __iconNode);

const BASE = "/api/ops/sop-engine";
async function json(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers || {} }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
const pipelineApi = {
  // Templates
  listTemplates: () => json("/pipelines/templates"),
  seedTemplates: () => json("/pipelines/seed", { method: "POST" }),
  // CRUD
  list: (filter) => {
    const params = new URLSearchParams();
    if (filter?.is_template !== void 0) params.set("is_template", String(filter.is_template));
    if (filter?.category) params.set("category", filter.category);
    const q = params.toString();
    return json(`/pipelines${q ? `?${q}` : ""}`);
  },
  get: (id) => json(`/pipelines/${id}`),
  create: (body) => json("/pipelines", {
    method: "POST",
    body: JSON.stringify(body)
  }),
  update: (id, patch) => json(`/pipelines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  }),
  reorder: (orderedIds) => json("/pipelines/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds })
  }),
  delete: (id) => json(`/pipelines/${id}`, { method: "DELETE" }),
  // Execute — returns EventSource for SSE
  executeUrl: (id) => `${BASE}/pipelines/${id}/execute`
};
async function listSopsForCombobox() {
  const res = await fetch(`${BASE}/sops`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((s) => ({
    sop_id: s.sop_id,
    name: s.name,
    domain: s.domain,
    status: s.status,
    priority: s.priority
  }));
}

function Tip({ children, text, side = "top" }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side, className: "max-w-xs", children: text })
  ] });
}
function BlockChip({
  block,
  pipelineId,
  index,
  isExpanded,
  onToggleExpand,
  onRemove,
  onCopy
}) {
  const id = `${pipelineId}:${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "block", pipelineId, index }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const borderColor = block.type === "sop" ? "border-cyan-500/40" : block.type === "approval" ? "border-amber-500/40" : "border-purple-500/40";
  const bgColor = block.type === "sop" ? "bg-cyan-500/5" : block.type === "approval" ? "bg-amber-500/5" : "bg-purple-500/5";
  const isSop = block.type === "sop";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `group relative rounded-md border ${borderColor} ${bgColor} overflow-hidden`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `flex items-start gap-2 px-3 py-2 text-xs ${isSop ? "cursor-pointer hover:bg-foreground/5" : ""}`,
            onClick: isSop ? onToggleExpand : void 0,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Kéo để sắp xếp lại thứ tự bước trong pipeline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  ...attributes,
                  ...listeners,
                  className: "mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing",
                  "aria-label": "Kéo để sắp xếp",
                  onClick: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-3.5" })
                }
              ) }),
              isSop && /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: isExpanded ? "Thu gọn các bước workflow của SOP này" : "Mở rộng để xem toàn bộ 9-field workflow steps của SOP này", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  },
                  className: "mt-0.5 text-muted-foreground hover:text-foreground",
                  children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] font-bold text-cyan-500 dark:text-cyan-400 uppercase", children: block.ref }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: block.label })
                ] }),
                block.note && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: block.note }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-1 text-[10px] text-muted-foreground", children: [
                  block.executor && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "👤 ",
                    block.executor
                  ] }),
                  block.trigger && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "⏰ ",
                    block.trigger
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  onClick: (e) => e.stopPropagation(),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy block JSON vào clipboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onCopy, className: "p-1 hover:text-cyan-500 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" }) }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Xóa block (có thể hoàn tác trong 8 giây)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRemove, className: "p-1 hover:text-red-500 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) }) })
                  ]
                }
              )
            ]
          }
        ),
        isSop && isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/50 bg-background/50 p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SopStepsEditor, { sopId: block.ref }) })
      ]
    }
  );
}
function AddStepDialog({
  open,
  onClose,
  onAdd,
  sops
}) {
  const [type, setType] = reactExports.useState("sop");
  const [search, setSearch] = reactExports.useState("");
  const [selectedSop, setSelectedSop] = reactExports.useState(null);
  const [label, setLabel] = reactExports.useState("");
  const [note, setNote] = reactExports.useState("");
  const [executor, setExecutor] = reactExports.useState("");
  const [trigger, setTrigger] = reactExports.useState("");
  const [manualRef, setManualRef] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (open) {
      setType("sop");
      setSearch("");
      setSelectedSop(null);
      setLabel("");
      setNote("");
      setExecutor("");
      setTrigger("");
      setManualRef("");
    }
  }, [open]);
  const filteredSops = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sops.slice(0, 50);
    return sops.filter(
      (s) => s.sop_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [sops, search]);
  if (!open) return null;
  const handleAdd = () => {
    let block;
    if (type === "sop") {
      if (!selectedSop) return;
      block = {
        type: "sop",
        ref: selectedSop.sop_id,
        label: label || selectedSop.name,
        note: note || void 0,
        executor: executor || void 0,
        trigger: trigger || void 0
      };
    } else {
      if (!manualRef || !label) return;
      block = {
        type,
        ref: manualRef,
        label,
        note: note || void 0,
        executor: executor || void 0,
        trigger: trigger || void 0
      };
    }
    onAdd(block);
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-border flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-foreground", children: "➕ Thêm bước mới vào pipeline" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Đóng dialog", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-muted-foreground hover:text-foreground p-1", children: "✕" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4 overflow-y-auto flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Loại bước" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 mt-2", children: ["sop", "approval", "action"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Tip,
                  {
                    text: t === "sop" ? "Tham chiếu 1 SOP đã có trong hệ thống (208 SOPs). Không tạo mới để tránh duplicate." : t === "approval" ? "Chờ người phê duyệt (vd Jennie duyệt plan) trước khi pipeline chạy tiếp" : "Action không chuẩn hóa: webhook, cron trigger, external API call",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: () => setType(t),
                        className: `px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${type === t ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground hover:border-foreground"}`,
                        children: t === "sop" ? "📋 SOP" : t === "approval" ? "✋ Approval" : "⚡ Action"
                      }
                    )
                  },
                  t
                )) }),
                type === "sop" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "Chọn SOP từ danh sách 208 SOPs — không nhập tay để tránh duplicate." })
              ] }),
              type === "sop" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: [
                  "Tìm SOP ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    placeholder: "Gõ tên hoặc SOP ID (vd: MKT-001, content, email)...",
                    className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none",
                    autoFocus: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 max-h-56 overflow-y-auto rounded-md border border-border bg-background", children: [
                  filteredSops.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 text-xs text-muted-foreground text-center", children: "Không tìm thấy SOP nào" }),
                  filteredSops.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: () => {
                        setSelectedSop(s);
                        if (!label) setLabel(s.name);
                      },
                      className: `w-full text-left px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-muted transition-colors ${selectedSop?.sop_id === s.sop_id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] font-bold text-cyan-500 dark:text-cyan-400", children: s.sop_id }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: s.name })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: [
                          s.domain,
                          " · ",
                          s.status,
                          " · ",
                          s.priority
                        ] })
                      ]
                    },
                    s.sop_id
                  ))
                ] })
              ] }),
              type !== "sop" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: [
                  "Reference ID ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: manualRef,
                    onChange: (e) => setManualRef(e.target.value),
                    placeholder: type === "approval" ? "APPROVAL-JENNIE" : "WEBHOOK-LEAD",
                    className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: [
                  "Label hiển thị ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: label,
                    onChange: (e) => setLabel(e.target.value),
                    placeholder: "Vd: Content Calendar Monthly",
                    className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Ghi chú" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    value: note,
                    onChange: (e) => setNote(e.target.value),
                    placeholder: "Mô tả ngắn về bước này",
                    rows: 2,
                    className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none resize-none"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Executor" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "text",
                      value: executor,
                      onChange: (e) => setExecutor(e.target.value),
                      placeholder: "Content Strategist / Jennie / Cron",
                      className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Trigger" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "text",
                      value: trigger,
                      onChange: (e) => setTrigger(e.target.value),
                      placeholder: "Cron CN 20h / Manual / Sau SOP-XXX",
                      className: "mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-border flex justify-end gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground", children: "Hủy" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: handleAdd,
                  disabled: type === "sop" ? !selectedSop : !manualRef || !label,
                  className: "px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-md font-medium transition-colors",
                  children: "➕ Thêm bước"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function PipelineCard({
  pipeline,
  expanded,
  expandedBlocks,
  onToggle,
  onToggleBlock,
  onUpdateBlocks,
  onExecute,
  onClone,
  onDelete,
  onCopyJson,
  onAddStep,
  onCopyBlock,
  onRemoveBlock
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pipeline.pipeline_id,
    data: { type: "pipeline" }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const handleBlockDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = Number(String(active.id).split(":")[1]);
    const overIdx = Number(String(over.id).split(":")[1]);
    if (Number.isNaN(activeIdx) || Number.isNaN(overIdx)) return;
    const next = arrayMove(pipeline.blocks, activeIdx, overIdx);
    onUpdateBlocks(pipeline.pipeline_id, next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: "group border border-border rounded-xl bg-card overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors",
            onClick: onToggle,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Kéo để sắp xếp lại thứ tự pipeline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  ...attributes,
                  ...listeners,
                  className: "mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing",
                  "aria-label": "Kéo pipeline",
                  onClick: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-5" })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: expanded ? "Thu gọn pipeline" : "Mở rộng để xem các bước", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "text-muted-foreground hover:text-foreground mt-0.5",
                  onClick: (e) => {
                    e.stopPropagation();
                    onToggle();
                  },
                  children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-5" })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl", children: pipeline.emoji || "🔗" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-foreground truncate", children: pipeline.title }),
                  pipeline.is_template && /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Đây là template có sẵn — không thể xóa, chỉ có thể clone", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-primary/20 text-primary border border-primary/30", children: "Template" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: `Phân loại: ${pipeline.category}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-muted text-muted-foreground", children: pipeline.category }) })
                ] }),
                pipeline.schedule && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground mt-1", children: [
                  "⏰ ",
                  pipeline.schedule
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
                  "📦 ",
                  pipeline.blocks.length,
                  " bước"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", onClick: (e) => e.stopPropagation(), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Chạy pipeline ngay qua SSE stream. Xem kết quả trong Phiên Agent.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onExecute(pipeline.pipeline_id),
                    className: "p-1.5 rounded hover:bg-green-500/10 text-green-600 dark:text-green-400",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-4" })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy JSON đầy đủ của pipeline vào clipboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onCopyJson(pipeline),
                    className: "p-1.5 rounded hover:bg-muted text-muted-foreground",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileBraces, { className: "size-4" })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Clone pipeline này thành bản copy mới có thể chỉnh sửa", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onClone(pipeline.pipeline_id),
                    className: "p-1.5 rounded hover:bg-muted text-muted-foreground",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-4" })
                  }
                ) }),
                !pipeline.is_template && /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Xóa pipeline (có 8s để hoàn tác sau khi xóa)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onDelete(pipeline.pipeline_id),
                    className: "p-1.5 rounded hover:bg-red-500/10 text-red-600 dark:text-red-400",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4" })
                  }
                ) })
              ] })
            ]
          }
        ),
        expanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4 border-t border-border pt-3", children: [
          pipeline.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-3 leading-relaxed", children: pipeline.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, { sensors: blockSensors, collisionDetection: closestCenter, onDragEnd: handleBlockDragEnd, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            SortableContext,
            {
              items: pipeline.blocks.map((_, i) => `${pipeline.pipeline_id}:${i}`),
              strategy: verticalListSortingStrategy,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: pipeline.blocks.map((block, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                BlockChip,
                {
                  block,
                  pipelineId: pipeline.pipeline_id,
                  index: idx,
                  isExpanded: !!expandedBlocks[idx],
                  onToggleExpand: () => onToggleBlock(idx),
                  onRemove: () => onRemoveBlock(pipeline.pipeline_id, idx),
                  onCopy: () => onCopyBlock(block)
                },
                `${pipeline.pipeline_id}:${idx}`
              )) })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Mở dialog chọn SOP từ 208 SOPs có sẵn (không nhập tay để tránh duplicate)", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => onAddStep(pipeline.pipeline_id),
              className: "mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:border-primary hover:text-primary transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
                "Thêm bước mới (chọn từ 208 SOPs)"
              ]
            }
          ) })
        ] })
      ]
    }
  );
}
function PipelinesTab() {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [expandedMap, setExpandedMap] = reactExports.useState({});
  const [expandedBlocksMap, setExpandedBlocksMap] = reactExports.useState({});
  const [showTemplateDropdown, setShowTemplateDropdown] = reactExports.useState(false);
  const [addStepPipelineId, setAddStepPipelineId] = reactExports.useState(null);
  const undoTimerRef = reactExports.useRef(null);
  const pipelinesQuery = useQuery({
    queryKey: ["sop-engine", "pipelines"],
    queryFn: () => pipelineApi.list()
  });
  const templatesQuery = useQuery({
    queryKey: ["sop-engine", "pipeline-templates"],
    queryFn: () => pipelineApi.listTemplates()
  });
  const sopsQuery = useQuery({
    queryKey: ["sop-engine", "sops-combobox"],
    queryFn: () => listSopsForCombobox(),
    staleTime: 6e4
  });
  useLiveInvalidate({
    tables: ["gem_pipelines", "gem_sop_executions"],
    queryKeys: [["sop-engine", "pipelines"], ["sop-engine", "pipeline-templates"]]
  });
  const reorderMutation = useMutation({
    mutationFn: (orderedIds) => pipelineApi.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sop-engine", "pipelines"] })
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => pipelineApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sop-engine", "pipelines"] })
  });
  const createMutation = useMutation({
    mutationFn: (body) => pipelineApi.create(body),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["sop-engine", "pipelines"] });
      pushToast({ title: "✅ Đã tạo pipeline", body: row.title, tone: "success" });
    },
    onError: (err) => pushToast({ title: "Tạo pipeline thất bại", body: err.message, tone: "error" })
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => pipelineApi.delete(id)
  });
  const pipelines = pipelinesQuery.data || [];
  const templates = templatesQuery.data || [];
  const sops = sopsQuery.data || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handlePipelineDragEnd = reactExports.useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = pipelines.findIndex((p) => p.pipeline_id === active.id);
      const newIdx = pipelines.findIndex((p) => p.pipeline_id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const next = arrayMove(pipelines, oldIdx, newIdx);
      qc.setQueryData(["sop-engine", "pipelines"], next);
      reorderMutation.mutate(next.map((p) => p.pipeline_id));
    },
    [pipelines, qc, reorderMutation]
  );
  const toggleExpand = (id) => setExpandedMap((m) => ({ ...m, [id]: !m[id] }));
  const toggleBlockExpand = (pipelineId, idx) => {
    setExpandedBlocksMap((m) => ({
      ...m,
      [pipelineId]: { ...m[pipelineId] || {}, [idx]: !m[pipelineId]?.[idx] }
    }));
  };
  const expandAll = () => {
    const all = {};
    for (const p of pipelines) all[p.pipeline_id] = true;
    setExpandedMap(all);
  };
  const collapseAll = () => setExpandedMap({});
  const handleExecute = (id) => {
    fetch(pipelineApi.executeUrl(id), { method: "POST" }).catch(() => {
    });
    pushToast({
      title: "⚡ Pipeline started",
      body: `${id} đang chạy. Xem Phiên Agent để track.`,
      tone: "info"
    });
  };
  const handleClone = (id) => {
    const source = pipelines.find((p) => p.pipeline_id === id);
    if (!source) return;
    createMutation.mutate({ templateId: source.parent_template_id || id });
  };
  const handleDelete = (id) => {
    const target = pipelines.find((p) => p.pipeline_id === id);
    if (!target) return;
    const prev = pipelines;
    const next = pipelines.filter((p) => p.pipeline_id !== id);
    qc.setQueryData(["sop-engine", "pipelines"], next);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    let undone = false;
    pushToast({
      title: `🗑️ Đã xóa "${target.title}"`,
      body: 'Nhấp "Hoàn tác" trong 8 giây để khôi phục',
      tone: "warn",
      ttlMs: 8e3,
      action: { label: "Hoàn tác", href: "#undo-" + id }
    });
    const onUndo = (e) => {
      const target2 = e.target;
      if (target2?.closest(`a[href="#undo-${id}"]`)) {
        undone = true;
        qc.setQueryData(["sop-engine", "pipelines"], prev);
        pushToast({ title: "↩️ Đã hoàn tác", body: "Pipeline được khôi phục.", tone: "success" });
        document.removeEventListener("click", onUndo, true);
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
        }
      }
    };
    document.addEventListener("click", onUndo, true);
    undoTimerRef.current = window.setTimeout(async () => {
      document.removeEventListener("click", onUndo, true);
      if (undone) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        qc.setQueryData(["sop-engine", "pipelines"], prev);
        pushToast({ title: "Xóa thất bại", body: err.message, tone: "error" });
      }
    }, 8e3);
  };
  const handleCopyJson = async (pipeline) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(pipeline, null, 2));
      pushToast({ title: "📋 Đã copy JSON", body: pipeline.title, tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", body: "Trình duyệt không cho phép ghi clipboard", tone: "error" });
    }
  };
  const handleCopyBlock = async (block) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(block, null, 2));
      pushToast({ title: "📋 Đã copy block", body: `${block.ref} — ${block.label}`, tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", tone: "error" });
    }
  };
  const handleUpdateBlocks = (id, blocks) => {
    qc.setQueryData(
      ["sop-engine", "pipelines"],
      (prev) => (prev || []).map((p) => p.pipeline_id === id ? { ...p, blocks } : p)
    );
    updateMutation.mutate({ id, patch: { blocks } });
  };
  const handleRemoveBlock = (pipelineId, idx) => {
    const target = pipelines.find((p) => p.pipeline_id === pipelineId);
    if (!target) return;
    const prev = target.blocks;
    const removed = prev[idx];
    const next = prev.filter((_, i) => i !== idx);
    handleUpdateBlocks(pipelineId, next);
    pushToast({
      title: `🗑️ Đã xóa block "${removed.label}"`,
      body: 'Click "Hoàn tác" trong 8 giây',
      tone: "warn",
      ttlMs: 8e3,
      action: { label: "Hoàn tác", href: `#undo-block-${pipelineId}-${idx}` }
    });
    const onUndo = (e) => {
      const el = e.target;
      if (el?.closest(`a[href="#undo-block-${pipelineId}-${idx}"]`)) {
        handleUpdateBlocks(pipelineId, prev);
        document.removeEventListener("click", onUndo, true);
        pushToast({ title: "↩️ Đã hoàn tác", tone: "success" });
      }
    };
    document.addEventListener("click", onUndo, true);
    setTimeout(() => document.removeEventListener("click", onUndo, true), 9e3);
  };
  const handleAddStep = (pipelineId) => setAddStepPipelineId(pipelineId);
  const handleStepAdded = (block) => {
    if (!addStepPipelineId) return;
    const target = pipelines.find((p) => p.pipeline_id === addStepPipelineId);
    if (!target) return;
    const next = [...target.blocks, block];
    handleUpdateBlocks(addStepPipelineId, next);
    pushToast({ title: "✅ Đã thêm block", body: `${block.ref} — ${block.label}`, tone: "success" });
  };
  const handleCreateFromTemplate = (templateId) => {
    createMutation.mutate({ templateId });
    setShowTemplateDropdown(false);
  };
  if (pipelinesQuery.isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-sm text-muted-foreground", children: "Đang tải pipelines..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { delayDuration: 300, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-base font-semibold text-foreground flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "size-4 text-primary" }),
        "End-to-End Pipelines"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
        "Kéo ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "inline size-3" }),
        " để sắp xếp. Click bất cứ đâu trên dòng để mở rộng."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Mở rộng tất cả pipeline cùng lúc", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: expandAll,
            className: "px-2.5 py-1 text-xs border border-border rounded hover:border-primary text-foreground hover:text-primary",
            children: "Mở tất cả"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Thu gọn tất cả pipeline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: collapseAll,
            className: "px-2.5 py-1 text-xs border border-border rounded hover:border-primary text-foreground hover:text-primary",
            children: "Thu gọn"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Tạo pipeline mới — chọn từ 8 template (Content Biweekly, Email Biweekly, Sales Lead→Close, Short Video, Onboarding, Retention, CTV, Launch)", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowTemplateDropdown((v) => !v),
              className: "px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium flex items-center gap-1.5",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
                "Pipeline Mới"
              ]
            }
          ) }),
          showTemplateDropdown && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-2xl z-10 max-h-96 overflow-y-auto",
              onMouseLeave: () => setShowTemplateDropdown(false),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border", children: "Chọn template để clone" }),
                templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => handleCreateFromTemplate(t.pipeline_id),
                    className: "w-full text-left p-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: t.emoji }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-foreground", children: t.title })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-1 line-clamp-2", children: t.description }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-primary mt-1", children: [
                        t.category,
                        " · ",
                        t.block_count,
                        " bước"
                      ] })
                    ]
                  },
                  t.pipeline_id
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => {
                      createMutation.mutate({});
                      setShowTemplateDropdown(false);
                    },
                    className: "w-full p-3 text-center text-xs text-muted-foreground hover:bg-accent border-t border-border",
                    children: "+ Pipeline trống (tự build)"
                  }
                )
              ]
            }
          )
        ] })
      ] })
    ] }),
    pipelines.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-12 text-center border border-dashed border-border rounded-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-4xl mb-3", children: "🔗" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground font-medium", children: "Chưa có pipeline nào" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: 'Bấm "Pipeline Mới" để chọn template (Content Biweekly, Email Biweekly, Sales Lead→Close, ...)' })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd: handlePipelineDragEnd, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SortableContext, { items: pipelines.map((p) => p.pipeline_id), strategy: verticalListSortingStrategy, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: pipelines.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      PipelineCard,
      {
        pipeline: p,
        expanded: !!expandedMap[p.pipeline_id],
        expandedBlocks: expandedBlocksMap[p.pipeline_id] || {},
        onToggle: () => toggleExpand(p.pipeline_id),
        onToggleBlock: (idx) => toggleBlockExpand(p.pipeline_id, idx),
        onUpdateBlocks: handleUpdateBlocks,
        onExecute: handleExecute,
        onClone: handleClone,
        onDelete: handleDelete,
        onCopyJson: handleCopyJson,
        onAddStep: handleAddStep,
        onCopyBlock: handleCopyBlock,
        onRemoveBlock: handleRemoveBlock
      },
      p.pipeline_id
    )) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AddStepDialog,
      {
        open: addStepPipelineId !== null,
        onClose: () => setAddStepPipelineId(null),
        onAdd: handleStepAdded,
        sops
      }
    )
  ] }) });
}

export { PipelinesTab as default };
