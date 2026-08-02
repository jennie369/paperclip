import { r as reactExports, a5 as useBrandRules, j as jsxRuntimeExports, a6 as Shield, y as Search, a7 as Lock, a8 as CircleX, B as BookOpen, F as FileText, P as PenLine, C as CircleCheckBig, a9 as SquareCheckBig, aa as Square, ab as Check, ac as Copy, ad as CircleDot, k as LoaderCircle } from './index-gVNMNdMv.js';

const categories = [
  { id: "lock", label: "Khóa Thương Hiệu", description: "10 tài liệu checklist", icon: Lock, color: "text-cyan" },
  { id: "golden_rule", label: "10 Quy Tắc Vàng", description: "Các quy tắc bắt buộc cho mọi nội dung", icon: Shield, color: "text-gold" },
  { id: "forbidden_term", label: "Từ Cấm", description: "Thuật ngữ không được sử dụng", icon: CircleX, color: "text-danger" },
  { id: "terminology", label: "Thuật Ngữ", description: "Quy ước chuyển đổi Anh-Việt", icon: BookOpen, color: "text-blue" },
  { id: "structure", label: "Cấu Trúc", description: "Quy tắc cấu trúc nội dung", icon: FileText, color: "text-purple" },
  { id: "tone", label: "Giọng Điệu", description: "Quy tắc giọng điệu & phong cách", icon: PenLine, color: "text-emerald" }
];
const BRAND_DOCUMENTS = [
  { id: 1, name: "Sổ Tay Giọng Thương Hiệu", desc: "2 Modes, patterns, forbidden/power phrases", category: "voice" },
  { id: 2, name: "Framework LATC Script", desc: "Hook + 5 phần + CTA + Closing, dual examples", category: "script" },
  { id: 3, name: "Framework TMT Script", desc: "8-9 phần, climax, tôn kính rules", category: "script" },
  { id: 4, name: "Framework Short Clip", desc: "30-70s, Provocative formula", category: "script" },
  { id: 5, name: "Framework Social Media", desc: "30-day campaigns, 30 CTA patterns", category: "social" },
  { id: 6, name: "Hệ Thống Tiêu Đề & Thumbnail", desc: "LATC 4 + TMT 5 formulas", category: "title" },
  { id: 7, name: "Bản Đồ Persona", desc: "7 personas, journey, LTV", category: "persona" },
  { id: 8, name: "Thư Viện Emotional Trigger", desc: "Tần số, nghiệp, hooks", category: "trigger" },
  { id: 9, name: "Chiến Lược CTA & Phễu", desc: "3 funnels, 5-layer CTA", category: "funnel" },
  { id: 10, name: "Danh Sách Cấm & Tuân Thủ", desc: "KHÔNG/NÊN, thuật ngữ VN, TMT rules", category: "compliance" }
];
const DONT_RULES = [
  'Dùng từ "tâm linh" (dùng "tâm thức")',
  "CTA tải tài liệu/PDF tóm tắt",
  "Bullet points trong kịch bản",
  "Nói giá trong video ngắn",
  "Đặt sản phẩm trong tiêu đề",
  "Dùng emoji trong kịch bản",
  "Dồn GEM tools vào cuối",
  "CTA sau phần closing",
  "Tiếng Anh khi có từ Việt tương đương",
  'Gọi "ông/anh" cho Sư Minh Tuệ'
];
const DO_RULES = [
  "Dual examples: 1 crypto + 1 đời sống",
  "Dẫn vào bối cảnh trước ví dụ",
  "GEM tools rải đều mỗi phần",
  "Viết dạng prose flowing, văn xuôi",
  "Kết nối mọi concept về TẦN SỐ",
  "CTA khóa học TRƯỚC closing",
  "Giáo dục > Bán hàng",
  "Transition mượt giữa các phần",
  "Closing nhẹ nhàng, touching",
  "Tiếng Việt thuần túy cho mọi thuật ngữ"
];
const GOLDEN_RULES = [
  { id: "1", name: "DUAL EXAMPLES", description: "Mỗi concept = 1 ví dụ crypto + 1 đời sống. Không được thiếu bất kỳ loại ví dụ nào." },
  { id: "2", name: "DẪN VÀO BỐI CẢNH", description: '"Trong thế giới đầu tư..." / "Ngoài thị trường..." — Luôn dẫn vào bối cảnh trước ví dụ.' },
  { id: "3", name: "GEM TOOLS rải đều", description: "Rải GEM tools trong từng phần, KHÔNG dồn cuối. Mỗi phần có ít nhất 1 tool reference." },
  { id: "4", name: "Tiếng Việt thuần túy", description: "Không dùng từ tiếng Anh khi có tương đương tiếng Việt: entry→điểm mua, stop loss→điểm cắt lỗ..." },
  { id: "5", name: "Prose flowing", description: "KHÔNG bullet points, KHÔNG dạng liệt kê. Viết dạng văn xuôi mượt mà, chảy tràn." },
  { id: "6", name: "Tần số trung tâm", description: "TẦN SỐ là USP cốt lõi của Jennie. Mọi concept đều phải kết nối về tần số & nghiệp lực." },
  { id: "7", name: "CTA trước closing", description: "CTA khóa học phải đặt TRƯỚC phần closing. Không được đặt CTA sau lời kết." },
  { id: "8", name: "Giáo dục > Bán hàng", description: "Sản phẩm KHÔNG trong tiêu đề. Ưu tiên giáo dục, share value trước khi mention sản phẩm." },
  { id: "9", name: "Pattern transition", description: '"Ok, đó là sự thật thứ [N]. Nhưng..." — Dùng câu chuyển mượt giữa các phần.' },
  { id: "10", name: "Closing touching", description: "Kết thúc nhẹ nhàng, touching, truyền cảm hứng. Không kêu gọi mạnh ở closing." }
];
const FORBIDDEN_TERMS = [
  { term: "tâm linh", replacement: "tâm thức", severity: "critical" },
  { term: "dạy crypto", replacement: "giúp bạn hiểu năng lượng đồng tiền", severity: "critical" },
  { term: "đảm bảo lợi nhuận", replacement: null, severity: "critical" },
  { term: "giàu nhanh", replacement: null, severity: "critical" },
  { term: "ông/anh (cho sư)", replacement: "Thầy/Ngài", severity: "high" }
];
const TERM_CONVERSIONS = [
  { en: "entry", vi: "điểm mua" },
  { en: "stop loss", vi: "điểm cắt lỗ" },
  { en: "take profit", vi: "điểm chốt lời" },
  { en: "win rate", vi: "tỷ lệ thành công" },
  { en: "scanner", vi: "công cụ quét" },
  { en: "whale tracker", vi: "theo dõi cá mập" },
  { en: "support", vi: "hỗ trợ" },
  { en: "resistance", vi: "kháng cự" },
  { en: "breakout", vi: "phá vỡ" },
  { en: "trend", vi: "xu hướng" },
  { en: "portfolio", vi: "danh mục" },
  { en: "leverage", vi: "đòn bẩy" },
  { en: "mindset", vi: "tư duy" },
  { en: "healing", vi: "chữa lành" },
  { en: "meditation", vi: "thiền định" },
  { en: "frequency", vi: "tần số" },
  { en: "vibration", vi: "rung động" },
  { en: "karma", vi: "nghiệp" }
];
function BrandVoicePage() {
  const [activeCategory, setActiveCategory] = reactExports.useState("lock");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [checkedDocs, setCheckedDocs] = reactExports.useState(/* @__PURE__ */ new Set());
  const [copiedPrompt, setCopiedPrompt] = reactExports.useState(false);
  const { data: dbRules, isLoading } = useBrandRules();
  const toggleDoc = (id) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const lockProgress = Math.round(checkedDocs.size / BRAND_DOCUMENTS.length * 100);
  const isLocked = checkedDocs.size === BRAND_DOCUMENTS.length;
  const handleCopyPrompt = async () => {
    const promptText = `Bạn là Jennie Uyen Chu — "Thức Tỉnh Tâm Thức" YouTube (277K+ subscribers).
USP: Jennie giải mã TẦN SỐ và NGHIỆP LỰC đằng sau mọi sự kiện.
3 Track: Wealth 30% / Wellness 30% / Integration 40%.
2 Modes: MODE 1 (Trầm-Tĩnh-Thủ Thỉ) + MODE 2 (Đanh-Thép-Provocative).
10 Quy Tắc Vàng: Dual Examples, Context Lead-in, GEM Tools Spread, Vietnamese Purity, Prose Flowing, Frequency-Centered, CTA Before Closing, Education > Sales, Pattern Transitions, Touching Closing.
Forbidden: "tâm linh"→"tâm thức", NO document CTAs, NO bullet points, NO English terms.`;
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
    }
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "font-heading text-2xl font-bold text-txt flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 24, className: "text-gold" }),
          "Brand Voice Rules"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3 mt-1", children: "Quản lý quy tắc giọng điệu thương hiệu Jennie Uyen Chu" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Tìm kiếm quy tắc...",
            className: "fi pl-9 text-sm w-64"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto pb-2", children: categories.map((cat) => {
      const Icon = cat.icon;
      const isActive = activeCategory === cat.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setActiveCategory(cat.id),
          className: `flex items-center gap-2 px-4 py-2 rounded-card text-sm whitespace-nowrap transition-all
                ${isActive ? "bg-bg-2 border border-gold/30 text-txt" : "bg-glass-bg border border-border text-txt-3 hover:text-txt hover:border-border-2"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 16, className: isActive ? cat.color : "text-txt-3" }),
            cat.label
          ]
        },
        cat.id
      );
    }) }),
    activeCategory === "lock" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `glass-card p-6 border ${isLocked ? "border-success/30" : "border-gold/20"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-12 h-12 rounded-card flex items-center justify-center ${isLocked ? "bg-success/10" : "bg-gold/10"}`, children: isLocked ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 24, className: "text-success" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { size: 24, className: "text-gold" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-semibold text-txt", children: isLocked ? "Thương Hiệu Đã Khóa" : "Khóa Giọng Thương Hiệu" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: isLocked ? "Tất cả 10 tài liệu đã được xác nhận. AI sẽ tuân thủ nghiêm ngặt." : `Xác nhận ${checkedDocs.size}/10 tài liệu để khóa thương hiệu.` })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-2xl font-bold ${isLocked ? "text-success" : "text-gold"}`, children: [
            lockProgress,
            "%"
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 bg-bg-4 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `h-full rounded-full transition-all duration-500 ${isLocked ? "bg-success" : "bg-gradient-to-r from-gold to-purple"}`,
            style: { width: `${lockProgress}%` }
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-txt mb-3", children: "10 Tài Liệu Thương Hiệu" }),
        BRAND_DOCUMENTS.map((doc) => {
          const checked = checkedDocs.has(doc.id);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => toggleDoc(doc.id),
              className: `card p-4 w-full flex items-center gap-4 text-left transition-all ${checked ? "border-success/20 bg-success/5" : "hover:border-border-2"}`,
              children: [
                checked ? /* @__PURE__ */ jsxRuntimeExports.jsx(SquareCheckBig, { size: 20, className: "text-success shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 20, className: "text-txt-3 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-sm font-medium ${checked ? "text-success" : "text-txt"}`, children: [
                    doc.id,
                    ". ",
                    doc.name
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-0.5", children: doc.desc })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3 bg-glass-bg px-2 py-0.5 rounded-badge shrink-0", children: doc.category })
              ]
            },
            doc.id
          );
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-md font-semibold text-txt flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16, className: "text-gold" }),
            "Master System Prompt"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleCopyPrompt,
              className: "btn btn-gh text-xs flex items-center gap-1.5",
              children: copiedPrompt ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 14, className: "text-success" }),
                " Đã sao chép"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 14 }),
                " Sao chép"
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-card bg-glass-bg font-mono text-xs text-txt-2 leading-relaxed max-h-48 overflow-y-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: 'Bạn là Jennie Uyen Chu — "Thức Tỉnh Tâm Thức" YouTube (277K+ subscribers).' }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "USP: Jennie giải mã TẦN SỐ và NGHIỆP LỰC đằng sau mọi sự kiện." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "3 Track: Wealth 30% / Wellness 30% / Integration 40%." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "2 Modes: MODE 1 (Trầm-Tĩnh-Thủ Thỉ) + MODE 2 (Đanh-Thép-Provocative)." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "10 Quy Tắc Vàng: Dual Examples, Context Lead-in, GEM Tools Spread, Vietnamese Purity, Prose Flowing, Frequency-Centered, CTA Before Closing, Education > Sales, Pattern Transitions, Touching Closing." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: 'Forbidden: "tâm linh"→"tâm thức", NO document CTAs, NO bullet points, NO English terms.' })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-md font-semibold text-danger mb-3 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 16 }),
            "KHÔNG"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: DONT_RULES.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 14, className: "text-danger shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2", children: rule })
          ] }, rule)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-md font-semibold text-success mb-3 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 16 }),
            "NÊN"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: DO_RULES.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2", children: rule })
          ] }, rule)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-md font-semibold text-txt mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleDot, { size: 16, className: "text-gold" }),
          "Tổng Quan Tuân Thủ"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g4", children: [
          { label: "Quy Tắc Vàng", count: "10/10", pct: 100, color: "text-gold", bg: "bg-gold" },
          { label: "Từ Cấm", count: "5 terms", pct: 100, color: "text-danger", bg: "bg-danger" },
          { label: "Thuật Ngữ", count: "18 entries", pct: 100, color: "text-blue", bg: "bg-blue" },
          { label: "Cấu Trúc", count: "2 formats", pct: 100, color: "text-purple", bg: "bg-purple" }
        ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-lg font-bold ${item.color}`, children: item.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xxs text-txt-3 mt-1", children: item.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 bg-bg-4 rounded-full mt-2 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full ${item.bg}`, style: { width: `${item.pct}%` } }) })
        ] }, item.label)) })
      ] })
    ] }),
    activeCategory === "golden_rule" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2", children: "10 quy tắc vàng bắt buộc áp dụng cho mọi nội dung LATC, TMT, và Clip Ngắn." }),
      GOLDEN_RULES.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card p-4 border-l-[3px] border-l-gold", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-badge bg-gold/10 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-gold", children: rule.id }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-txt mb-1", children: rule.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 leading-relaxed", children: rule.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 18, className: "text-success shrink-0" })
      ] }) }, rule.id))
    ] }),
    activeCategory === "forbidden_term" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2", children: "Các thuật ngữ bị cấm tuyệt đối trong mọi nội dung. Vi phạm sẽ bị đánh dấu nghiêm trọng." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border bg-glass-bg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xs font-medium text-txt-3 px-4 py-3", children: "Từ cấm" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xs font-medium text-txt-3 px-4 py-3", children: "Thay thế" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xs font-medium text-txt-3 px-4 py-3", children: "Mức độ" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: FORBIDDEN_TERMS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-sm text-danger bg-danger/10 px-2 py-0.5 rounded", children: item.term }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: item.replacement ? /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-sm text-success bg-success/10 px-2 py-0.5 rounded", children: item.replacement }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Xóa hoàn toàn" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-medium ${item.severity === "critical" ? "text-danger" : "text-amber-400"}`, children: item.severity === "critical" ? "Nghiêm trọng" : "Cao" }) })
        ] }, item.term)) })
      ] }) })
    ] }),
    activeCategory === "terminology" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2", children: "Bảng chuyển đổi thuật ngữ Anh-Việt. Tất cả nội dung phải sử dụng tiếng Việt thuần túy." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border bg-glass-bg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xs font-medium text-txt-3 px-4 py-3", children: "English" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xs font-medium text-txt-3 px-4 py-3", children: "Tiếng Việt" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: TERM_CONVERSIONS.filter(
          (t) => !searchQuery || t.en.includes(searchQuery.toLowerCase()) || t.vi.includes(searchQuery.toLowerCase())
        ).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-sm text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded", children: item.en }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-sm text-success bg-success/10 px-2 py-0.5 rounded", children: item.vi }) })
        ] }, item.en)) })
      ] }) })
    ] }),
    activeCategory === "structure" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-gold mb-3", children: "Cấu Trúc LATC" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mb-3", children: "4.000-5.500 từ, 20-35 phút" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [
          { name: "HOOK", words: "500 từ", pct: "10%", color: "bg-gold" },
          { name: "PHẦN 1-5", words: "600-800 từ/phần", pct: "70%", color: "bg-purple" },
          { name: "CTA KHÓA HỌC", words: "~400 từ", pct: "10%", color: "bg-blue" },
          { name: "CLOSING", words: "200 từ", pct: "5%", color: "bg-emerald" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${s.color}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2 flex-1", children: s.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: s.words }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3 w-8 text-right", children: s.pct })
        ] }, s.name)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-purple mb-3", children: "Cấu Trúc TMT" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mb-3", children: "4.500-5.500 từ, 30-40 phút" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [
          { name: "INTRO", words: "300-400 từ", color: "bg-gold" },
          { name: "TỔNG QUAN", words: "400-500 từ", color: "bg-purple" },
          { name: "MAIN x4", words: "500-700 từ/phần", color: "bg-blue" },
          { name: "CLIMAX", words: "700-900 từ", color: "bg-danger" },
          { name: "CLOSING", words: "500-600 từ", color: "bg-emerald" },
          { name: "CTA 4 lớp", words: "200-250 từ", color: "bg-cyan" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${s.color}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2 flex-1", children: s.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: s.words })
        ] }, s.name)) })
      ] })
    ] }),
    activeCategory === "tone" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 border-l-[3px] border-l-purple", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-purple mb-2", children: "MODE 1: Trầm - Tĩnh - Thủ Thỉ" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 mb-3", children: "Sang, Thấm, Sâu — Giọng của người dẫn đường trầm tĩnh." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-xs text-txt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Phù hợp: LATC, Wellness content, Healing" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Personas: mentor, storyteller, confidante" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 border-l-[3px] border-l-gold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-gold mb-2", children: "MODE 2: Đanh - Thép - Provocative" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 mb-3", children: "Brutal Honesty — Pattern-interrupt, thách thức tư duy." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-xs text-txt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Phù hợp: TMT Drama, Short Clips" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Personas: provocateur, analyst" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 border-l-[3px] border-l-cyan", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-md font-semibold text-cyan mb-2", children: "USP Cốt Lõi" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "text-sm text-txt-2 italic leading-relaxed border-l-2 border-cyan/30 pl-3", children: "“Jennie không chỉ giải thích CHUYỆN GÌ xảy ra, mà còn giải mã TẦN SỐ và NGHIỆP LỰC đằng sau — để bạn không chỉ HIỂU, mà còn KHÔNG LẶP LẠI sai lầm đó.”" })
      ] })
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-txt-3" }) }),
    dbRules && dbRules.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-lg font-semibold text-txt mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 18, className: "text-gold" }),
        "Quy Tắc Từ Cơ Sở Dữ Liệu (",
        dbRules.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: dbRules.slice(0, 10).map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${rule.rule_type === "forbidden" ? "bg-danger" : rule.rule_type === "required" ? "bg-success" : "bg-amber-400"}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt font-medium truncate", children: rule.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 truncate", children: rule.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: rule.category })
      ] }, rule.id)) })
    ] })
  ] });
}

export { BrandVoicePage as default };
