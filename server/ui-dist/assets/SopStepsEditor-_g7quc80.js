import { r as reactExports, j as jsxRuntimeExports, X, bj as ChevronDown, y as Search, ap as Tooltip, aq as TooltipTrigger, aB as Plus, ar as TooltipContent, ag as useQuery, as as useToast, K as ChevronRight, cB as Bot, bt as User, k as LoaderCircle, n as Send, af as Trash2, b5 as useQueryClient, c3 as useSensors, c4 as useSensor, cb as PointerSensor, bd as CircleAlert, c7 as DndContext, c8 as closestCenter, c9 as SortableContext, ca as verticalListSortingStrategy, c5 as arrayMove, cc as useSortable, cd as CSS, c6 as GripVertical, ac as Copy } from './index-DY_auHjr.js';

function RegistryCombobox(props) {
  const { options, placeholder = "Chọn...", disabled = false, onRegisterNew, registerHint, isLoading } = props;
  const [open, setOpen] = reactExports.useState(false);
  const [search, setSearch] = reactExports.useState("");
  const rootRef = reactExports.useRef(null);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  reactExports.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setSearch("");
    }
  }, [open]);
  const filtered = search.trim() ? options.filter(
    (o) => o.value.toLowerCase().includes(search.toLowerCase()) || o.label.toLowerCase().includes(search.toLowerCase()) || (o.description || "").toLowerCase().includes(search.toLowerCase()) || (o.category || "").toLowerCase().includes(search.toLowerCase())
  ) : options;
  const grouped = {};
  for (const o of filtered) {
    const cat = o.category || "";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(o);
  }
  const categories = Object.keys(grouped).sort();
  const isSelected = (v) => props.multi ? props.value.includes(v) : props.value === v;
  const handlePick = (v) => {
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
  const singleLabel = !props.multi ? options.find((o) => o.value === props.value)?.label || (props.value || "") : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: rootRef, className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        disabled,
        onClick: () => setOpen((v) => !v),
        className: "w-full flex items-center gap-2 px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none text-left text-xs disabled:opacity-50",
        children: [
          props.multi ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-wrap gap-1", children: props.value.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: placeholder }) : props.value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]",
                children: [
                  opt?.label || v,
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        props.onChange(
                          props.value.filter((x) => x !== v)
                        );
                      },
                      className: "hover:text-destructive",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
                    }
                  )
                ]
              },
              v
            );
          }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex-1 truncate ${!props.value ? "text-muted-foreground" : ""}`, children: singleLabel || placeholder }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3 text-muted-foreground" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-xl z-50 max-h-80 overflow-hidden flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2 border-b border-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-3 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            type: "text",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Tìm kiếm...",
            className: "flex-1 bg-transparent outline-none text-xs text-foreground"
          }
        ),
        onRegisterNew && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => {
                onRegisterNew();
                setOpen(false);
              },
              className: "p-1 text-primary hover:bg-primary/10 rounded",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { className: "max-w-xs", children: registerHint || "Thêm option mới vào Registry Marketplace" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-y-auto flex-1", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 text-xs text-muted-foreground text-center", children: "Đang tải..." }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 text-xs text-muted-foreground text-center", children: [
        "Không có option nào khớp.",
        onRegisterNew && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              onRegisterNew();
              setOpen(false);
            },
            className: "ml-1 text-primary hover:underline",
            children: "+ Register mới?"
          }
        )
      ] }) : categories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        cat && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50", children: cat }),
        grouped[cat].map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => handlePick(opt.value),
            className: `w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors border-b border-border/50 last:border-b-0 ${isSelected(opt.value) ? "bg-primary/10" : ""}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                props.multi && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: isSelected(opt.value),
                    readOnly: true,
                    className: "pointer-events-none"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: opt.label })
              ] }),
              opt.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-0.5 ml-5", children: opt.description })
            ]
          },
          opt.value
        ))
      ] }, cat)) }),
      onRegisterNew && filtered.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border p-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            onRegisterNew();
            setOpen(false);
          },
          className: "w-full flex items-center justify-center gap-1 py-1 text-[10px] text-primary hover:bg-primary/10 rounded",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3" }),
            "Register option mới vào Marketplace"
          ]
        }
      ) })
    ] })
  ] });
}

const HOOKS = [
  { value: "notify:telegram:jennie", label: "📱 Notify Jennie (Telegram)", description: "Gửi DM cho Jennie khi step xong" },
  { value: "notify:email", label: "📧 Notify via Email", description: "Gửi email notification" },
  { value: "notify:zalo", label: "💬 Notify via Zalo", description: "Gửi tin nhắn Zalo" },
  { value: "retry:3", label: "🔁 Retry 3 times", description: "Tự động retry 3 lần nếu fail" },
  { value: "retry:5", label: "🔁 Retry 5 times", description: "Tự động retry 5 lần nếu fail" },
  { value: "escalate:ticket", label: "🚨 Create CRM ticket", description: "Tự tạo crm_tickets khi fail" },
  { value: "escalate:jennie", label: "🚨 Escalate to Jennie", description: "Ping @jennie qua Telegram với context" },
  { value: "write_log:activity_log", label: "📝 Write to activity_log", description: "Append row vào activity_log table" },
  { value: "write_log:training_log", label: "📝 Write to training-log.md", description: "Append vào file training log (cho agent learning)" },
  { value: "webhook:custom", label: "🪝 Custom webhook callback", description: "POST tới URL tùy chỉnh với result" },
  { value: "chain:next_sop", label: "🔗 Trigger next SOP", description: "Auto-run SOP khác sau khi xong" },
  { value: "chain:pipeline", label: "🔗 Trigger pipeline", description: "Fan-out tới pipeline khác" },
  { value: "wait:approval", label: "✋ Wait for approval", description: "Pause pipeline, chờ human approve" }
];
const PRECONDITIONS = [
  { value: "step:previous:done", label: "✅ Step trước đã xong", description: "Step liền trước trong SOP phải status=success" },
  { value: "approval:jennie", label: "👑 Jennie approved", description: "Phải có approval từ jennie_chu" },
  { value: "approval:any_admin", label: "👤 Any admin approved", description: "Bất kỳ admin nào approve cũng được" },
  { value: "file:exists", label: "📄 File tồn tại", description: "Check file path tồn tại trước khi chạy" },
  { value: "db:row_exists", label: "🗃️ DB row exists", description: "Query check row trong DB" },
  { value: "agent:available", label: "🤖 Agent not busy", description: "Target agent status=idle" },
  { value: "budget:sufficient", label: "💰 Budget còn đủ", description: "Budget còn > min threshold" },
  { value: "cron:inside_window", label: "⏰ Đang trong giờ hoạt động", description: "Chỉ chạy 8h-20h Mon-Fri" },
  { value: "feature_flag:enabled", label: "🚩 Feature flag ON", description: "Check system_config flag" },
  { value: "quota:not_exceeded", label: "📊 Chưa vượt quota", description: "Rate limit hoặc quota còn available" }
];
const TRIGGER_TYPES = [
  { value: "manual", label: "👆 Manual", description: "Chạy thủ công khi bấm nút" },
  { value: "cron", label: "⏰ Cron schedule", description: "Theo cron expression (5 field)" },
  { value: "event", label: "⚡ Event", description: "Trigger bởi DB event / Supabase Realtime" },
  { value: "webhook", label: "🪝 Webhook", description: "HTTP POST từ external service" },
  { value: "after", label: "➡️ After previous step", description: "Chạy ngay sau step trước done" },
  { value: "queue", label: "📬 Queue poll", description: "Poll queue table mỗi N giây" },
  { value: "db_trigger", label: "🔔 DB trigger", description: "Postgres trigger on insert/update" }
];
const CRON_EXPRESSIONS = [
  { value: "* * * * *", label: "Mỗi phút" },
  { value: "*/5 * * * *", label: "Mỗi 5 phút" },
  { value: "*/15 * * * *", label: "Mỗi 15 phút" },
  { value: "*/30 * * * *", label: "Mỗi 30 phút" },
  { value: "0 * * * *", label: "Mỗi giờ (phút 0)" },
  { value: "0 */2 * * *", label: "Mỗi 2 giờ" },
  { value: "0 */6 * * *", label: "Mỗi 6 giờ" },
  { value: "0 0 * * *", label: "Mỗi ngày lúc 00:00" },
  { value: "0 6 * * *", label: "Mỗi ngày lúc 06:00" },
  { value: "0 7 * * *", label: "Mỗi ngày lúc 07:00" },
  { value: "0 8 * * *", label: "Mỗi ngày lúc 08:00" },
  { value: "0 9 * * *", label: "Mỗi ngày lúc 09:00" },
  { value: "0 17 * * *", label: "Mỗi ngày lúc 17:00" },
  { value: "0 20 * * *", label: "Mỗi ngày lúc 20:00" },
  { value: "0 23 * * *", label: "Mỗi ngày lúc 23:00" },
  { value: "0 8 * * 1", label: "Mỗi thứ 2 lúc 08:00" },
  { value: "0 20 * * 0", label: "Mỗi Chủ Nhật lúc 20:00" },
  { value: "0 0 * * 1", label: "Mỗi thứ 2 lúc 00:00" },
  { value: "0 0 1 * *", label: "Ngày 1 mỗi tháng 00:00" }
];
const EXECUTOR_TYPES = [
  { value: "agent", label: "🤖 AI Agent", description: "Paperclip agent từ paperclip_agents table" },
  { value: "script", label: "⚙️ Script / Shell", description: "Python/Bash/PowerShell script file" },
  { value: "api", label: "🌐 HTTP API call", description: "POST/GET tới URL" },
  { value: "approval", label: "✋ Approval gate", description: "Cần human approve trước khi tiếp" },
  { value: "manual", label: "👤 Manual task", description: "Human (Jennie) làm thủ công" },
  { value: "event", label: "⚡ Event emitter", description: "Emit event cho listeners" }
];
const DB_TABLES = [
  // Content pipeline
  { value: "cc_scripts", label: "cc_scripts", category: "Content", description: "Generated content scripts" },
  { value: "cc_generation_jobs", label: "cc_generation_jobs", category: "Content", description: "Content batch job queue" },
  { value: "cc_calendar_events", label: "cc_calendar_events", category: "Content", description: "Scheduled posts calendar" },
  { value: "cc_social_posts", label: "cc_social_posts", category: "Content", description: "Published social posts tracker" },
  { value: "cc_email_campaigns", label: "cc_email_campaigns", category: "Content", description: "Email campaign queue" },
  { value: "cc_email_sends", label: "cc_email_sends", category: "Content", description: "Individual email send log" },
  { value: "cc_news_articles", label: "cc_news_articles", category: "Content", description: "News article aggregator" },
  // CRM
  { value: "crm_customers", label: "crm_customers", category: "CRM" },
  { value: "crm_interactions", label: "crm_interactions", category: "CRM" },
  { value: "crm_orders", label: "crm_orders", category: "CRM" },
  { value: "crm_tickets", label: "crm_tickets", category: "CRM" },
  { value: "crm_notes", label: "crm_notes", category: "CRM" },
  // Commerce
  { value: "shopify_orders", label: "shopify_orders", category: "Commerce" },
  { value: "course_enrollments", label: "course_enrollments", category: "Commerce" },
  { value: "profiles", label: "profiles", category: "Commerce" },
  { value: "partnership_applications", label: "partnership_applications", category: "Commerce" },
  { value: "affiliate_commissions", label: "affiliate_commissions", category: "Commerce" },
  // Channels
  { value: "channel_instances", label: "channel_instances", category: "Channels" },
  { value: "channel_sessions", label: "channel_sessions", category: "Channels" },
  { value: "channel_pending_messages", label: "channel_pending_messages", category: "Channels" },
  { value: "channel_sent_messages", label: "channel_sent_messages", category: "Channels" },
  // SOP Engine
  { value: "gem_sops", label: "gem_sops", category: "SOP Engine" },
  { value: "gem_sop_executions", label: "gem_sop_executions", category: "SOP Engine" },
  { value: "gem_pipelines", label: "gem_pipelines", category: "SOP Engine" },
  { value: "cron_registry", label: "cron_registry", category: "SOP Engine" },
  // Knowledge
  { value: "kb_documents", label: "kb_documents", category: "Knowledge" },
  { value: "kb_chunks", label: "kb_chunks", category: "Knowledge" },
  { value: "kb_collections", label: "kb_collections", category: "Knowledge" },
  // Analytics
  { value: "daily_analytics_snapshots", label: "daily_analytics_snapshots", category: "Analytics" },
  { value: "paper_trades", label: "paper_trades", category: "Trading" },
  { value: "activity_log", label: "activity_log", category: "System" },
  // Goals & Agents
  { value: "goals", label: "goals", category: "System" },
  { value: "paperclip_agents", label: "paperclip_agents", category: "System" },
  { value: "companies", label: "companies", category: "System" }
];
const INPUT_SOURCES = [
  { value: "db_query", label: "🗃️ DB query", description: "Query 1 hoặc nhiều DB tables" },
  { value: "file_path", label: "📄 File path (local)", description: "Đọc file từ filesystem" },
  { value: "knowledge_kb", label: "📚 Knowledge KB", description: "Từ kb_documents / kb_chunks" },
  { value: "api_response", label: "🌐 API response", description: "Từ step API trước đó" },
  { value: "webhook_body", label: "🪝 Webhook body", description: "Từ webhook payload trigger" },
  { value: "previous_step", label: "⬅️ Output step trước", description: "Từ step N-1 trong SOP" },
  { value: "user_input", label: "👤 User input", description: "Form data user nhập" },
  { value: "env_var", label: "🔐 Environment variable", description: "Đọc từ process.env" },
  { value: "secret_store", label: "🔑 Secret store", description: "Từ Supabase vault / 1password" }
];
const OUTPUT_DESTINATIONS = [
  { value: "db_insert", label: "🗃️ DB insert", description: "INSERT vào table" },
  { value: "db_update", label: "🗃️ DB update", description: "UPDATE row existing" },
  { value: "file_write", label: "📄 Write to file", description: "Ghi vào filesystem path" },
  { value: "channel_send", label: "💬 Send to channel", description: "Zalo/FB/Email/Telegram" },
  { value: "next_step_input", label: "➡️ Next step input", description: "Truyền vào step kế tiếp" },
  { value: "event_emit", label: "⚡ Emit event", description: "Broadcast event cho listeners" },
  { value: "webhook_callback", label: "🪝 POST webhook", description: "HTTP POST tới URL callback" },
  { value: "push_notification", label: "🔔 Push notification", description: "Expo push to mobile app" },
  { value: "platform_publish", label: "📢 Publish to platform", description: "Meta BS / YouTube / TikTok" },
  { value: "knowledge_append", label: "📚 Append to KB", description: "Thêm vào kb_documents" }
];
async function fetchAgentOptions() {
  try {
    const res = await fetch("/api/channels/agent-configs");
    if (!res.ok) return [];
    const agents = await res.json();
    return (Array.isArray(agents) ? agents : []).map((a) => ({
      value: a.slug,
      label: `🤖 ${a.display_name || a.slug}`,
      description: a.description || `${a.provider} · ${a.model}`,
      category: a.enabled ? "active" : "disabled"
    }));
  } catch {
    return [];
  }
}
async function fetchCronOptions() {
  try {
    const res = await fetch("/api/registry/crons");
    if (!res.ok) return [];
    const crons = await res.json();
    return (Array.isArray(crons) ? crons : []).map((c) => ({
      value: c.id,
      label: `${c.display_name} (${c.cron_humanized || c.cron_expression || "—"})`,
      description: `${c.category || "uncategorized"} · ${c.schedule_type}`,
      category: c.schedule_type
    }));
  } catch {
    return [];
  }
}
function useAgentOptions() {
  return useQuery({
    queryKey: ["registry", "agents"],
    queryFn: fetchAgentOptions,
    staleTime: 6e4
  });
}
function useCronOptions() {
  return useQuery({
    queryKey: ["registry", "crons"],
    queryFn: fetchCronOptions,
    staleTime: 6e4
  });
}

function getSessionKey(stepId) {
  const storageKey = `sop-composer-session:${stepId}`;
  let sid = typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : null;
  if (!sid) {
    sid = `${stepId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined") window.sessionStorage.setItem(storageKey, sid);
  }
  return `sop-composer:${stepId}:${sid}`;
}
function StepComposer({ agentSlug, stepId, stepLabel, defaultCollapsed = true }) {
  const { pushToast } = useToast();
  const [collapsed, setCollapsed] = reactExports.useState(defaultCollapsed);
  const [text, setText] = reactExports.useState("");
  const [turns, setTurns] = reactExports.useState([]);
  const [sending, setSending] = reactExports.useState(false);
  const abortRef = reactExports.useRef(null);
  const bodyRef = reactExports.useRef(null);
  const sessionKey = reactExports.useMemo(() => getSessionKey(stepId), [stepId]);
  reactExports.useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [turns]);
  reactExports.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !agentSlug) return;
    const userTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    setTurns((prev) => [...prev, userTurn]);
    setText("");
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/channels/agent-configs/${agentSlug}/test`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-training-session-id": sessionKey
        },
        body: JSON.stringify({ message: trimmed, contentType: "text" })
      });
      if (controller.signal.aborted) return;
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (controller.signal.aborted) return;
      const reply = data.reply || data.response || data.message || "(empty reply)";
      const agentTurn = {
        id: `a-${Date.now()}`,
        role: "agent",
        text: reply,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      setTurns((prev) => [...prev, agentTurn]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setTurns((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "agent",
          text: `❌ ${err.message}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: true
        }
      ]);
      pushToast({ title: "Send thất bại", body: err.message, tone: "error" });
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };
  const handleClear = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(`sop-composer-session:${stepId}`);
    }
    setTurns([]);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 border border-border rounded-md bg-muted/20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setCollapsed((c) => !c),
        className: "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent/30 text-xs",
        children: [
          collapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "size-3 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: "Composer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "→ talk to" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-primary", children: agentSlug || "(no agent)" }),
          turns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-[10px] text-muted-foreground", children: [
            turns.length,
            " turns"
          ] })
        ]
      }
    ),
    !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: bodyRef,
          className: "max-h-64 overflow-y-auto p-3 space-y-2 text-xs",
          children: [
            turns.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground italic text-center py-4", children: "Chưa có tin nhắn. Gõ gì đó và bấm Send để thử agent này." }),
            turns.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-2 ${t.role === "user" ? "justify-end" : "justify-start"}`, children: [
              t.role === "agent" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 size-6 rounded-full bg-primary/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "size-3 text-primary" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: `max-w-[75%] px-3 py-1.5 rounded-lg ${t.role === "user" ? "bg-primary text-primary-foreground" : t.error ? "bg-destructive/10 border border-destructive/30 text-destructive" : "bg-background border border-border text-foreground"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "whitespace-pre-wrap break-words", children: t.text }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] opacity-60 mt-0.5", children: new Date(t.timestamp).toLocaleTimeString("vi-VN") })
                  ]
                }
              ),
              t.role === "user" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 size-6 rounded-full bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-3" }) })
            ] }, t.id)),
            sending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-muted-foreground italic", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }),
              "Agent đang suy nghĩ..."
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border p-2 flex items-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: text,
            onChange: (e) => setText(e.target.value),
            onKeyDown: handleKeyDown,
            placeholder: `Nhắn cho ${agentSlug || "agent"}... (Ctrl+Enter để gửi)`,
            rows: 2,
            className: "flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground resize-y min-h-[40px] focus:border-ring outline-none",
            disabled: sending
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleSend,
              disabled: !text.trim() || sending || !agentSlug,
              className: "p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-40",
              title: "Gửi (Ctrl+Enter)",
              children: sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-3.5" })
            }
          ),
          turns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleClear,
              className: "p-1.5 text-muted-foreground hover:text-destructive",
              title: "Xóa hội thoại + reset session",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
            }
          )
        ] })
      ] })
    ] })
  ] });
}

async function fetchSop(sopId) {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}`);
  if (!res.ok) return null;
  const payload = await res.json();
  const sop = payload?.sop || payload;
  if (!sop || !sop.sop_id) return null;
  return {
    sop_id: sop.sop_id,
    name: sop.name,
    domain: sop.domain,
    status: sop.status,
    steps: Array.isArray(sop.steps) ? sop.steps : []
  };
}
async function patchSopSteps(sopId, steps) {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ steps })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || "Update failed");
  }
}
function Tip({ children, text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { className: "max-w-xs", children: text })
  ] });
}
function Field({
  num,
  label,
  tooltip,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: tooltip, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1", children: [
      num,
      " · ",
      label
    ] }),
    children
  ] }) });
}
function StepCard({
  step,
  index,
  agentOptions,
  cronOptions,
  agentsLoading,
  cronsLoading,
  onUpdate,
  onDelete,
  onCopy,
  onNavigateToRegistry
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `step:${index}`
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const typeColors = {
    script: "border-blue-500/40 bg-blue-500/5",
    agent: "border-purple-500/40 bg-purple-500/5",
    api: "border-green-500/40 bg-green-500/5",
    approval: "border-amber-500/40 bg-amber-500/5",
    manual: "border-orange-500/40 bg-orange-500/5",
    event: "border-pink-500/40 bg-pink-500/5"
  };
  const executorTypeLabel = EXECUTOR_TYPES.find((t) => t.value === step.type)?.label || step.type;
  const inputTables = step.input?.tables || [];
  const outputTables = step.output?.tables || [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `rounded-lg border ${typeColors[step.type] || "border-border"} bg-background/50`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 border-b border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Kéo để sắp xếp lại thứ tự bước trong SOP. Order tự cập nhật sau khi thả.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              ...attributes,
              ...listeners,
              className: "text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-4" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Số thứ tự bước trong SOP — tự động gán theo vị trí drag-drop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-muted text-foreground", children: [
              "Step ",
              index + 1
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: `Loại executor: ${executorTypeLabel}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 text-[10px] uppercase rounded border border-border text-muted-foreground", children: executorTypeLabel }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Copy JSON của step này vào clipboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onCopy, className: "p-1 text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Xóa step (có 8 giây để hoàn tác sau khi xóa)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onDelete, className: "p-1 text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 space-y-3 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { num: 1, label: "Step Name", tooltip: "Field 1: Tên bước. Đặt rõ ý nghĩa. Ví dụ: 'Gửi email welcome cho user mới', 'Validate lead score'.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: step.name || "",
                onChange: (e) => onUpdate({ name: e.target.value }),
                placeholder: "Tên bước...",
                className: "w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { num: 2, label: "Executor Type", tooltip: "Field 2: Loại executor thực thi bước này — agent/script/api/approval/manual/event. Chọn từ Registry để thống nhất.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              RegistryCombobox,
              {
                options: EXECUTOR_TYPES,
                value: step.type,
                onChange: (v) => onUpdate({ type: v }),
                placeholder: "Chọn loại executor..."
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              num: 3,
              label: "Executor ID / Agent Slug",
              tooltip: "Field 3: ID cụ thể. Nếu type=agent → agent slug từ paperclip_agents SSOT. Nếu script → path file. Nếu approval → user slug. KHÔNG nhập tay để tránh duplicate.",
              children: step.type === "agent" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                RegistryCombobox,
                {
                  options: agentOptions,
                  value: step.agent || "",
                  onChange: (v) => onUpdate({ agent: v }),
                  placeholder: agentsLoading ? "Đang tải agents..." : "Chọn agent từ paperclip_agents...",
                  isLoading: agentsLoading,
                  onRegisterNew: () => onNavigateToRegistry("agents"),
                  registerHint: "Chưa có agent phù hợp? Tạo agent mới trong Registry Marketplace → Agents"
                }
              ) : step.type === "script" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: step.executor || "",
                  onChange: (e) => onUpdate({ executor: e.target.value }),
                  placeholder: "Path tới script (vd: scripts/batch_processor.py)",
                  className: "w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
                }
              ) : step.type === "approval" || step.type === "manual" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                RegistryCombobox,
                {
                  options: [
                    { value: "jennie_chu", label: "👑 Jennie Chu", description: "Owner — approve tất cả cấp" },
                    { value: "any_admin", label: "👤 Any admin", description: "Bất kỳ admin nào" },
                    { value: "board_majority", label: "🏛️ Board majority", description: "Cần 2/3 board approve" }
                  ],
                  value: step.executor || "",
                  onChange: (v) => onUpdate({ executor: v }),
                  placeholder: "Chọn người approve..."
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: step.executor || "",
                  onChange: (e) => onUpdate({ executor: e.target.value }),
                  placeholder: "Executor ID / URL / event name",
                  className: "w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              num: 4,
              label: "Pre-Conditions",
              tooltip: "Field 4: Điều kiện phải có TRƯỚC khi step chạy. Chọn 1 hoặc nhiều điều kiện chuẩn. Custom → Register vào Marketplace.",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                RegistryCombobox,
                {
                  multi: true,
                  options: PRECONDITIONS,
                  value: step.preconditions || [],
                  onChange: (v) => onUpdate({ preconditions: v }),
                  placeholder: "Chọn điều kiện tiên quyết...",
                  onRegisterNew: () => onNavigateToRegistry("preconditions"),
                  registerHint: "Register pre-condition mới trong Registry → Hooks sub-tab"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 5,
                label: "Input Source",
                tooltip: "Field 5a: Loại nguồn input — DB query / file / KB / API response / previous step output",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    options: INPUT_SOURCES,
                    value: step.input?.source || "",
                    onChange: (v) => onUpdate({ input: { ...step.input, source: v } }),
                    placeholder: "Chọn nguồn input..."
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 5,
                label: "Input DB Tables",
                tooltip: "Field 5b: Bảng DB để đọc data (multi-select). Nếu bảng chưa có trong registry → Register vào Marketplace trước.",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    multi: true,
                    options: DB_TABLES,
                    value: inputTables,
                    onChange: (v) => onUpdate({ input: { ...step.input, tables: v } }),
                    placeholder: "Chọn DB tables...",
                    onRegisterNew: () => onNavigateToRegistry("db-tables"),
                    registerHint: "Register DB table mới trong Registry → System sub-tab"
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              num: 6,
              label: "Command / Action",
              tooltip: step.type === "script" ? "Field 6: Shell command sẽ chạy. Vd: python scripts/batch_processor.py --batch" : step.type === "api" ? "Field 6: URL endpoint cho HTTP request" : "Field 6: Instructions cho agent / mô tả action",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  value: step.script || step.url || step.instructions || "",
                  onChange: (e) => {
                    const v = e.target.value;
                    if (step.type === "script") onUpdate({ script: v });
                    else if (step.type === "api") onUpdate({ url: v });
                    else onUpdate({ instructions: v });
                  },
                  rows: 2,
                  placeholder: step.type === "script" ? "python scripts/batch_processor.py --batch" : step.type === "api" ? "https://api.example.com/endpoint" : "Agent instructions (natural language)...",
                  className: "w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono resize-none"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 7,
                label: "Output Destination",
                tooltip: "Field 7a: Loại đầu ra — DB insert/update, file, channel, next step input, event, push, platform...",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    options: OUTPUT_DESTINATIONS,
                    value: step.output?.destination || "",
                    onChange: (v) => onUpdate({ output: { ...step.output, destination: v } }),
                    placeholder: "Chọn loại output..."
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 7,
                label: "Output DB Tables",
                tooltip: "Field 7b: Bảng DB để ghi kết quả (multi-select). Lấy từ Registry SSOT.",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    multi: true,
                    options: DB_TABLES,
                    value: outputTables,
                    onChange: (v) => onUpdate({ output: { ...step.output, tables: v } }),
                    placeholder: "Chọn DB tables...",
                    onRegisterNew: () => onNavigateToRegistry("db-tables"),
                    registerHint: "Register DB table mới trong Registry → System sub-tab"
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 8,
                label: "Trigger Type",
                tooltip: "Field 8a: Loại trigger — manual/cron/event/webhook/after-previous/queue-poll/db-trigger",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    options: TRIGGER_TYPES,
                    value: step.trigger?.type || "",
                    onChange: (v) => onUpdate({ trigger: { ...step.trigger, type: v } }),
                    placeholder: "Chọn loại trigger..."
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Field,
              {
                num: 8,
                label: step.trigger?.type === "cron" ? "Cron Schedule" : "Trigger Value",
                tooltip: "Field 8b: Nếu type=cron → chọn cron expression pre-built hoặc link vào cron_registry job có sẵn. Nếu event → tên event name.",
                children: step.trigger?.type === "cron" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegistryCombobox,
                  {
                    options: [
                      ...CRON_EXPRESSIONS,
                      // Separator group: link to existing registered crons
                      ...cronOptions.map((c) => ({ ...c, category: "⚡ Linked từ cron_registry" }))
                    ],
                    value: step.trigger?.schedule || "",
                    onChange: (v) => onUpdate({ trigger: { ...step.trigger, schedule: v } }),
                    placeholder: cronsLoading ? "Đang tải..." : "Chọn cron expression hoặc job có sẵn...",
                    isLoading: cronsLoading,
                    onRegisterNew: () => onNavigateToRegistry("crons"),
                    registerHint: "Register cron job mới trong Registry → Cron & Heartbeats sub-tab"
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: step.trigger?.event || "",
                    onChange: (e) => onUpdate({ trigger: { ...step.trigger, event: e.target.value } }),
                    placeholder: step.trigger?.type === "webhook" ? "webhook-name" : step.trigger?.type === "event" ? "event_name" : "Trigger value...",
                    className: "w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              num: 9,
              label: "Hooks (sau khi step xong)",
              tooltip: "Field 9: Hành động sau khi step complete — notify, retry, escalate, write log, chain next SOP. Multi-select từ Registry.",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                RegistryCombobox,
                {
                  multi: true,
                  options: HOOKS,
                  value: step.hooks || [],
                  onChange: (v) => onUpdate({ hooks: v }),
                  placeholder: "Chọn hooks sau khi xong...",
                  onRegisterNew: () => onNavigateToRegistry("hooks"),
                  registerHint: "Register hook mới trong Registry → Hooks sub-tab"
                }
              )
            }
          ),
          step.type === "agent" && step.agent && /* @__PURE__ */ jsxRuntimeExports.jsx(
            StepComposer,
            {
              agentSlug: step.agent,
              stepId: `${index}`,
              stepLabel: step.name,
              defaultCollapsed: true
            }
          )
        ] })
      ]
    }
  );
}
function SopStepsEditor({ sopId }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const sopQuery = useQuery({
    queryKey: ["sop-engine", "sop-detail", sopId],
    queryFn: () => fetchSop(sopId),
    enabled: !!sopId
  });
  const { data: agentOptions = [], isLoading: agentsLoading } = useAgentOptions();
  const { data: cronOptions = [], isLoading: cronsLoading } = useCronOptions();
  const pendingStepsRef = reactExports.useRef(null);
  const saveTimerRef = reactExports.useRef(null);
  const [saving, setSaving] = reactExports.useState(false);
  const sop = sopQuery.data;
  const steps = sop?.steps || [];
  const scheduleSave = reactExports.useCallback(
    (nextSteps) => {
      pendingStepsRef.current = nextSteps;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        const payload = pendingStepsRef.current;
        pendingStepsRef.current = null;
        saveTimerRef.current = null;
        if (!payload) return;
        setSaving(true);
        try {
          await patchSopSteps(sopId, payload);
          qc.invalidateQueries({ queryKey: ["sop-engine", "sop-detail", sopId] });
        } catch (err) {
          pushToast({ title: "Auto-save failed", body: err.message, tone: "error" });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [sopId, qc, pushToast]
  );
  const updateSteps = reactExports.useCallback(
    (nextSteps) => {
      qc.setQueryData(
        ["sop-engine", "sop-detail", sopId],
        (prev) => prev ? { ...prev, steps: nextSteps } : prev
      );
      scheduleSave(nextSteps);
    },
    [qc, sopId, scheduleSave]
  );
  const handleFieldUpdate = (idx, patch) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...patch, order: i + 1 } : s);
    updateSteps(next);
  };
  const handleDelete = (idx) => {
    const prev = steps;
    const removed = prev[idx];
    const next = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    updateSteps(next);
    pushToast({
      title: `🗑️ Đã xóa step "${removed.name}"`,
      body: 'Click "Hoàn tác" trong 8 giây',
      tone: "warn",
      ttlMs: 8e3,
      action: { label: "Hoàn tác", href: `#undo-step-${sopId}-${idx}` }
    });
    const onUndo = (e) => {
      const el = e.target;
      if (el?.closest(`a[href="#undo-step-${sopId}-${idx}"]`)) {
        updateSteps(prev);
        document.removeEventListener("click", onUndo, true);
        pushToast({ title: "↩️ Đã hoàn tác", tone: "success" });
      }
    };
    document.addEventListener("click", onUndo, true);
    setTimeout(() => document.removeEventListener("click", onUndo, true), 9e3);
  };
  const handleCopy = async (step) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(step, null, 2));
      pushToast({ title: "📋 Đã copy step", body: step.name, tone: "success" });
    } catch {
      pushToast({ title: "Copy thất bại", tone: "error" });
    }
  };
  const handleAdd = () => {
    const next = [
      ...steps,
      {
        order: steps.length + 1,
        name: `Step ${steps.length + 1}`,
        type: "agent"
      }
    ];
    updateSteps(next);
    pushToast({ title: "➕ Đã thêm step mới", tone: "success" });
  };
  const handleNavigateToRegistry = (target) => {
    pushToast({
      title: "🚧 Registry Marketplace",
      body: `Sub-tab "${target}" sẽ được build trong Phase 3. Tạm thời dùng options có sẵn.`,
      tone: "info"
    });
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = Number(String(active.id).split(":")[1]);
    const overIdx = Number(String(over.id).split(":")[1]);
    if (Number.isNaN(activeIdx) || Number.isNaN(overIdx)) return;
    const next = arrayMove(steps, activeIdx, overIdx).map((s, i) => ({ ...s, order: i + 1 }));
    updateSteps(next);
  };
  if (sopQuery.isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }),
      "Đang tải steps của ",
      sopId,
      "..."
    ] });
  }
  if (!sop) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 text-xs text-destructive", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-3" }),
      "Không tìm thấy SOP ",
      sopId,
      " trong gem_sops. Có thể SOP này chưa được seed."
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: sop.sop_id }),
        " · ",
        sop.name,
        " · ",
        steps.length,
        " bước",
        saving && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-primary", children: "• Đang lưu..." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Auto-sync bật — mọi thay đổi tự động lưu sau 800ms. Tất cả dropdown lấy từ Registry SSOT.", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400", children: "● Auto-sync · SSOT" }) })
    ] }),
    steps.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded", children: 'SOP này chưa có step nào. Bấm "+ Thêm step" để tạo.' }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SortableContext, { items: steps.map((_, i) => `step:${i}`), strategy: verticalListSortingStrategy, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: steps.map((step, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      StepCard,
      {
        step,
        index: idx,
        agentOptions,
        cronOptions,
        agentsLoading,
        cronsLoading,
        onUpdate: (patch) => handleFieldUpdate(idx, patch),
        onDelete: () => handleDelete(idx),
        onCopy: () => handleCopy(step),
        onNavigateToRegistry: handleNavigateToRegistry
      },
      `step:${idx}`
    )) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Tip, { text: "Thêm 1 step mới vào cuối SOP với type=agent mặc định. Chỉnh sửa field sau.", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: handleAdd,
        className: "w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border border-dashed border-border rounded hover:border-primary hover:text-primary transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
          "Thêm step mới"
        ]
      }
    ) })
  ] });
}

export { SopStepsEditor as S };
