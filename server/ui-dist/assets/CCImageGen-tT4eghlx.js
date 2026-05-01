import { r as reactExports, j as jsxRuntimeExports, ab as Check, ac as Copy, bk as cn, bl as useToast, bm as Card, I as Image, bn as Input, bo as Textarea, bf as Select, bc as Button, d as Sparkles, bp as Palette, t as TriangleAlert, c as Clock, B as BookOpen, bg as Badge, K as ChevronRight, af as Trash2, P as PenLine, aA as Save, W as Info, k as LoaderCircle } from './index-DY_auHjr.js';

function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  maxHeight,
  copyable = true,
  className
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = reactExports.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  }, [code]);
  const lines = code.split("\n");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("relative group", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-border bg-bg-2 rounded-t-badge", children: [
      language && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs font-semibold uppercase tracking-wider text-txt-3", children: language }),
      !language && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      copyable && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: cn(
            "inline-flex items-center gap-1 text-xxs text-txt-3",
            "hover:text-txt transition-colors duration-fast",
            "opacity-0 group-hover:opacity-100 focus:opacity-100"
          ),
          onClick: handleCopy,
          "aria-label": copied ? "Đã sao chép" : "Sao chép mã nguồn",
          children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5 text-success" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success", children: "Đã chép" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sao chép" })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "cb rounded-t-none",
        style: maxHeight ? { maxHeight, overflowY: "auto" } : void 0,
        children: showLineNumbers ? /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full border-collapse", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-4 text-right select-none text-txt-3/50 w-[1%] whitespace-nowrap align-top", children: index + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pl-4 border-l border-border whitespace-pre", children: line || " " })
        ] }, index)) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: code })
      }
    )
  ] });
}

const DESIGN_SYSTEM_COLORS = [
  { name: "Navy", hex: "#112250", role: "Background" },
  { name: "Gold", hex: "#FFBD59", role: "Title (Montserrat Bold)" },
  { name: "Cyan", hex: "#00F0FF", role: "Data / Numbers" },
  { name: "Purple", hex: "#6A5BFF", role: "Accent" },
  { name: "Burgundy", hex: "#9C0612", role: "Warning" },
  { name: "Green", hex: "#10B981", role: "Success" },
  { name: "Pink", hex: "#FF6B9D", role: "Love" },
  { name: "White", hex: "#FFFFFF", role: "Text" }
];
const CATEGORIES = [
  {
    key: "trading-course",
    label: "Khóa Học Trading",
    defaultTitle: "Khóa Học Trading Pro",
    defaultDescription: "Starter/TIER 1-3, giao diện chuyên nghiệp với biểu đồ trading, con số lợi nhuận.",
    defaultAspect: "3:4",
    styleNotes: "Biểu đồ nến, con số phát sáng Cyan, glassmorphism cards."
  },
  {
    key: "mindset-course",
    label: "Khóa Học Tư Duy",
    defaultTitle: "7 Ngày Tái Tạo Tần Số",
    defaultDescription: "7 Ngày, Tái Tạo, Tần Số Tình Yêu — thiết kế yên bình, ánh sáng tia tím.",
    defaultAspect: "3:4",
    styleNotes: "Hào quang tím, hạt sáng, nền thiền định."
  },
  {
    key: "shopify-thumb",
    label: "Thumbnail Sản Phẩm Shopify",
    defaultTitle: "Sản Phẩm Nổi Bật",
    defaultDescription: "Thumbnail cho sản phẩm trên Shopify, nền Navy đậm, gold border.",
    defaultAspect: "1:1",
    styleNotes: "Product photography, glassmorphism card nổi bật."
  },
  {
    key: "gemral-social",
    label: "App GEMRAL Social Post",
    defaultTitle: "Bài Đăng GEMRAL",
    defaultDescription: "Social post cho App GEMRAL, thiết kế hiện đại, branding nhất quán.",
    defaultAspect: "1:1",
    styleNotes: "Logo GEMRAL, footer gemral.com, màu thương hiệu."
  },
  {
    key: "fb-ads",
    label: "Facebook Ads",
    defaultTitle: "Quảng Cáo Facebook",
    defaultDescription: "Ad creative cho Facebook, CTA rõ ràng, hình ảnh người Việt thật.",
    defaultAspect: "1:1",
    styleNotes: "CTA button Gold, hình người thật 27-35 tuổi."
  },
  {
    key: "marketing-banner",
    label: "Marketing Banner",
    defaultTitle: "Banner Chiến Dịch",
    defaultDescription: "Banner quảng bá chiến dịch marketing, kích thước linh hoạt.",
    defaultAspect: "16:9",
    styleNotes: "Gradient background, text lớn IN HOA, particles."
  },
  {
    key: "partner-banner",
    label: "GEM Partner (CTV) Banner",
    defaultTitle: "Banner Cộng Tác Viên",
    defaultDescription: "Banner cho cộng tác viên GEM, branding nhất quán, QR code.",
    defaultAspect: "3:4",
    styleNotes: "Branding GEM, thông tin CTV, QR code."
  },
  {
    key: "feature-highlight",
    label: "Feature Highlight",
    defaultTitle: "Tính Năng Nổi Bật",
    defaultDescription: "Scanner, Tarot, Sư Phụ — highlight các tính năng app GEMRAL.",
    defaultAspect: "3:4",
    styleNotes: "Mockup điện thoại, giao diện app, hiệu ứng glow."
  }
];
const ENFORCED_RULES = [
  "Tất cả text bằng tiếng Việt có dấu",
  "Người Việt thật 27-35 tuổi (KHÔNG cartoon)",
  "Glassmorphism cards",
  "Tỷ lệ mặc định: 3:4 (dọc)",
  "Hiệu ứng: Particles + Glow",
  'Footer: "gemral.com" căn giữa'
];
const ASPECT_RATIOS = [
  { value: "3:4", label: "3:4 (Dọc - Mặc định)" },
  { value: "1:1", label: "1:1 (Vuông)" },
  { value: "16:9", label: "16:9 (Ngang)" },
  { value: "9:16", label: "9:16 (Story)" },
  { value: "4:5", label: "4:5 (Instagram)" }
];
function generatePrompt(category, title, description, aspectRatio, styleNotes) {
  return `DESIGN SYSTEM:
Background: Navy đậm #112250
Title Font: Montserrat Bold, Gold #FFBD59
Data/Numbers: Cyan #00F0FF
Accent: Purple #6A5BFF
Warning: Burgundy #9C0612
Success: Green #10B981
Love: Pink #FF6B9D
Text: White #FFFFFF
Footer: "gemral.com" centered

───────────────────────────────────────

HEADER (15% trên cùng):
- Tiêu đề: "${title}"
- Font: Montserrat Bold, Gold #FFBD59
- Kích thước lớn, IN HOA
- Hiệu ứng glow nhẹ xung quanh chữ

NHÂN VẬT TRUNG TÂM (70%):
- Người Việt Nam thật, 27-35 tuổi
- Biểu cảm tự tin, chuyên nghiệp
- Ánh sáng studio, rim light tím #6A5BFF
- ${description}

3 ĐIỂM NỔI BẬT (Glassmorphism Cards):
- Card 1: [Điểm nổi bật 1]
- Card 2: [Điểm nổi bật 2]
- Card 3: [Điểm nổi bật 3]
- Style: background rgba(255,255,255,0.1), backdrop-blur, border rgba(255,255,255,0.2)
- Số liệu dùng Cyan #00F0FF

HIỆU ỨNG NỀN:
- Particles ánh sáng nhỏ
- Glow effect tím nhẹ
- Gradient: Navy #112250 → Deep Blue #0A1628

───────────────────────────────────────

Category: ${category.label}
Aspect Ratio: ${aspectRatio}
Style Notes: ${styleNotes || category.styleNotes}
Footer: "gemral.com" — căn giữa, font nhỏ, White #FFFFFF`;
}
function ImageGenPage() {
  const addToast = useToast((s) => s.addToast);
  const [activeCategory, setActiveCategory] = reactExports.useState(CATEGORIES[0].key);
  const category = reactExports.useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0],
    [activeCategory]
  );
  const [title, setTitle] = reactExports.useState(category.defaultTitle);
  const [description, setDescription] = reactExports.useState(category.defaultDescription);
  const [aspectRatio, setAspectRatio] = reactExports.useState(category.defaultAspect);
  const [styleNotes, setStyleNotes] = reactExports.useState("");
  const [isGenerating, setIsGenerating] = reactExports.useState(false);
  const [generatedPrompt, setGeneratedPrompt] = reactExports.useState("");
  const [copied, setCopied] = reactExports.useState(false);
  const [savedPrompts, setSavedPrompts] = reactExports.useState([]);
  const [showHistory, setShowHistory] = reactExports.useState(false);
  const [selectedColor, setSelectedColor] = reactExports.useState(null);
  const [isEditingPrompt, setIsEditingPrompt] = reactExports.useState(false);
  const handleCategoryChange = reactExports.useCallback((key) => {
    const cat = CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
    setActiveCategory(key);
    setTitle(cat.defaultTitle);
    setDescription(cat.defaultDescription);
    setAspectRatio(cat.defaultAspect);
    setStyleNotes("");
    setGeneratedPrompt("");
  }, []);
  const handleGenerate = reactExports.useCallback(async () => {
    if (!title.trim()) {
      addToast({ type: "warning", message: "Vui lòng nhập tiêu đề." });
      return;
    }
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1e3));
    const prompt = generatePrompt(category, title, description, aspectRatio, styleNotes);
    setGeneratedPrompt(prompt);
    setIsGenerating(false);
    addToast({ type: "success", message: "Đã tạo prompt hình ảnh." });
  }, [category, title, description, aspectRatio, styleNotes, addToast]);
  const handleCopy = reactExports.useCallback(async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
      addToast({ type: "success", message: "Đã sao chép prompt." });
    } catch {
      addToast({ type: "error", message: "Không thể sao chép." });
    }
  }, [generatedPrompt, addToast]);
  const handleSave = reactExports.useCallback(() => {
    if (!generatedPrompt) return;
    const saved = {
      id: `sp-${Date.now()}`,
      category: category.label,
      title,
      prompt: generatedPrompt,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setSavedPrompts((prev) => [saved, ...prev]);
    addToast({ type: "success", message: "Đã lưu prompt vào thư viện." });
  }, [generatedPrompt, category, title, addToast]);
  const handleDeleteSaved = reactExports.useCallback(
    (id) => {
      setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
      addToast({ type: "info", message: "Đã xóa prompt." });
    },
    [addToast]
  );
  const handleLoadSaved = reactExports.useCallback(
    (prompt) => {
      setGeneratedPrompt(prompt.prompt);
      setShowHistory(false);
      addToast({ type: "info", message: "Đã tải prompt từ thư viện." });
    },
    [addToast]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: CATEGORIES.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => handleCategoryChange(cat.key),
        className: `px-3 py-1.5 rounded-badge text-xs font-medium transition-all duration-normal ${activeCategory === cat.key ? "bg-gold text-bg-1 shadow-card-sm" : "bg-glass-bg text-txt-2 hover:text-txt hover:bg-bg-4"}`,
        children: cat.label
      },
      cat.key
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 22, className: "text-gold" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-xl font-semibold text-txt", children: "Tạo Prompt Hình Ảnh" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              label: "Tiêu đề",
              placeholder: "Nhập tiêu đề hình ảnh...",
              value: title,
              onChange: (e) => setTitle(e.target.value),
              icon: Image
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              label: "Mô tả chi tiết",
              placeholder: "Mô tả nội dung, bố cục, yếu tố cần có...",
              value: description,
              onChange: (e) => setDescription(e.target.value),
              rows: 4,
              showCount: true,
              maxLength: 500
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "Tỷ lệ khung hình",
              options: ASPECT_RATIOS,
              value: aspectRatio,
              onChange: setAspectRatio
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              label: "Ghi chú phong cách (tùy chọn)",
              placeholder: "Bổ sung yêu cầu phong cách...",
              value: styleNotes,
              onChange: (e) => setStyleNotes(e.target.value),
              rows: 2,
              hint: `Ghi chú mặc định: ${category.styleNotes}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "gold",
              icon: Sparkles,
              fullWidth: true,
              loading: isGenerating,
              onClick: handleGenerate,
              children: "Tạo Prompt"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { size: 22, className: "text-gold" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Design System GEM" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-2 mb-4", children: DESIGN_SYSTEM_COLORS.map((color) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setSelectedColor(selectedColor?.hex === color.hex ? null : color),
              className: `flex flex-col items-center p-2 rounded-card transition-all duration-normal ${selectedColor?.hex === color.hex ? "bg-bg-4 ring-1 ring-gold" : "hover:bg-glass-bg"}`,
              title: `${color.name} ${color.hex} — ${color.role}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "w-8 h-8 rounded-badge border border-border mb-1",
                    style: { backgroundColor: color.hex }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3 truncate w-full text-center", children: color.name })
              ]
            },
            color.hex
          )) }),
          selectedColor && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-card bg-glass-bg mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "w-12 h-12 rounded-badge border border-border",
                style: { backgroundColor: selectedColor.hex }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-txt", children: selectedColor.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 font-mono", children: selectedColor.hex }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-2", children: selectedColor.role })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-card overflow-hidden", style: { backgroundColor: "#112250" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold mb-1", style: { color: "#FFBD59", fontFamily: "Montserrat, sans-serif" }, children: "TIÊU ĐỀ MẪU" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs mb-1", style: { color: "#00F0FF" }, children: "+45.2% | 1,234 người" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs", style: { color: "#FFFFFF" }, children: "Nội dung mẫu cho preview" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs mt-2 text-center", style: { color: "rgba(255,255,255,0.5)" }, children: "gemral.com" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 18, className: "text-amber" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider", children: "Quy Tắc Bắt Buộc" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: ENFORCED_RULES.map((rule, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 text-xs text-txt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" }),
            rule
          ] }, i)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            icon: Clock,
            fullWidth: true,
            onClick: () => setShowHistory(!showHistory),
            children: showHistory ? "Ẩn Thư Viện" : `Thư Viện Prompt (${savedPrompts.length})`
          }
        )
      ] })
    ] }),
    showHistory && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 20, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Thư Viện Prompt" })
      ] }),
      savedPrompts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 32, className: "mx-auto mb-3 text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3", children: "Chưa có prompt nào được lưu" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: 'Tạo prompt và nhấn "Lưu" để thêm vào thư viện' })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: savedPrompts.map((sp) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-3 p-3 rounded-card bg-glass-bg hover:bg-bg-4 transition-all duration-normal group",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-txt truncate", children: sp.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: sp.category, variant: "default", size: "sm" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: new Date(sp.createdAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleLoadSaved(sp),
                  className: "p-1.5 rounded-badge text-txt-3 hover:text-gold hover:bg-bg-4 transition-all",
                  title: "Tải prompt",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14 })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleDeleteSaved(sp.id),
                  className: "p-1.5 rounded-badge text-txt-3 hover:text-danger hover:bg-bg-4 transition-all",
                  title: "Xóa",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 })
                }
              )
            ] })
          ]
        },
        sp.id
      )) })
    ] }),
    generatedPrompt && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 20, className: "text-gold" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Prompt Đã Tạo" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              size: "sm",
              icon: isEditingPrompt ? Check : PenLine,
              onClick: () => setIsEditingPrompt(!isEditingPrompt),
              children: isEditingPrompt ? "Xong" : "Chỉnh sửa"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", icon: copied ? Check : Copy, onClick: handleCopy, children: copied ? "Đã chép" : "Sao chép" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "gold", size: "sm", icon: Save, onClick: handleSave, children: "Lưu" })
        ] })
      ] }),
      isEditingPrompt ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: generatedPrompt,
          onChange: (e) => setGeneratedPrompt(e.target.value),
          className: "w-full bg-glass-bg text-sm text-txt-2 leading-relaxed p-4 rounded-card border border-border focus:outline-none focus:border-gold/40 resize-none font-mono",
          style: { minHeight: `${Math.max(300, generatedPrompt.split("\n").length * 20)}px` }
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        CodeBlock,
        {
          code: generatedPrompt,
          language: "prompt",
          showLineNumbers: false,
          maxHeight: "400px",
          copyable: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14, className: "text-blue shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: isEditingPrompt ? 'Bạn đang chỉnh sửa prompt. Bấm "Xong" khi hoàn tất.' : "Sao chép prompt này và dán vào công cụ tạo hình ảnh AI (Midjourney, DALL-E, Stable Diffusion)." })
      ] })
    ] }),
    !generatedPrompt && !isGenerating && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "glass", padding: "lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 40, className: "mx-auto mb-3 text-txt-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3", children: 'Chọn thể loại, nhập thông tin và nhấn "Tạo Prompt"' }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "Prompt sẽ tự động áp dụng Design System GEM với đầy đủ màu sắc và quy tắc" })
    ] }) }),
    isGenerating && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "glass", padding: "lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-8 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2", children: "Đang tạo prompt..." })
    ] }) })
  ] });
}

export { ImageGenPage as default };
