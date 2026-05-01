import { r as reactExports, s as supabase, j as jsxRuntimeExports, bq as Settings, k as LoaderCircle, C as CircleCheckBig, aA as Save, br as Key, bs as Bell, bp as Palette, bt as User, z as CCSelect, au as Database, bu as EyeOff, E as Eye, a4 as Globe, X, b4 as Link2, a6 as Shield } from './index-DY_auHjr.js';

function useAuth() {
  const [user, setUser] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return { user, loading };
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const tabs = [
  { id: "general", label: "Tổng Quan", icon: Settings },
  { id: "api", label: "API & Tích Hợp", icon: Key },
  { id: "notifications", label: "Thông Báo", icon: Bell },
  { id: "appearance", label: "Giao Diện", icon: Palette },
  { id: "account", label: "Tài Khoản", icon: User }
];
const PLATFORM_CONFIGS = [
  { name: "Facebook", icon: "📘", color: "#1877F2" },
  { name: "TikTok", icon: "🎵", color: "#000000" },
  { name: "YouTube", icon: "📺", color: "#FF0000" },
  { name: "Instagram", icon: "📷", color: "#E4405F" },
  { name: "Threads", icon: "🧵", color: "#000000" }
];
const EMPTY_CONNECT_FORM = {
  display_name: "",
  access_token: "",
  page_id: ""
};
function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = reactExports.useState("general");
  const [showApiKey, setShowApiKey] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [saved, setSaved] = reactExports.useState(false);
  const [apiKey, setApiKey] = reactExports.useState("");
  const [defaultModel, setDefaultModel] = reactExports.useState("claude-sonnet-4-5-20250929");
  const [defaultTemp, setDefaultTemp] = reactExports.useState("0.7");
  const [maxTokens, setMaxTokens] = reactExports.useState("8192");
  const [autoSave, setAutoSave] = reactExports.useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = reactExports.useState("30");
  const [language, setLanguage] = reactExports.useState("vi");
  const [notifyGenComplete, setNotifyGenComplete] = reactExports.useState(true);
  const [notifyApproval, setNotifyApproval] = reactExports.useState(true);
  const [notifySystem, setNotifySystem] = reactExports.useState(true);
  const [soundEnabled, setSoundEnabled] = reactExports.useState(false);
  const [platforms, setPlatforms] = reactExports.useState([]);
  const [platformsLoading, setPlatformsLoading] = reactExports.useState(false);
  const [connectingPlatform, setConnectingPlatform] = reactExports.useState(null);
  const [connectForm, setConnectForm] = reactExports.useState(EMPTY_CONNECT_FORM);
  const [platformSaving, setPlatformSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (activeTab === "api") {
      loadPlatforms();
    }
  }, [activeTab]);
  const loadPlatforms = async () => {
    try {
      setPlatformsLoading(true);
      const { data, error } = await supabase.from("platform_connections").select("*").order("created_at", { ascending: false });
      if (!error) {
        setPlatforms(data || []);
      }
    } catch (err) {
      console.error("Error loading platforms:", err);
    } finally {
      setPlatformsLoading(false);
    }
  };
  const handleOpenConnect = (platformConfig) => {
    const existing = platforms.find((p) => p.platform?.toLowerCase() === platformConfig.name.toLowerCase());
    setConnectingPlatform(platformConfig);
    setConnectForm({
      display_name: existing?.display_name || "",
      access_token: "",
      page_id: existing?.page_id || ""
    });
  };
  const handleCancelConnect = () => {
    setConnectingPlatform(null);
    setConnectForm({ ...EMPTY_CONNECT_FORM });
  };
  const handleConnectChange = (field, value) => {
    setConnectForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleConnect = async () => {
    if (!connectingPlatform) return;
    setPlatformSaving(true);
    try {
      const existing = platforms.find((p) => p.platform?.toLowerCase() === connectingPlatform.name.toLowerCase());
      if (existing) {
        const updatePayload = {
          is_connected: true,
          connected_at: (/* @__PURE__ */ new Date()).toISOString(),
          display_name: connectForm.display_name.trim() || null,
          page_id: connectForm.page_id.trim() || null
        };
        if (connectForm.access_token.trim()) {
          updatePayload.access_token = connectForm.access_token.trim();
        }
        const { error } = await supabase.from("platform_connections").update(updatePayload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_connections").insert({
          platform: connectingPlatform.name,
          is_connected: true,
          connected_at: (/* @__PURE__ */ new Date()).toISOString(),
          display_name: connectForm.display_name.trim() || null,
          access_token: connectForm.access_token.trim() || null,
          page_id: connectForm.page_id.trim() || null,
          created_by: user?.id || null
        });
        if (error) throw error;
      }
      handleCancelConnect();
      loadPlatforms();
    } catch (err) {
      alert("Lỗi khi kết nối: " + err.message);
    } finally {
      setPlatformSaving(false);
    }
  };
  const handleDisconnect = async (platformRecord) => {
    if (!confirm(`Ngắt kết nối ${platformRecord.platform}?`)) return;
    try {
      const { error } = await supabase.from("platform_connections").update({
        is_connected: false,
        access_token: null,
        page_id: null
      }).eq("id", platformRecord.id);
      if (error) throw error;
      loadPlatforms();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "font-heading text-2xl font-bold text-txt flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 24, className: "text-txt-2" }),
          "Cài Đặt"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3 mt-1", children: "Cấu hình hệ thống, API, nền tảng, và tùy chỉnh cá nhân" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleSave,
          disabled: saving,
          className: "btn btn-p flex items-center gap-2",
          children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 16, className: "animate-spin" }) : saved ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 16 }),
            saved ? "Đã Lưu" : "Lưu Thay Đổi"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", style: { gridTemplateColumns: "220px 1fr" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-1", children: tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setActiveTab(tab.id),
            className: `w-full flex items-center gap-3 px-4 py-2.5 rounded-card text-sm text-left transition-all
                  ${isActive ? "bg-bg-2 border border-gold/20 text-txt" : "text-txt-3 hover:text-txt hover:bg-glass-bg"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 16, className: isActive ? "text-gold" : "" }),
              tab.label
            ]
          },
          tab.id
        );
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6 space-y-6", children: [
        activeTab === "general" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: "Cài Đặt Tổng Quan" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Ngôn ngữ" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CCSelect,
                {
                  value: language,
                  onChange: (e) => setLanguage(e.target.value),
                  className: "w-full max-w-xs",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "vi", children: "Tiếng Việt" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "en", children: "English" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 rounded-card bg-glass-bg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium", children: "Tự động lưu" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Lưu tự động khi chỉnh sửa kịch bản" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => setAutoSave(!autoSave),
                  className: `w-10 h-6 rounded-full transition-all relative ${autoSave ? "bg-gold" : "bg-bg-4"}`,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${autoSave ? "left-[18px]" : "left-0.5"}`
                    }
                  )
                }
              )
            ] }),
            autoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Khoảng cách lưu tự động (giây)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  value: autoSaveInterval,
                  onChange: (e) => setAutoSaveInterval(e.target.value),
                  min: "10",
                  max: "120",
                  className: "fi w-32"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-card bg-glass-bg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { size: 16, className: "text-gold" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium", children: "Cơ Sở Dữ Liệu" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-xs text-txt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Project: gem-trading-platform" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "ID: pgfkbcnzqozzkohwbgbk" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Tables: 12 bảng cc_ prefix" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "RLS: 38 policies active" })
              ] })
            ] })
          ] })
        ] }),
        activeTab === "api" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: "API & Tích Hợp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm font-medium text-txt mb-1.5 flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { size: 14, className: "text-gold" }),
                "Anthropic API Key"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: showApiKey ? "text" : "password",
                    value: apiKey,
                    onChange: (e) => setApiKey(e.target.value),
                    placeholder: "sk-ant-api...",
                    className: "fi w-full pr-10"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => setShowApiKey(!showApiKey),
                    className: "absolute right-3 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt",
                    children: showApiKey ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 16 })
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "Được lưu an toàn trong biến môi trường phía server" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Model mặc định" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CCSelect,
                {
                  value: defaultModel,
                  onChange: (e) => setDefaultModel(e.target.value),
                  className: "w-full max-w-md",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "claude-sonnet-4-5-20250929", children: "Claude Sonnet 4.5 (Khuyến nghị)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "claude-opus-4-7", children: "Claude Opus 4.7 (Mạnh nhất)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "claude-opus-4-6", children: "Claude Opus 4.6" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "claude-haiku-4-5-20251001", children: "Claude Haiku 4.5 (Nhanh nhất)" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Temperature (0.0 - 1.0)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  value: defaultTemp,
                  onChange: (e) => setDefaultTemp(e.target.value),
                  min: "0",
                  max: "1",
                  step: "0.1",
                  className: "fi w-32"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "0.7 = cân bằng, 0.85 = sáng tạo hơn (MODE 2)" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Max Tokens" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  value: maxTokens,
                  onChange: (e) => setMaxTokens(e.target.value),
                  min: "1024",
                  max: "128000",
                  step: "1024",
                  className: "fi w-48"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "8192 cho LATC/TMT, 2048 cho Clip Ngắn" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-card bg-glass-bg space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { size: 16, className: "text-emerald" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-txt", children: "Supabase" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs bg-success/10 text-success px-2 py-0.5 rounded-badge", children: "Đã kết nối" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "URL và keys được cấu hình qua biến môi trường" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginTop: 8 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-base font-semibold text-txt flex items-center gap-2 mb-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 16, className: "text-gold" }),
                "Kết Nối Nền Tảng"
              ] }),
              connectingPlatform && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "rgba(15,16,48,0.35)", borderRadius: 12, padding: 20, marginBottom: 16 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { style: { marginBottom: 14, color: "#fff", fontSize: 15, fontWeight: 600 }, children: [
                  "Kết nối ",
                  connectingPlatform.name
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm text-txt-3 mb-1", children: "Tên hiển thị" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "text",
                        value: connectForm.display_name,
                        onChange: (e) => handleConnectChange("display_name", e.target.value),
                        placeholder: "VD: GemRal Official",
                        className: "fi w-full"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm text-txt-3 mb-1", children: "Page/Channel ID" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "text",
                        value: connectForm.page_id,
                        onChange: (e) => handleConnectChange("page_id", e.target.value),
                        placeholder: "ID trang hoặc kênh",
                        className: "fi w-full"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1 / -1" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm text-txt-3 mb-1", children: "Access Token (API)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "text",
                        value: connectForm.access_token,
                        onChange: (e) => handleConnectChange("access_token", e.target.value),
                        placeholder: "Nhập API token...",
                        className: "fi w-full"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "Token sẽ được lưu an toàn. Để trống nếu không muốn thay đổi." })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleCancelConnect, className: "btn btn-ghost flex items-center gap-1.5 text-sm", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }),
                    " Hủy"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleConnect, disabled: platformSaving, className: "btn btn-p flex items-center gap-1.5 text-sm", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 14 }),
                    " ",
                    platformSaving ? "Đang kết nối..." : "Kết nối"
                  ] })
                ] })
              ] }),
              platformsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-8 text-txt-3 text-sm", children: "Đang tải nền tảng..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "admin-platforms-grid", children: PLATFORM_CONFIGS.map((platformConfig) => {
                const connected = platforms.find((p) => p.platform?.toLowerCase() === platformConfig.name.toLowerCase());
                const isConnected = connected?.is_connected === true;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `admin-platform-card ${isConnected ? "connected" : "disconnected"}`, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "admin-platform-icon", style: { background: platformConfig.color + "20" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "28px" }, children: platformConfig.icon }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-platform-info", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: platformConfig.name }),
                    isConnected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "connected-text", children: "Đã kết nối" }),
                      connected.display_name && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#aaa" }, children: connected.display_name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                        "Kết nối lúc: ",
                        formatDate(connected.connected_at)
                      ] })
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "disconnected-text", children: "Chưa kết nối" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "admin-platform-actions", children: isConnected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "adm-btn-secondary", onClick: () => handleOpenConnect(platformConfig), children: "Cập nhật" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "adm-btn-danger", onClick: () => handleDisconnect(connected), children: "Ngắt kết nối" })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "adm-btn-secondary", onClick: () => handleOpenConnect(platformConfig), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 14 }),
                    " Kết nối"
                  ] }) })
                ] }, platformConfig.name);
              }) })
            ] })
          ] })
        ] }),
        activeTab === "notifications" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: "Cài Đặt Thông Báo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: [
            {
              label: "Tạo nội dung hoàn thành",
              desc: "Thông báo khi AI tạo xong kịch bản",
              value: notifyGenComplete,
              setter: setNotifyGenComplete
            },
            {
              label: "Yêu cầu duyệt",
              desc: "Thông báo khi có kịch bản cần duyệt",
              value: notifyApproval,
              setter: setNotifyApproval
            },
            {
              label: "Thông báo hệ thống",
              desc: "Cập nhật, bảo trì, lỗi hệ thống",
              value: notifySystem,
              setter: setNotifySystem
            },
            {
              label: "Âm thanh thông báo",
              desc: "Phát âm thanh khi có thông báo mới",
              value: soundEnabled,
              setter: setSoundEnabled
            }
          ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex items-center justify-between p-3 rounded-card bg-glass-bg",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium", children: item.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: item.desc })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => item.setter(!item.value),
                    className: `w-10 h-6 rounded-full transition-all relative ${item.value ? "bg-gold" : "bg-bg-4"}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${item.value ? "left-[18px]" : "left-0.5"}`
                      }
                    )
                  }
                )
              ]
            },
            item.label
          )) })
        ] }),
        activeTab === "appearance" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: "Giao Diện" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-3", children: "Theme" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "card p-4 border-2 border-gold flex-1 text-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-[#07070c] mx-auto mb-2 border border-border" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt font-medium", children: "Dark (Mặc định)" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "card p-4 flex-1 text-center opacity-50 cursor-not-allowed", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-gray-100 mx-auto mb-2 border border-border" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "Light (Sắp ra mắt)" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-3", children: "Bảng Màu Thương Hiệu" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-3", children: [
                { name: "Gold", hex: "#d4a853", cls: "bg-gold" },
                { name: "Purple", hex: "#9b6dff", cls: "bg-purple" },
                { name: "Cyan", hex: "#00F0FF", cls: "bg-cyan" },
                { name: "Emerald", hex: "#10B981", cls: "bg-emerald" }
              ].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-12 h-12 rounded-card ${c.cls} mx-auto mb-1` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2", children: c.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: c.hex })
              ] }, c.name)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-2", children: "Font" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs text-txt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-heading text-txt", children: "Cormorant Garamond" }),
                  " — Headings"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt", children: "DM Sans" }),
                  " — Body text"
                ] })
              ] })
            ] })
          ] })
        ] }),
        activeTab === "account" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: "Tài Khoản" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-card bg-glass-bg flex items-center gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-full bg-gradient-to-br from-gold to-purple flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 24, className: "text-white" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-txt", children: "Jennie Uyen Chu" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Owner" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "email",
                  value: "jennie@gemral.com",
                  readOnly: true,
                  className: "fi w-full max-w-md bg-glass-bg cursor-not-allowed"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-txt mb-1.5", children: "Vai trò" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 16, className: "text-gold" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt", children: "Owner" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: "— Toàn quyền quản lý hệ thống" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-txt mb-2", children: "Quyền Hạn" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: ["Tạo nội dung", "Chỉnh sửa", "Duyệt", "Xuất bản", "Xóa", "Quản lý người dùng", "Cấu hình hệ thống", "AI Generation"].map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-txt-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12, className: "text-success" }),
                p
              ] }, p)) })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}

export { SettingsPage as default };
