import { o as createLucideIcon, r as reactExports, c4 as useSensors, c5 as useSensor, cc as PointerSensor, c6 as arrayMove, j as jsxRuntimeExports, c8 as DndContext, c9 as closestCenter, ca as SortableContext, cX as horizontalListSortingStrategy, cd as useSortable, ce as CSS, b5 as useQueryClient, as as useToast, ag as useQuery, b6 as useMutation, c2 as Pencil, X, k as LoaderCircle, aA as Save, F as FileText, bd as CircleAlert, ct as MarkdownBody, i as Activity, v as Play, cY as PowerOff, cZ as Power, R as RefreshCw, be as Hash, cQ as Tag, K as ChevronRight, az as FileCode, c_ as Terminal, c as Clock, c1 as ShieldCheck, ac as Copy, ah as TooltipProvider, cH as Bot, at as Wrench, c$ as Puzzle, cV as Server, Z as Zap, B as BookOpen, cz as FolderOpen, b$ as GraduationCap, b1 as CalendarDays, m as Mail, d0 as ShoppingBag, cN as Radio, cP as Cog, ap as Tooltip, aq as TooltipTrigger, ar as TooltipContent, d1 as AgentListPage, E as Eye, x as ExternalLink, cM as FlaskConical, ae as useNavigate, d2 as ChannelsOverview, d3 as Github, b3 as CircleCheck, a8 as CircleX, af as Trash2 } from './index-gVNMNdMv.js';
import { H as HardDrive } from './hard-drive-XYzNPtpy.js';

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$1 = [
  ["path", { d: "m10.852 19.772-.383.924", key: "r7sl7d" }],
  ["path", { d: "m13.148 14.228.383-.923", key: "1d5zpm" }],
  ["path", { d: "M13.148 19.772a3 3 0 1 0-2.296-5.544l-.383-.923", key: "1ydik7" }],
  ["path", { d: "m13.53 20.696-.382-.924a3 3 0 1 1-2.296-5.544", key: "1m1vsf" }],
  ["path", { d: "m14.772 15.852.923-.383", key: "660p6e" }],
  ["path", { d: "m14.772 18.148.923.383", key: "hrcpis" }],
  [
    "path",
    {
      d: "M4.2 15.1a7 7 0 1 1 9.93-9.858A7 7 0 0 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2",
      key: "j2q98n"
    }
  ],
  ["path", { d: "m9.228 15.852-.923-.383", key: "1p9ong" }],
  ["path", { d: "m9.228 18.148-.923.383", key: "6558rz" }]
];
const CloudCog = createLucideIcon("cloud-cog", __iconNode$1);

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", key: "1cjeqo" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", key: "19qd67" }]
];
const Link = createLucideIcon("link", __iconNode);

function loadOrder(key) {
  try {
    const raw = localStorage.getItem(`tab-order:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function saveOrder(key, order) {
  try {
    localStorage.setItem(`tab-order:${key}`, JSON.stringify(order));
  } catch {
  }
}
function mergeOrder(saved, current) {
  if (!saved) return current;
  const currentSet = new Set(current);
  const result = [];
  for (const id of saved) if (currentSet.has(id)) result.push(id);
  for (const id of current) if (!saved.includes(id)) result.push(id);
  return result;
}
function SortableTab({
  tab,
  isActive,
  onClick,
  tipComponent: Tip
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : void 0
  };
  const Icon = tab.icon;
  const btn = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      ref: setNodeRef,
      style,
      ...attributes,
      ...listeners,
      onClick,
      className: `flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-grab active:cursor-grabbing ${isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`,
      children: [
        Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tab.label })
      ]
    }
  );
  if (Tip && tab.tooltip) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: tab.tooltip, children: btn });
  }
  return btn;
}
function SortableTabBar({ storageKey, tabs, activeTab, onTabChange, tipComponent }) {
  const defaultIds = tabs.map((t) => t.id);
  const [order, setOrder] = reactExports.useState(() => mergeOrder(loadOrder(storageKey), defaultIds));
  reactExports.useEffect(() => {
    setOrder((prev) => mergeOrder(prev, defaultIds));
  }, [defaultIds.join(",")]);
  reactExports.useEffect(() => {
    saveOrder(storageKey, order);
  }, [storageKey, order]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = reactExports.useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setOrder((prev) => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    },
    []
  );
  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const sortedTabs = order.map((id) => tabMap.get(id)).filter(Boolean);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SortableContext, { items: order, strategy: horizontalListSortingStrategy, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-0.5 border-b border-border overflow-x-auto", children: sortedTabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    SortableTab,
    {
      tab,
      isActive: activeTab === tab.id,
      onClick: () => onTabChange(tab.id),
      tipComponent
    },
    tab.id
  )) }) }) });
}

const EDITABLE_FIELDS = ["name", "display_name", "description", "enabled", "trust_level", "notes", "category", "priority", "tags"];
async function fetchFileContent(diskPath) {
  const res = await fetch(`/api/registry/file?path=${encodeURIComponent(diskPath)}`);
  if (!res.ok) return null;
  return res.json();
}
async function patchEntity(path, body) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
function isEditableField(field) {
  return EDITABLE_FIELDS.includes(field);
}
function formatValue(value) {
  if (value === null || value === void 0) return "—";
  if (typeof value === "boolean") return value ? "✓ true" : "✗ false";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "[]";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
function EntityDetailDrawer({
  open,
  onClose,
  entity,
  entityPath,
  idField = "id",
  queryKey,
  title,
  actions
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [draft, setDraft] = reactExports.useState({});
  const [editing, setEditing] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (entity) {
      const initial = {};
      for (const f of EDITABLE_FIELDS) {
        if (entity[f] !== void 0) initial[f] = entity[f];
      }
      setDraft(initial);
      setEditing(false);
    }
  }, [entity]);
  const fileQuery = useQuery({
    queryKey: ["registry-file", entity?.disk_path],
    queryFn: () => entity?.disk_path ? fetchFileContent(entity.disk_path) : Promise.resolve(null),
    enabled: !!(open && entity?.disk_path),
    staleTime: 3e4
  });
  const saveMutation = useMutation({
    mutationFn: () => patchEntity(`${entityPath}/${entity[idField]}`, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registry", queryKey] });
      pushToast({ title: "✅ Đã lưu", tone: "success" });
      setEditing(false);
    },
    onError: (err) => pushToast({ title: "Lưu thất bại", body: err.message, tone: "error" })
  });
  if (!open || !entity) return null;
  const allFields = Object.keys(entity).filter((k) => k !== idField && k !== "disk_path");
  const idValue = entity[idField];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 z-40 bg-background/40 backdrop-blur-sm",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground font-mono uppercase", children: idValue }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-foreground truncate", children: title || entity.name || entity.display_name || idValue })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          !editing && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setEditing(true),
              className: "p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded",
              title: "Sửa",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onClose,
              className: "p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded",
              title: "Đóng (Esc)",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-semibold text-muted-foreground uppercase mb-2", children: "Metadata" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: allFields.map((field) => {
            const value = entity[field];
            const editable = editing && isEditableField(field);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-3 text-muted-foreground font-mono text-[10px] align-top whitespace-nowrap", children: field }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 text-foreground", children: editable ? typeof value === "boolean" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: !!draft[field],
                  onChange: (e) => setDraft({ ...draft, [field]: e.target.checked })
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: draft[field] ?? "",
                  onChange: (e) => setDraft({ ...draft, [field]: e.target.value }),
                  className: "w-full px-2 py-1 bg-background border border-input rounded text-xs text-foreground focus:border-ring outline-none"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block whitespace-pre-wrap break-words", children: formatValue(value) }) })
            ] }, field);
          }) }) }),
          editing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => saveMutation.mutate(),
                disabled: saveMutation.isPending,
                className: "px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded flex items-center gap-1.5 disabled:opacity-50",
                children: [
                  saveMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-3" }),
                  "Lưu thay đổi"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  setEditing(false);
                  const initial = {};
                  for (const f of EDITABLE_FIELDS) {
                    if (entity[f] !== void 0) initial[f] = entity[f];
                  }
                  setDraft(initial);
                },
                className: "px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground",
                children: "Hủy"
              }
            )
          ] })
        ] }),
        entity.disk_path && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3" }),
            "Nội dung file",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono normal-case text-muted-foreground/70 truncate", children: [
              "· ",
              entity.disk_path
            ] })
          ] }),
          fileQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground italic flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }),
            " Đang đọc file..."
          ] }),
          fileQuery.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-destructive flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3" }),
            " Không đọc được file"
          ] }),
          fileQuery.data && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-md bg-muted/20 p-3 max-h-96 overflow-y-auto", children: [
            fileQuery.data.truncated && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-amber-500 mb-2", children: "⚠️ File lớn hơn 1MB — đã cắt ngắn" }),
            /\.(md|markdown)$/i.test(entity.disk_path) ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "prose prose-sm max-w-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownBody, { children: fileQuery.data.content }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "font-mono text-[10px] whitespace-pre-wrap text-foreground", children: fileQuery.data.content })
          ] })
        ] })
      ] }),
      actions && actions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap", children: actions.filter((a) => !a.show || a.show(entity)).map((action, i) => {
        const Icon = action.icon;
        const cls = action.tone === "destructive" ? "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30" : action.tone === "primary" ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary" : "bg-muted hover:bg-accent text-foreground border-border";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => action.onClick(entity),
            className: `px-3 py-1.5 text-xs rounded border flex items-center gap-1.5 ${cls}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
              action.label
            ]
          },
          i
        );
      }) })
    ] })
  ] });
}

function StatusDot({ status }) {
  const cls = (() => {
    switch ((status || "").toLowerCase()) {
      case "success":
        return "bg-emerald-500";
      case "running":
        return "bg-blue-500 animate-pulse";
      case "failed":
      case "error":
        return "bg-red-500";
      case "timeout":
        return "bg-orange-500";
      case "cancelled":
        return "bg-amber-500";
      default:
        return "bg-muted-foreground/40";
    }
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block size-1.5 rounded-full ${cls}` });
}
function PriorityBadge({ priority }) {
  const cls = (() => {
    switch ((priority || "normal").toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "high":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "normal":
        return "bg-muted text-muted-foreground/70 border-border";
      case "low":
        return "bg-muted/50 text-muted-foreground/50 border-border/50";
      default:
        return "bg-muted text-muted-foreground/70 border-border";
    }
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded border ${cls} tabular-nums uppercase tracking-wide font-medium`, children: priority ?? "normal" });
}
function BaseItem({
  icon,
  label,
  summary,
  defaultOpen = false,
  children,
  actions
}) {
  const [open, setOpen] = reactExports.useState(defaultOpen);
  const hasContent = Boolean(children);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => hasContent && setOpen((v) => !v),
        className: `w-full flex items-center gap-2 px-2 py-1.5 text-left rounded ${hasContent ? "hover:bg-accent/50 cursor-pointer" : "cursor-default"} text-sm font-medium text-foreground/80`,
        children: [
          hasContent ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: `size-3 text-muted-foreground/60 transition-transform duration-200 ${open ? "rotate-90" : ""}` }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-3" }),
          icon,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate", children: label }),
          summary && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/50 truncate max-w-[40%]", children: summary }),
          actions
        ]
      }
    ),
    open && hasContent && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-2 mt-1 pl-6 border-l-2 border-border text-sm text-foreground/80", children })
  ] });
}
function CopyButton({ text, size = 12 }) {
  const [copied, setCopied] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      },
      className: "opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-foreground",
      "aria-label": "Copy",
      children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { size, className: "text-emerald-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size })
    }
  );
}
function KeyValueRow({ label, value, copy }) {
  if (value === void 0 || value === null || value === "") return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-start gap-3 py-1 text-[13px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground/60 w-32 shrink-0 pt-0.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 text-foreground/80 font-mono break-all", children: value }),
    copy && /* @__PURE__ */ jsxRuntimeExports.jsx(CopyButton, { text: copy })
  ] });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDuration(ms) {
  if (!ms) return "—";
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  if (ms < 36e5) return `${(ms / 6e4).toFixed(1)}m`;
  return `${(ms / 36e5).toFixed(1)}h`;
}
function CronLogDrawer({ cronId, open, onClose, onOpenRelated }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const bodyRef = reactExports.useRef(null);
  const { data: cron, isLoading: cronLoading, refetch: refetchCron } = useQuery({
    queryKey: ["registry", "crons", cronId],
    queryFn: async () => {
      const r = await fetch(`/api/registry/crons/${cronId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    },
    enabled: open && !!cronId,
    staleTime: 1e4
  });
  const { data: runsRes, refetch: refetchRuns } = useQuery({
    queryKey: ["registry", "crons", cronId, "runs"],
    queryFn: async () => {
      const r = await fetch(`/api/registry/crons/${cronId}/runs?limit=30`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    },
    enabled: open && !!cronId,
    staleTime: 5e3,
    refetchInterval: 1e4
  });
  const { data: relatedRes } = useQuery({
    queryKey: ["registry", "crons", cronId, "related"],
    queryFn: async () => {
      const r = await fetch(`/api/registry/crons/${cronId}/related`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    },
    enabled: open && !!cronId,
    staleTime: 3e4
  });
  const runNow = reactExports.useCallback(async () => {
    if (!cron) return;
    if (!confirm(`Chạy cron "${cron.display_name}" NGAY bây giờ?`)) return;
    pushToast({ title: `▶️ Triggering ${cron.display_name}…`, tone: "info" });
    try {
      const r = await fetch(`/api/registry/crons/${cron.id}/execute`, { method: "POST" });
      const j = await r.json();
      pushToast({
        title: j.status === "success" ? `✅ ${cron.display_name} done` : `❌ ${cron.display_name} failed`,
        body: (j.output || "").slice(-200),
        tone: j.status === "success" ? "success" : "error"
      });
      qc.invalidateQueries({ queryKey: ["registry", "crons"] });
      refetchCron();
      refetchRuns();
    } catch (e) {
      pushToast({ title: "Run thất bại", body: e.message, tone: "error" });
    }
  }, [cron, pushToast, qc, refetchCron, refetchRuns]);
  const toggleEnabled = reactExports.useCallback(async () => {
    if (!cron) return;
    const next = !cron.enabled;
    if (!confirm(`${next ? "Bật lại" : "Tắt"} cron "${cron.display_name}"?`)) return;
    try {
      const r = await fetch(`/api/registry/crons/${cron.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next })
      });
      if (!r.ok) throw new Error((await r.json()).error || "Toggle failed");
      pushToast({ title: next ? `✅ Đã bật ${cron.display_name}` : `⏸ Đã tắt ${cron.display_name}`, tone: "success" });
      qc.invalidateQueries({ queryKey: ["registry", "crons"] });
      refetchCron();
    } catch (e) {
      pushToast({ title: "Toggle thất bại", body: e.message, tone: "error" });
    }
  }, [cron, pushToast, qc, refetchCron]);
  reactExports.useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  const runs = runsRes?.runs ?? [];
  const related = relatedRes?.related ?? [];
  const flowInfo = reactExports.useMemo(() => {
    if (!cron?.execution_spec) return null;
    const step = cron.execution_spec.flow_step;
    const total = cron.execution_spec.flow_of;
    const name = cron.execution_spec.flow_name;
    if (!step && !name) return null;
    return { step, total, name };
  }, [cron]);
  if (!open) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "bg-background border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden",
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-border flex items-start gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "size-4 text-primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: cron?.last_run_status }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-foreground truncate", children: cron?.display_name ?? cronId }),
              cron?.priority && /* @__PURE__ */ jsxRuntimeExports.jsx(PriorityBadge, { priority: cron.priority }),
              cron?.category && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 border border-border", children: cron.category }),
              flowInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30", children: [
                "Step ",
                flowInfo.step,
                "/",
                flowInfo.total,
                " · ",
                flowInfo.name
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground/60 mt-0.5 font-mono", children: [
              cron?.id,
              " · ",
              cron?.schedule_type,
              " · ",
              cron?.cron_humanized ?? cron?.cron_expression ?? "—"
            ] }),
            cron?.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/80 mt-1.5 leading-snug", children: cron.description })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: runNow,
                className: "text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5",
                title: "Chạy cron ngay (manual trigger)",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-3" }),
                  " Chạy ngay"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: toggleEnabled,
                className: `text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${cron?.enabled ? "border-border text-muted-foreground/70 hover:bg-muted" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"}`,
                children: cron?.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PowerOff, { className: "size-3" }),
                  " Tắt"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "size-3" }),
                  " Bật"
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  refetchCron();
                  refetchRuns();
                },
                className: "size-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted",
                title: "Refresh",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "size-3" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                className: "size-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted",
                "aria-label": "Close",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: bodyRef, className: "flex-1 overflow-y-auto px-6 py-4 space-y-3", children: [
          cronLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-20 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin mr-2" }),
            " Đang tải…"
          ] }),
          !cronLoading && cron && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card border border-border rounded-lg p-3 space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { className: "size-3" }),
                " Identity"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Cron ID", value: cron.id, copy: cron.id }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "OS Name", value: cron.os_registered_as, copy: cron.os_registered_as }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Schedule Type", value: cron.schedule_type }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Schedule", value: cron.cron_humanized || cron.cron_expression }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Next Run", value: fmtDate(cron.next_run_at) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                KeyValueRow,
                {
                  label: "Script Path",
                  value: cron.script_full_path || cron.script_file_name,
                  copy: cron.script_full_path
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Working Dir", value: cron.working_directory, copy: cron.working_directory }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueRow, { label: "Command", value: cron.execute_command, copy: cron.execute_command }),
              cron.tags && cron.tags.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                KeyValueRow,
                {
                  label: "Tags",
                  value: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: cron.tags.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 border border-border", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "size-2.5 inline mr-0.5" }),
                    t
                  ] }, t)) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                KeyValueRow,
                {
                  label: "Run Count",
                  value: `${cron.run_count ?? 0} total · ${cron.fail_count ?? 0} failed`
                }
              )
            ] }),
            related.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card border border-border rounded-lg p-3 space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "size-3" }),
                "Flow",
                relatedRes?.flow_name ? `: ${relatedRes.flow_name}` : "",
                " · ",
                related.length,
                " related"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1.5", children: [cron, ...related].sort(
                (a, b) => (a.execution_spec?.flow_step ?? 999) - (b.execution_spec?.flow_step ?? 999)
              ).map((c, i, arr) => {
                const isSelf = c.id === cron.id;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => !isSelf && onOpenRelated?.(c.id),
                      className: `text-xs px-2 py-1 rounded border flex items-center gap-1.5 ${isSelf ? "bg-primary/10 border-primary/40 text-primary font-medium" : "border-border hover:bg-muted text-foreground/80"}`,
                      disabled: isSelf,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: c.last_run_status }),
                        c.execution_spec?.flow_step && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono text-muted-foreground/60", children: [
                          "#",
                          c.execution_spec.flow_step
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c.display_name })
                      ]
                    },
                    c.id
                  ),
                  i < arr.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3 text-muted-foreground/40" })
                ] });
              }) })
            ] }),
            cron.execution_spec && Object.keys(cron.execution_spec).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "bg-card border border-border rounded-lg p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              BaseItem,
              {
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "size-3.5 text-muted-foreground/60" }),
                label: "Execution Spec",
                summary: `${Object.keys(cron.execution_spec).length} fields`,
                defaultOpen: false,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[12px] font-mono text-foreground/80 bg-muted p-2 rounded mt-1 overflow-auto max-h-96 whitespace-pre-wrap break-all", children: JSON.stringify(cron.execution_spec, null, 2) })
              }
            ) }),
            cron.last_run_output && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-accent/20 border border-accent/40 rounded-lg p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { className: "size-3.5 text-foreground/70" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-foreground", children: "Last Run Output" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
                  fmtDate(cron.last_run_at),
                  " · ",
                  fmtDuration(cron.last_run_duration_ms)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: cron.last_run_status }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CopyButton, { text: cron.last_run_output })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[12px] font-mono text-foreground/80 bg-muted p-2 rounded max-h-[32rem] overflow-auto whitespace-pre-wrap break-all", children: cron.last_run_output })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card border border-border rounded-lg p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-3.5 text-muted-foreground/60" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold text-foreground", children: [
                  "History · ",
                  runs.length,
                  " runs"
                ] }),
                runs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
                  "first: ",
                  fmtDate(runs[runs.length - 1]?.started_at),
                  " · last: ",
                  fmtDate(runs[0]?.started_at)
                ] })
              ] }),
              runs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/60 italic px-2 py-3", children: "Chưa có lịch sử run nào." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: runs.map((run) => {
                const label = `${fmtDate(run.started_at)} · ${fmtDuration(run.duration_ms)} · ${run.status}`;
                const hasDetail = Boolean(run.stdout || run.stderr);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  BaseItem,
                  {
                    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: run.status }),
                    label,
                    summary: run.triggered_by ? `by ${run.triggered_by}` : void 0,
                    defaultOpen: false,
                    children: hasDetail ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      run.stdout && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1 mb-1", children: [
                          "stdout ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CopyButton, { text: run.stdout })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[12px] font-mono text-foreground/80 bg-muted p-2 rounded max-h-64 overflow-auto whitespace-pre-wrap break-all", children: run.stdout })
                      ] }),
                      run.stderr && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] uppercase tracking-wider text-red-500 flex items-center gap-1 mb-1", children: [
                          "stderr ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CopyButton, { text: run.stderr })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[12px] font-mono text-red-500/80 bg-red-500/5 p-2 rounded max-h-64 overflow-auto whitespace-pre-wrap break-all", children: run.stderr })
                      ] })
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/50 italic py-2", children: "No output captured" })
                  },
                  run.id
                );
              }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-2 border-t border-border text-[11px] text-muted-foreground/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3 inline mr-1" }),
            " Auto-refresh 10s · runs snapshot từ cron_registry_runs"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: runs.length > 0 && `next run: ${fmtDate(cron?.next_run_at)}` })
        ] })
      ]
    }
  ) });
}

const SUB_TABS = [
  { id: "agents", label: "Cấu hình Agent LLM", icon: Bot, tooltip: "Cấu hình đầy đủ 27 agents: provider, model, temperature, system prompt, test chat, toggle enable/disable. Full editor (không phải read-only)." },
  { id: "skills", label: "Skills", icon: Wrench, tooltip: "Claude Code skills (125) — ~/.claude/skills/ + skills-store/ project root." },
  { id: "plugins", label: "Plugins", icon: Puzzle, tooltip: "Claude Code plugins (83) từ installed_plugins.json + marketplaces." },
  { id: "mcp", label: "MCP", icon: Server, tooltip: "MCP server endpoints (28). Import từ Claude catalog hoặc GitHub." },
  { id: "commands", label: "Commands", icon: Terminal, tooltip: "Slash commands (76). ~/.claude/commands/*.md." },
  { id: "hooks", label: "Hooks", icon: Zap, tooltip: "Agent lifecycle hooks (16). PreToolUse, PostToolUse, Stop, SessionStart, PreCompact." },
  { id: "scripts", label: "Scripts", icon: FileCode, tooltip: "Scripts (175) — .py/.bat/.sh/.ps1/.mjs/.js từ crypto-pattern-scanner + paperclip + Desktop loose." },
  { id: "subagents", label: "Subagents", icon: Bot, tooltip: "Claude Code subagents (42) — ~/.claude/agents/*.md. architect, code-reviewer, tdd-guide..." },
  { id: "rules", label: "Rules", icon: BookOpen, tooltip: "Rules (92) — ~/.claude/rules/ auto-inject (behaviors, skill-triggers, memory-flush) + common/web/python." },
  { id: "docs", label: "Docs", icon: FileText, tooltip: "Reference docs (6) — ~/.claude/docs/ (task-routing, content-safety...)." },
  { id: "edge_functions", label: "Edge Fns", icon: CloudCog, tooltip: "Supabase Edge Functions (68) — supabase/functions/* với verify_jwt + category tự detect." },
  { id: "memory_files", label: "Memory Files", icon: FolderOpen, tooltip: "Memory files (413) — today.md, patterns.md, reports/, decisions/, sops/, agents/*/daily. Browse + search." },
  { id: "training", label: "Training", icon: GraduationCap, tooltip: "Training enrollments — agent training progress và spaced repetition lessons." },
  { id: "calendar", label: "Content Cal", icon: CalendarDays, tooltip: "Content calendar — cc_calendar_events. Lịch post sắp tới theo schedule." },
  { id: "email", label: "Email Camp", icon: Mail, tooltip: "Email campaigns — cc_email_campaigns + cc_email_sends. Active + scheduled." },
  { id: "shopify", label: "Shopify", icon: ShoppingBag, tooltip: "Shopify products (73) SSOT pricing catalog + variants + orders." },
  { id: "channels", label: "Channels", icon: Radio, tooltip: "Kênh chat (Zalo, Facebook, Email, Push). Merge từ /GEM/config cũ." },
  { id: "system", label: "System", icon: Cog, tooltip: "System dashboard: full stats (15 registries), Cron Registry, PM2, database." }
];
function Tip({ children, text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { className: "max-w-xs", children: text })
  ] });
}
async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}
async function deleteItem(path) {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
}
async function toggleEnabled(path, enabled) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled })
  });
  if (!res.ok) throw new Error((await res.json()).error || "Toggle failed");
}
function GenericListView({
  title,
  fetchPath,
  entityPath,
  idField,
  columns,
  onImport,
  importHint,
  queryKey,
  rowActions,
  onRowClick
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const idKey = idField || "id";
  const query = useQuery({
    queryKey: ["registry", queryKey],
    queryFn: () => fetchJson(fetchPath, []),
    refetchInterval: 15e3
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteItem(`${entityPath}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registry", queryKey] });
      pushToast({ title: "🗑️ Đã xóa", tone: "success" });
    },
    onError: (err) => pushToast({ title: "Xóa thất bại", body: err.message, tone: "error" })
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => toggleEnabled(`${entityPath}/${id}`, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", queryKey] })
  });
  const items = query.data || [];
  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      pushToast({ title: "📋 Đã copy JSON", tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", tone: "error" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: query.isLoading ? "Đang tải..." : `${items.length} items` }),
        query.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin text-muted-foreground" })
      ] }),
      onImport && /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: importHint || "Import từ GitHub repo (public only)", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onImport,
          className: "px-3 py-1.5 text-xs bg-primary/10 border border-primary text-primary rounded-md hover:bg-primary/20 flex items-center gap-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Github, { className: "size-3.5" }),
            "Import GitHub"
          ]
        }
      ) })
    ] }),
    items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg", children: [
      "Chưa có item nào. ",
      onImport && 'Bấm "Import GitHub" để thêm.'
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 font-semibold", style: { width: c.width }, children: c.header }, c.field)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-3 py-2 font-semibold", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          className: `border-t border-border hover:bg-accent/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`,
          onClick: () => onRowClick?.(item),
          children: [
            columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-foreground", onClick: (e) => {
              if (c.field === "enabled" || c.field === "source_locator" && item[c.field]?.startsWith("http")) {
                e.stopPropagation();
              }
            }, children: c.field === "enabled" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: item[c.field] ? "Click để tắt" : "Click để bật", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  toggleMutation.mutate({ id: item[idKey], enabled: !item[c.field] });
                },
                children: item[c.field] ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-4 text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-4 text-muted-foreground" })
              }
            ) }) : c.field === "source_locator" && item[c.field]?.startsWith("http") ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: item[c.field],
                target: "_blank",
                rel: "noopener noreferrer",
                onClick: (e) => e.stopPropagation(),
                className: "inline-flex items-center gap-1 text-primary hover:underline font-mono text-[10px]",
                children: [
                  item[c.field].replace("https://github.com/", ""),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" })
                ]
              }
            ) : c.field === "trust_level" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `px-1.5 py-0.5 text-[10px] rounded uppercase font-semibold ${item[c.field] === "official" ? "bg-green-500/20 text-green-400" : item[c.field] === "verified" ? "bg-blue-500/20 text-blue-400" : item[c.field] === "community" ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}`,
                children: item[c.field] || "unknown"
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate max-w-xs block", children: c.field.endsWith("_at") && item[c.field] ? new Date(item[c.field]).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : item[c.field] ?? "—" }) }, c.field)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-1", children: [
              rowActions?.filter((a) => !a.show || a.show(item)).map((action, i) => {
                const Icon = action.icon;
                const toneClass = action.tone === "destructive" ? "text-muted-foreground hover:text-destructive" : action.tone === "primary" ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground";
                return /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: action.label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    },
                    className: `p-1 ${toneClass}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" })
                  }
                ) }, i);
              }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy JSON vào clipboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    handleCopy(item);
                  },
                  className: "p-1 text-muted-foreground hover:text-foreground",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Xóa item (cả DB và disk nếu có)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    if (confirm(`Xóa ${item.name || item[idKey]}?`)) {
                      deleteMutation.mutate(item[idKey]);
                    }
                  },
                  className: "p-1 text-muted-foreground hover:text-destructive",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
                }
              ) })
            ] }) })
          ]
        },
        item[idKey]
      )) })
    ] }) })
  ] });
}
function ListWithDrawer({
  rowActions,
  drawerActions,
  ...listProps
}) {
  const [selected, setSelected] = reactExports.useState(null);
  const wiredActions = rowActions?.map(
    (a) => a.icon === Eye ? { ...a, onClick: (row) => setSelected(row) } : a
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GenericListView,
      {
        ...listProps,
        rowActions: wiredActions,
        onRowClick: (row) => setSelected(row)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      EntityDetailDrawer,
      {
        open: !!selected,
        onClose: () => setSelected(null),
        entity: selected,
        entityPath: listProps.entityPath,
        idField: listProps.idField,
        queryKey: listProps.queryKey,
        actions: drawerActions || rowActions
      }
    )
  ] });
}
function openFileInBrowser(diskPath, pushToast) {
  if (!diskPath) {
    pushToast?.({ title: "Item này không có disk_path", tone: "error" });
    return;
  }
  navigator.clipboard.writeText(diskPath).then(() => pushToast?.({ title: "📋 Đã copy path", body: diskPath, tone: "success" })).catch(() => pushToast?.({ title: "Copy thất bại", tone: "error" }));
}
function GithubImportDialog({
  open,
  onClose,
  entity,
  onSuccess
}) {
  const { pushToast } = useToast();
  const [url, setUrl] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  if (!open) return null;
  const handleImport = async () => {
    if (!url.trim() || !url.includes("github.com/")) {
      pushToast({ title: "URL không hợp lệ", body: "Phải là https://github.com/owner/repo", tone: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/registry/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, url: url.trim(), name: name.trim() || void 0 })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      pushToast({
        title: "✅ Import thành công",
        body: `${result.entity}: ${result.name}`,
        tone: "success"
      });
      onSuccess();
      onClose();
      setUrl("");
      setName("");
    } catch (err) {
      pushToast({ title: "Import thất bại", body: err.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-border flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-base font-semibold text-foreground flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Github, { className: "size-4" }),
                "Import từ GitHub — ",
                entity
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-muted-foreground hover:text-foreground p-1", children: "✕" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-semibold text-muted-foreground uppercase", children: [
                  "GitHub URL ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: url,
                    onChange: (e) => setUrl(e.target.value),
                    placeholder: "https://github.com/owner/repo",
                    className: "mt-1 w-full px-3 py-2 bg-background border border-input rounded text-sm text-foreground focus:border-ring outline-none",
                    autoFocus: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "Chỉ support public repos. Clone shallow (--depth 1) để nhanh + tiết kiệm disk." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold text-muted-foreground uppercase", children: "Custom name (optional)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: name,
                    onChange: (e) => setName(e.target.value),
                    placeholder: "Override tên tự detect",
                    className: "mt-1 w-full px-3 py-2 bg-background border border-input rounded text-sm text-foreground focus:border-ring outline-none"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground border border-border rounded p-2 bg-muted/30", children: [
                "ℹ️ Safety: 60s timeout, spawnHidden (không orphan cmd.exe), auto-detect entity type từ file structure (SKILL.md / .mcp.json / package.json / commands-*). Sau khi import, file nằm ở ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("code", { className: "font-mono", children: [
                  "~/.claude/",
                  "{skills|mcp-configs|plugins|...}",
                  "/name/"
                ] }),
                "."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-border flex justify-end gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground", children: "Hủy" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: handleImport,
                  disabled: loading || !url.trim(),
                  className: "px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded font-medium disabled:opacity-50 flex items-center gap-2",
                  children: [
                    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Github, { className: "size-3.5" }),
                    loading ? "Đang clone..." : "Import"
                  ]
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function AgentsSubTab() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AgentListPage, {});
}
function SkillsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + xem SKILL.md", onClick: () => {
    } },
    // drawer auto-opens via row click
    {
      icon: ExternalLink,
      label: "Mở source GitHub",
      show: (r) => r.source_locator?.startsWith("http"),
      onClick: (r) => {
        window.open(r.source_locator, "_blank");
      }
    },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn file",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "🔧 Skills",
        fetchPath: "/api/registry/skills?limit=2000",
        entityPath: "/api/registry/skills",
        queryKey: "skills",
        onImport: () => setImportOpen(true),
        importHint: "Import skill từ GitHub repo (phải có SKILL.md)",
        columns: [
          { header: "Name", field: "name" },
          { header: "Description", field: "description" },
          { header: "Source", field: "source_locator" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "skills",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "skills"] })
      }
    )
  ] });
}
function PluginsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + manifest", onClick: () => {
    } },
    {
      icon: ExternalLink,
      label: "Mở source repo",
      show: (r) => r.source_locator?.startsWith("http"),
      onClick: (r) => {
        window.open(r.source_locator, "_blank");
      }
    },
    {
      icon: FolderOpen,
      label: "Mở thư mục plugin",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "🧩 Plugins",
        fetchPath: "/api/registry/plugins?limit=2000",
        entityPath: "/api/registry/plugins",
        queryKey: "plugins",
        onImport: () => setImportOpen(true),
        importHint: "Import Claude Code plugin từ GitHub (package.json / manifest.json)",
        columns: [
          { header: "Name", field: "name" },
          { header: "Type", field: "plugin_type", width: "120px" },
          { header: "Version", field: "version", width: "100px" },
          { header: "Source", field: "source_locator" },
          { header: "Trust", field: "trust_level", width: "100px" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "plugins",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "plugins"] })
      }
    )
  ] });
}
function MCPSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const testMcp = async (row) => {
    pushToast({ title: `🧪 Test MCP ${row.name}...`, tone: "info" });
    try {
      const res = await fetch(`/api/registry/mcp/${row.id}/test`, { method: "POST" });
      const result = await res.json();
      pushToast({
        title: result.ok ? `✅ ${row.name} OK` : `❌ ${row.name} failed`,
        body: result.stdout?.slice(0, 100) || result.error || `exit ${result.exit_code}`,
        tone: result.ok ? "success" : "error"
      });
    } catch (err) {
      pushToast({ title: "Test thất bại", body: err.message, tone: "error" });
    }
  };
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + config_json", onClick: () => {
    } },
    { icon: FlaskConical, label: "Test MCP server (probe --version)", tone: "primary", onClick: testMcp },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn config",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "🖥️ MCP Servers",
        fetchPath: "/api/registry/mcp?limit=2000",
        entityPath: "/api/registry/mcp",
        queryKey: "mcp",
        onImport: () => setImportOpen(true),
        importHint: "Import MCP server từ GitHub repo (phải có .mcp.json hoặc package.json với mcp field)",
        columns: [
          { header: "Name", field: "name" },
          { header: "Description", field: "description" },
          { header: "Tools", field: "tool_count", width: "80px" },
          { header: "Source", field: "source_locator" },
          { header: "Trust", field: "trust_level", width: "100px" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "mcp",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "mcp"] })
      }
    )
  ] });
}
function CommandsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + preview command body", onClick: () => {
    } },
    {
      icon: FolderOpen,
      label: "Mở file .md trên disk",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "📟 Slash Commands",
        fetchPath: "/api/registry/commands?limit=2000",
        entityPath: "/api/registry/commands",
        queryKey: "commands",
        onImport: () => setImportOpen(true),
        importHint: "Import command bundle từ GitHub (phải có commands/ folder)",
        columns: [
          { header: "Name", field: "name" },
          { header: "Scope", field: "scope", width: "100px" },
          { header: "Agent", field: "agent_slug", width: "150px" },
          { header: "Source", field: "source_locator" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "commands",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "commands"] })
      }
    )
  ] });
}
function HooksSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết hook", onClick: () => {
    } },
    {
      icon: FolderOpen,
      label: "Mở script hook trên disk",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "⚡ Agent Hooks",
        fetchPath: "/api/registry/hooks?limit=2000",
        entityPath: "/api/registry/hooks",
        queryKey: "hooks",
        onImport: () => setImportOpen(true),
        importHint: "Import hooks từ GitHub (settings.json với hooks field)",
        columns: [
          { header: "Event", field: "event", width: "140px" },
          { header: "Matcher", field: "matcher", width: "140px" },
          { header: "Command", field: "command" },
          { header: "Scope", field: "scope", width: "100px" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "hooks",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "hooks"] })
      }
    )
  ] });
}
function ScriptsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const runScript = async (row) => {
    if (!confirm(`Chạy script "${row.name}" ngay bây giờ?

Path: ${row.disk_path || row.script_root + "/" + row.file_name}`)) return;
    pushToast({ title: `▶️ Running ${row.name}...`, tone: "info" });
    try {
      const res = await fetch(`/api/registry/scripts/${row.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const result = await res.json();
      pushToast({
        title: result.ok ? `✅ ${row.name} done (exit ${result.exit_code})` : `❌ ${row.name} failed (exit ${result.exit_code})`,
        body: (result.stdout || result.stderr || "").slice(-200),
        tone: result.ok ? "success" : "error"
      });
      qc.invalidateQueries({ queryKey: ["registry", "scripts"] });
    } catch (err) {
      pushToast({ title: "Execute thất bại", body: err.message, tone: "error" });
    }
  };
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + xem source", onClick: () => {
    } },
    { icon: Play, label: "Chạy script ngay (spawnHidden, 120s timeout)", tone: "primary", onClick: runScript },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn file",
      show: (r) => !!(r.disk_path || r.script_root && r.file_name),
      onClick: (r) => openFileInBrowser(r.disk_path || `${r.script_root}/${r.file_name}`, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "📜 Scripts",
        fetchPath: "/api/registry/scripts?limit=2000",
        entityPath: "/api/registry/scripts",
        queryKey: "scripts",
        onImport: () => setImportOpen(true),
        importHint: "Import script bundle từ GitHub repo",
        columns: [
          { header: "Name", field: "name" },
          { header: "Language", field: "language", width: "100px" },
          { header: "Root", field: "script_root", width: "180px" },
          { header: "Description", field: "description" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "scripts",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "scripts"] })
      }
    )
  ] });
}
function SubagentsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + xem agent .md", onClick: () => {
    } },
    {
      icon: FlaskConical,
      label: "Test trong Agent Test page",
      tone: "primary",
      onClick: (r) => navigate(`/GEM/agents-config/${r.name}/test`)
    },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn file",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "🤖 Claude Subagents",
        fetchPath: "/api/registry/subagents?limit=2000",
        entityPath: "/api/registry/subagents",
        queryKey: "subagents",
        onImport: () => setImportOpen(true),
        importHint: "Import subagent bundle từ GitHub",
        columns: [
          { header: "Name", field: "name" },
          { header: "Description", field: "description" },
          { header: "Model", field: "model", width: "140px" },
          { header: "Category", field: "category", width: "140px" },
          { header: "Enabled", field: "enabled", width: "80px" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "subagents",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "subagents"] })
      }
    )
  ] });
}
function RulesSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + read full rule", onClick: () => {
    } },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn rule",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "📖 Rules — auto-inject behaviors",
        fetchPath: "/api/registry/reference-docs?limit=2000",
        entityPath: "/api/registry/reference-docs",
        queryKey: "rules",
        onImport: () => setImportOpen(true),
        importHint: "Import rule bundle từ GitHub repo",
        columns: [
          { header: "Name", field: "name" },
          { header: "Category", field: "category", width: "160px" },
          { header: "Auto-loaded", field: "auto_loaded", width: "100px" },
          { header: "Words", field: "word_count", width: "80px" },
          { header: "Description", field: "description" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "rules",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "rules"] })
      }
    )
  ] });
}
function DocsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + đọc full doc", onClick: () => {
    } },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn doc",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "📄 Reference Docs",
        fetchPath: "/api/registry/reference-docs?limit=2000",
        entityPath: "/api/registry/reference-docs",
        queryKey: "docs",
        onImport: () => setImportOpen(true),
        importHint: "Import docs từ GitHub repo",
        columns: [
          { header: "Name", field: "name" },
          { header: "Type", field: "doc_type", width: "80px" },
          { header: "Category", field: "category", width: "160px" },
          { header: "Words", field: "word_count", width: "80px" },
          { header: "Description", field: "description" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "docs",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "docs"] })
      }
    )
  ] });
}
function EdgeFunctionsSubTab() {
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + xem source code", onClick: () => {
    } },
    {
      icon: ExternalLink,
      label: "Mở Supabase Dashboard (Edge Functions)",
      onClick: (r) => {
        window.open(`https://supabase.com/dashboard/project/pgfkbcnzqozzkohwbgbk/functions/${r.name}`, "_blank");
      }
    },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn source",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ListWithDrawer,
      {
        title: "☁️ Supabase Edge Functions",
        fetchPath: "/api/registry/edge-functions?limit=2000",
        entityPath: "/api/registry/edge-functions",
        queryKey: "edge_functions",
        onImport: () => setImportOpen(true),
        importHint: "Import edge function bundle từ GitHub",
        columns: [
          { header: "Name", field: "name" },
          { header: "Category", field: "category", width: "120px" },
          { header: "Verify JWT", field: "verify_jwt", width: "100px" },
          { header: "Lines", field: "lines_of_code", width: "80px" },
          { header: "Description", field: "description" }
        ],
        rowActions
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GithubImportDialog,
      {
        open: importOpen,
        onClose: () => setImportOpen(false),
        entity: "edge_functions",
        onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", "edge_functions"] })
      }
    )
  ] });
}
function MemoryFilesSubTab() {
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + đọc nội dung", onClick: () => {
    } },
    {
      icon: FolderOpen,
      label: "Copy đường dẫn file",
      show: (r) => !!r.disk_path,
      onClick: (r) => openFileInBrowser(r.disk_path, pushToast)
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ListWithDrawer,
    {
      title: "📁 Memory Files",
      fetchPath: "/api/registry/memory-files?limit=5000",
      entityPath: "/api/registry/memory-files",
      queryKey: "memory_files",
      columns: [
        { header: "Name", field: "name" },
        { header: "Type", field: "file_type", width: "100px" },
        { header: "Category", field: "category", width: "200px" },
        { header: "Lines", field: "line_count", width: "80px" },
        { header: "Description", field: "description" }
      ],
      rowActions
    }
  );
}
function TrainingSubTab() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết enrollment", onClick: () => {
    } },
    {
      icon: ExternalLink,
      label: "Mở Phòng Training",
      tone: "primary",
      onClick: () => navigate("/GEM/training")
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ListWithDrawer,
    {
      title: "🎓 Training Enrollments",
      fetchPath: "/api/registry/training/enrollments",
      entityPath: "/api/registry/training/enrollments",
      queryKey: "training_enrollments",
      columns: [
        { header: "Agent", field: "agent_slug", width: "160px" },
        { header: "Topic", field: "topic" },
        { header: "Status", field: "status", width: "100px" },
        { header: "Progress", field: "progress_pct", width: "80px" },
        { header: "Created", field: "created_at", width: "160px" }
      ],
      rowActions
    }
  );
}
function CalendarSubTab() {
  const navigate = useNavigate();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết event", onClick: () => {
    } },
    {
      icon: ExternalLink,
      label: "Mở Lịch Nội Dung",
      tone: "primary",
      onClick: () => navigate("/GEM/cc/calendar")
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ListWithDrawer,
    {
      title: "📅 Content Calendar",
      fetchPath: "/api/registry/content-calendar?limit=200",
      entityPath: "/api/registry/content-calendar",
      queryKey: "content_calendar",
      columns: [
        { header: "Title", field: "title" },
        { header: "Platform", field: "platform", width: "120px" },
        { header: "Status", field: "status", width: "100px" },
        { header: "Scheduled", field: "scheduled_at", width: "160px" },
        { header: "Account", field: "account", width: "140px" }
      ],
      rowActions
    }
  );
}
function EmailCampaignsSubTab() {
  const navigate = useNavigate();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết campaign", onClick: () => {
    } },
    {
      icon: Pencil,
      label: "Mở chi tiết edit (CCEmailCampaignDetail)",
      tone: "primary",
      onClick: (r) => navigate(`/GEM/cc/email/${r.id}`)
    },
    {
      icon: ExternalLink,
      label: "Mở danh sách CRM Email Campaigns",
      onClick: () => navigate("/GEM/crm/campaigns")
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ListWithDrawer,
    {
      title: "✉️ Email Campaigns",
      fetchPath: "/api/registry/email-campaigns?limit=500",
      entityPath: "/api/registry/email-campaigns",
      queryKey: "email_campaigns",
      columns: [
        { header: "Name", field: "name" },
        { header: "Subject", field: "subject" },
        { header: "Status", field: "status", width: "100px" },
        { header: "Segment", field: "segment", width: "160px" },
        { header: "Created", field: "created_at", width: "160px" }
      ],
      rowActions
    }
  );
}
function ShopifyProductsSubTab() {
  const navigate = useNavigate();
  const rowActions = [
    { icon: Eye, label: "Mở chi tiết + variants", onClick: () => {
    } },
    {
      icon: ExternalLink,
      label: "Mở Shopify Admin (external)",
      tone: "primary",
      onClick: (r) => {
        const handle = r.handle || r.shopify_id;
        if (handle) window.open(`https://admin.shopify.com/store/gemral/products/${handle}`, "_blank");
      }
    },
    {
      icon: ShoppingBag,
      label: "Xem orders của product này",
      onClick: () => navigate("/GEM/crm/orders")
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ListWithDrawer,
    {
      title: "🛍 Shopify Products (SSOT)",
      fetchPath: "/api/registry/shopify-products?limit=500",
      entityPath: "/api/registry/shopify-products",
      queryKey: "shopify_products",
      columns: [
        { header: "Title", field: "title" },
        { header: "Type", field: "product_type", width: "140px" },
        { header: "Vendor", field: "vendor", width: "140px" },
        { header: "Status", field: "status", width: "100px" },
        { header: "Updated", field: "updated_at", width: "160px" }
      ],
      rowActions
    }
  );
}
function ChannelsSubTab() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: "📡 Channels" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Embed of /GEM/channels — full overview + settings" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ChannelsOverview, {})
  ] });
}
function SystemSubTab() {
  const { data: cronStats } = useQuery({
    queryKey: ["registry", "cron-summary"],
    queryFn: () => fetchJson("/api/registry/crons", []),
    refetchInterval: 3e4
  });
  const { data: allStats } = useQuery({
    queryKey: ["registry", "stats-all"],
    queryFn: () => fetchJson(
      "/api/registry/stats/all",
      {
        mcp: 0,
        commands: 0,
        hooks: 0,
        plugins: 0,
        skills: 0,
        scripts: 0,
        subagents: 0,
        rules: 0,
        docs: 0,
        edge_functions: 0,
        memory_files: 0,
        training_enrollments: 0,
        content_calendar: 0,
        email_campaigns: 0,
        shopify_products: 0
      }
    ),
    refetchInterval: 3e4
  });
  const crons = cronStats || [];
  const enabledCrons = crons.filter((c) => c.enabled).length;
  const disabledCrons = crons.length - enabledCrons;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Cog, { className: "size-4 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: "System Config" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Sẽ merge toàn bộ setting từ ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono", children: "/GEM/config" }),
          " Hệ thống tab vào đây."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href: "/GEM/config",
            className: "inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" }),
              "Mở trang config cũ"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-4 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Cron Registry" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Tất cả cron/heartbeat/scheduled jobs registered trong cron_registry table. Click row để xem chi tiết execution spec + copy.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3 text-muted-foreground" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Tổng số jobs:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: crons.length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Active:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-green-500", children: enabledCrons })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Disabled:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-muted-foreground", children: disabledCrons })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-lg p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Registry Totals (15 entity types)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Tổng số resources đã đăng ký trong Registry Marketplace. Click từng stat card để mở sub-tab tương ứng. Auto-refresh mỗi 30 giây.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3 text-muted-foreground" }) })
      ] }),
      (() => {
        const statCards = [
          { key: "mcp", label: "MCP", tip: "MCP server endpoints (Model Context Protocol). Từ ~/.claude/mcp-configs/ + cloned repos." },
          { key: "commands", label: "Commands", tip: "Slash commands từ ~/.claude/commands/*.md." },
          { key: "hooks", label: "Hooks", tip: "Agent lifecycle hooks từ ~/.claude/hooks/*.json." },
          { key: "plugins", label: "Plugins", tip: "Claude Code plugins từ installed_plugins.json + cache/{marketplace}/." },
          { key: "skills", label: "Skills", tip: "Claude Code skills từ ~/.claude/skills/ + project skills-store/." },
          { key: "scripts", label: "Scripts", tip: ".py/.bat/.sh/.ps1/.mjs/.js từ crypto-pattern-scanner + paperclip + Desktop." },
          { key: "subagents", label: "Subagents", tip: "Claude CLI subagents từ ~/.claude/agents/*.md (architect, code-reviewer...)." },
          { key: "rules", label: "Rules", tip: "Auto-inject rules từ ~/.claude/rules/ (behaviors, skill-triggers, memory-flush, common/web/python...)." },
          { key: "docs", label: "Docs", tip: "Reference docs từ ~/.claude/docs/ (task-routing, content-safety...)." },
          { key: "edge_functions", label: "Edge Fns", tip: "Supabase Edge Functions từ supabase/functions/*. Auto-detect category + verify_jwt." },
          { key: "memory_files", label: "Memory", tip: "Project memory/ — today.md, patterns.md, reports/, decisions/, sops/, agents/*/daily." },
          { key: "training_enrollments", label: "Training", tip: "Agent training enrollments + spaced repetition lessons (training_enrollments table)." },
          { key: "content_calendar", label: "Calendar", tip: "Content calendar events (cc_calendar_events) — scheduled posts sắp tới." },
          { key: "email_campaigns", label: "Email", tip: "Email campaigns (cc_email_campaigns) — active + scheduled." },
          { key: "shopify_products", label: "Shopify", tip: "Shopify products SSOT pricing catalog." }
        ];
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-5 gap-2 text-xs", children: statCards.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: c.tip, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-2 bg-muted rounded cursor-help", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-foreground", children: allStats?.[c.key] ?? 0 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: c.label })
        ] }) }, c.key)) });
      })()
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CronRegistryListView, {})
  ] });
}
const CATEGORY_META = [
  { key: "content_biweekly", label: "Content Biweekly Pipeline", emoji: "🔄", hint: "4-step sequential: Plan → Generate → Queue → Schedule (Meta BS). Chạy T2 hai tuần/lần." },
  { key: "content_daily", label: "Daily Content", emoji: "📅", hint: "Daily Facebook posting + push notifications + blog. Runs every day." },
  { key: "email", label: "Email Automation", emoji: "✉️", hint: "Drip sequences, newsletter schedulers, welcome flows." },
  { key: "crm", label: "CRM & Follow-up", emoji: "📞", hint: "Follow-up queues, lead nurturing, customer lifecycle jobs." },
  { key: "channel", label: "Channel Ops", emoji: "📨", hint: "Chat channel ops — reconnect, cleanup, agent session pings." },
  { key: "zalo", label: "Zalo", emoji: "💬", hint: "Zalo Personal webhook / session maintenance jobs." },
  { key: "trading", label: "Trading Engine", emoji: "📈", hint: "Paper trade monitors, scanner jobs, market data sync." },
  { key: "analytics", label: "Analytics", emoji: "📊", hint: "Data pipelines, metrics aggregation, weekly reports." },
  { key: "sync", label: "Sync & Integrations", emoji: "🔗", hint: "Notion↔Supabase poll, external API sync, cross-system bridges." },
  { key: "audit_monitoring", label: "Audit & Monitoring", emoji: "🩺", hint: "Health checks, pipeline audits." },
  { key: "monitoring", label: "Monitoring (legacy)", emoji: "🛰️", hint: "Legacy monitoring entries — candidates for migration to audit_monitoring." },
  { key: "memory_maintenance", label: "Memory Maintenance", emoji: "🧠", hint: "Daily memory reset + weekly decision journal compress." },
  { key: "system", label: "System", emoji: "⚙️", hint: "System-level cron: backups, cleanup, housekeeping." }
];
function priorityWeight(p) {
  switch ((p || "normal").toLowerCase()) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "normal":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}
function StatusDotMini({ s }) {
  const cls = (() => {
    switch ((s || "").toLowerCase()) {
      case "success":
        return "bg-emerald-500";
      case "running":
        return "bg-blue-500 animate-pulse";
      case "failed":
      case "error":
        return "bg-red-500";
      case "timeout":
        return "bg-orange-500";
      default:
        return "bg-muted-foreground/40";
    }
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block size-1.5 rounded-full ${cls}` });
}
function CronRegistryListView() {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const [collapsed, setCollapsed] = reactExports.useState({});
  const { data: rowsData } = useQuery({
    queryKey: ["registry", "crons", "grouped"],
    queryFn: async () => {
      const r = await fetch("/api/registry/crons");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j.items ?? j;
    },
    staleTime: 15e3,
    refetchInterval: 3e4
  });
  const groups = reactExports.useMemo(() => {
    const rows = rowsData ?? [];
    const bucket = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const key = r.category && CATEGORY_META.some((c) => c.key === r.category) ? r.category : "other";
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(r);
    }
    for (const [, arr] of bucket) {
      arr.sort((a, b) => {
        const pa = priorityWeight(a.priority);
        const pb = priorityWeight(b.priority);
        if (pa !== pb) return pa - pb;
        const sa = a.execution_spec?.flow_step ?? 999;
        const sb = b.execution_spec?.flow_step ?? 999;
        if (sa !== sb) return sa - sb;
        return (a.display_name || "").localeCompare(b.display_name || "");
      });
    }
    const ordered = CATEGORY_META.filter((m) => bucket.has(m.key)).map((m) => ({ ...m, rows: bucket.get(m.key) }));
    if (bucket.has("other")) {
      ordered.push({ key: "other", label: "Other / Uncategorized", emoji: "📦", hint: "Cron entries chưa có category.", rows: bucket.get("other") });
    }
    return ordered;
  }, [rowsData]);
  const runNow = async (row, e) => {
    e.stopPropagation();
    if (!confirm(`Chạy cron "${row.display_name}" NGAY?

Schedule: ${row.cron_humanized || row.cron_expression}`)) return;
    pushToast({ title: `▶️ ${row.display_name}...`, tone: "info" });
    try {
      const r = await fetch(`/api/registry/crons/${row.id}/execute`, { method: "POST" });
      const j = await r.json();
      pushToast({
        title: j.status === "success" ? `✅ Done` : `❌ Failed`,
        body: (j.output || "").slice(-200),
        tone: j.status === "success" ? "success" : "error"
      });
      qc.invalidateQueries({ queryKey: ["registry", "crons"] });
    } catch (err) {
      pushToast({ title: "Trigger thất bại", body: err.message, tone: "error" });
    }
  };
  const toggle = async (row, enable, e) => {
    e.stopPropagation();
    if (!confirm(`${enable ? "Bật" : "Tắt"} "${row.display_name}"?`)) return;
    try {
      const r = await fetch(`/api/registry/crons/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable })
      });
      if (!r.ok) throw new Error((await r.json()).error || "Toggle failed");
      pushToast({ title: enable ? `✅ Bật ${row.display_name}` : `⏸ Tắt ${row.display_name}`, tone: "success" });
      qc.invalidateQueries({ queryKey: ["registry", "crons"] });
    } catch (err) {
      pushToast({ title: "Toggle thất bại", body: err.message, tone: "error" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-lg p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-4 text-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground", children: "⏰ Cron Registry — Tất cả scheduled jobs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground/60", children: "(pg_cron + node_timer + schtasks, grouped by category, click row → log viewer)" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      groups.map((g) => {
        const isCollapsed = collapsed[g.key];
        const enabledCount = g.rows.filter((r) => r.enabled).length;
        const failedCount = g.rows.filter((r) => r.last_run_status === "failed").length;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] })),
              className: "w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/40 hover:bg-muted/70 rounded-t-md",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `transition-transform ${isCollapsed ? "" : "rotate-90"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5 text-muted-foreground/60" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base", children: g.emoji }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-foreground", children: g.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
                  "(",
                  g.rows.length,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-emerald-500 ml-2", children: [
                  enabledCount,
                  " active"
                ] }),
                failedCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-red-500", children: [
                  "· ",
                  failedCount,
                  " failed"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] text-muted-foreground/60 italic max-w-md truncate", children: g.hint })
              ]
            }
          ),
          !isCollapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border", children: g.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onClick: () => setSelectedId(row.id),
              className: "px-3 py-2 flex items-center gap-3 text-sm hover:bg-accent/30 cursor-pointer group",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDotMini, { s: row.last_run_status }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                    row.execution_spec?.flow_step && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded", children: [
                      "#",
                      row.execution_spec.flow_step
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `font-medium ${row.enabled ? "text-foreground" : "text-muted-foreground/60 line-through"}`, children: row.display_name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground/60 truncate", children: row.cron_humanized || row.cron_expression }),
                    row.priority && row.priority !== "normal" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-1 py-0.5 rounded border ${row.priority === "critical" ? "bg-red-500/10 text-red-500 border-red-500/30" : row.priority === "high" ? "bg-orange-500/10 text-orange-600 border-orange-500/30" : "bg-muted text-muted-foreground/70 border-border"}`, children: row.priority }),
                    row.execution_spec?.silent && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground/60 border border-border", children: "silent" })
                  ] }),
                  row.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground/60 truncate mt-0.5", children: row.description })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity shrink-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => runNow(row, e),
                      className: "size-6 rounded flex items-center justify-center text-primary hover:bg-primary/10",
                      title: "Chạy ngay",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-3" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => toggle(row, !row.enabled, e),
                      className: `size-6 rounded flex items-center justify-center ${row.enabled ? "text-muted-foreground hover:bg-muted" : "text-emerald-500 hover:bg-emerald-500/10"}`,
                      title: row.enabled ? "Tắt" : "Bật",
                      children: row.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(PowerOff, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "size-3" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        setSelectedId(row.id);
                      },
                      className: "size-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted",
                      title: "Mở log viewer",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3" })
                    }
                  )
                ] })
              ]
            },
            row.id
          )) })
        ] }, g.key);
      }),
      groups.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-8 text-muted-foreground/60 text-sm", children: "Chưa có cron nào trong registry." })
    ] }),
    selectedId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      CronLogDrawer,
      {
        cronId: selectedId,
        open: true,
        onClose: () => setSelectedId(null),
        onOpenRelated: (id) => setSelectedId(id)
      }
    )
  ] });
}
function DiskSyncButton() {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [loading, setLoading] = reactExports.useState(false);
  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/registry/sync/scan", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Sync failed");
      const result = await res.json();
      const u = result.upserted || {};
      const total = Object.values(u).reduce((a, b) => a + (b || 0), 0);
      pushToast({
        title: "✅ Disk sync complete",
        body: `${total} items · skills ${u.skills || 0} · scripts ${u.scripts || 0} · plugins ${u.plugins || 0} · subagents ${u.subagents || 0} · rules ${u.rules || 0} · edge fns ${u.edge_functions || 0} · memory ${u.memory_files || 0}${result.stale_marked > 0 ? ` · ${result.stale_marked} stale disabled` : ""}`,
        tone: "success"
      });
      qc.invalidateQueries({ queryKey: ["registry"] });
    } catch (err) {
      pushToast({ title: "Disk sync failed", body: err.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Scan ~/.claude/{skills,mcp-configs,commands,hooks,plugins}/ và upsert DB. Không phải cron — chỉ chạy khi chị bấm nút hoặc lúc server start.", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: handleSync,
      disabled: loading,
      className: "px-3 py-1.5 text-xs bg-muted border border-border text-foreground rounded-md hover:border-primary hover:text-primary disabled:opacity-50 flex items-center gap-1.5",
      children: [
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "size-3.5" }),
        loading ? "Đang scan..." : "Sync from disk"
      ]
    }
  ) });
}
function RegistryMarketplaceTab() {
  const [activeSubTab, setActiveSubTab] = reactExports.useState("agents");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { delayDuration: 300, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-foreground", children: "📋 Registry Marketplace" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Central SSOT hub cho tất cả Agents, Skills, Plugins, MCP, Commands, Hooks, Channels, System. Merge từ /GEM/agents-config + /GEM/config cũ. Import từ GitHub và sync với disk.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3 text-muted-foreground" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DiskSyncButton, {}) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SortableTabBar,
      {
        storageKey: "registry-subtabs",
        tabs: SUB_TABS,
        activeTab: activeSubTab,
        onTabChange: (id) => setActiveSubTab(id),
        tipComponent: Tip
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4", children: [
      activeSubTab === "agents" && /* @__PURE__ */ jsxRuntimeExports.jsx(AgentsSubTab, {}),
      activeSubTab === "skills" && /* @__PURE__ */ jsxRuntimeExports.jsx(SkillsSubTab, {}),
      activeSubTab === "plugins" && /* @__PURE__ */ jsxRuntimeExports.jsx(PluginsSubTab, {}),
      activeSubTab === "mcp" && /* @__PURE__ */ jsxRuntimeExports.jsx(MCPSubTab, {}),
      activeSubTab === "commands" && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandsSubTab, {}),
      activeSubTab === "hooks" && /* @__PURE__ */ jsxRuntimeExports.jsx(HooksSubTab, {}),
      activeSubTab === "scripts" && /* @__PURE__ */ jsxRuntimeExports.jsx(ScriptsSubTab, {}),
      activeSubTab === "subagents" && /* @__PURE__ */ jsxRuntimeExports.jsx(SubagentsSubTab, {}),
      activeSubTab === "rules" && /* @__PURE__ */ jsxRuntimeExports.jsx(RulesSubTab, {}),
      activeSubTab === "docs" && /* @__PURE__ */ jsxRuntimeExports.jsx(DocsSubTab, {}),
      activeSubTab === "edge_functions" && /* @__PURE__ */ jsxRuntimeExports.jsx(EdgeFunctionsSubTab, {}),
      activeSubTab === "memory_files" && /* @__PURE__ */ jsxRuntimeExports.jsx(MemoryFilesSubTab, {}),
      activeSubTab === "training" && /* @__PURE__ */ jsxRuntimeExports.jsx(TrainingSubTab, {}),
      activeSubTab === "calendar" && /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarSubTab, {}),
      activeSubTab === "email" && /* @__PURE__ */ jsxRuntimeExports.jsx(EmailCampaignsSubTab, {}),
      activeSubTab === "shopify" && /* @__PURE__ */ jsxRuntimeExports.jsx(ShopifyProductsSubTab, {}),
      activeSubTab === "channels" && /* @__PURE__ */ jsxRuntimeExports.jsx(ChannelsSubTab, {}),
      activeSubTab === "system" && /* @__PURE__ */ jsxRuntimeExports.jsx(SystemSubTab, {})
    ] })
  ] }) });
}

export { RegistryMarketplaceTab as default };
