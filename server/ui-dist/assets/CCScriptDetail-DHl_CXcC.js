const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/generationJobService-DTWrQm4M.js","assets/index-Cxd0f6Om.js","assets/index-DlAKZo4-.css"])))=>i.map(i=>d[i]);
import { o as createLucideIcon, j as jsxRuntimeExports, r as reactExports, k as LoaderCircle, cf as useParams, cg as useSearchParams, ae as useNavigate, bl as useToast, ch as useScript, ci as useSocialPost, cj as useUpdateScript, ck as useUpdateSocialPost, _ as __vitePreload, a4 as Globe, C as CircleCheckBig, n as Send, cl as ArrowLeft, bm as Card, t as TriangleAlert, bc as Button, F as FileText, c2 as Pencil, c as Clock, bg as Badge, E as Eye, P as PenLine, cm as History, ab as Check, ac as Copy, az as FileCode, a2 as Download, bi as ChevronUp, bj as ChevronDown, a3 as Monitor, aA as Save, X, a6 as Shield, Z as Zap, B as BookOpen, d as Sparkles, bh as ProgressBar, I as Image, bR as Upload, e as Share2, b3 as CircleCheck, x as ExternalLink, z as CCSelect, m as Mail, bT as Newspaper, cn as CalendarPlus, co as JobLogViewerPanel } from './index-Cxd0f6Om.js';

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$2 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M12 18v-6", key: "17g6i2" }],
  ["path", { d: "m9 15 3 3 3-3", key: "1npd3o" }]
];
const FileDown = createLucideIcon("file-down", __iconNode$2);

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$1 = [
  ["path", { d: "m15 14 5-5-5-5", key: "12vg1m" }],
  ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13", key: "6uklza" }]
];
const Redo2 = createLucideIcon("redo-2", __iconNode$1);

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  ["path", { d: "M9 14 4 9l5-5", key: "102s5s" }],
  ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11", key: "f3b9sd" }]
];
const Undo2 = createLucideIcon("undo-2", __iconNode);

const STATUS_CONFIG = {
  draft: {
    label: "Bản Nháp",
    variant: "info",
    next: "review",
    nextLabel: "Gửi Duyệt",
    nextIcon: Send
  },
  review: {
    label: "Chờ Duyệt",
    variant: "gold",
    next: "approved",
    nextLabel: "Duyệt",
    nextIcon: CircleCheckBig
  },
  approved: {
    label: "Đã Duyệt",
    variant: "success",
    next: "published",
    nextLabel: "Xuất Bản",
    nextIcon: Globe
  },
  published: {
    label: "Đã Xuất Bản",
    variant: "success"
  }
};
const TRACK_LABELS = {
  wealth: "Tài Chính (Wealth)",
  wellness: "Tâm Thức (Wellness)",
  integration: "Tích Hợp (Integration)"
};
const MODE_LABELS = {
  MODE_1: "MODE 1 — Giáo Dục Nhẹ",
  MODE_2: "MODE 2 — Cảm Xúc Sâu",
  MODE_3: "MODE 3 — Kết Hợp"
};
const PERSONA_LABELS = {
  "career-woman": "Career Woman 28-35",
  "spiritual-seeker": "Spiritual Seeker 25-40",
  "young-trader": "Young Trader 22-30",
  "healing-mom": "Healing Mom 30-45"
};
const DEFAULT_GEM_TOOLS = [
  { key: "P1", label: "Thở Thanh Lọc", present: false },
  { key: "P2", label: "Template Tần Số", present: false },
  { key: "P3", label: "Thiền Dẫn Dắt", present: false },
  { key: "P4", label: "Tần Số Tình Yêu", present: false },
  { key: "P5", label: "Vision Board", present: false }
];
function countWords(text) {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
function estimateDuration(wordCount) {
  const minutes = Math.round(wordCount / 150);
  if (minutes < 1) return "< 1 phút";
  return `~${minutes} phút`;
}
function computeBrandScore(text) {
  const violations = [];
  let score = 100;
  if (!text) return { score: 0, violations: [] };
  const bannedWords = ["shopify", "amazon", "clickbank"];
  for (const word of bannedWords) {
    if (text.toLowerCase().includes(word)) {
      violations.push({
        rule: `Tên sản phẩm bên ngoài: "${word}"`,
        location: "Nội dung kịch bản",
        severity: "error"
      });
      score -= 15;
    }
  }
  const viChars = text.match(/[\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ec\u00ed\u1ec9\u0129\u1ecb\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u1ef3\u00fd\u1ef7\u1ef9\u1ef5\u0111]/gi);
  const totalChars = text.replace(/\s/g, "").length;
  if (totalChars > 100 && viChars) {
    const ratio = viChars.length / totalChars;
    if (ratio < 0.02) {
      violations.push({
        rule: "Tỷ lệ dấu tiếng Việt quá thấp",
        location: "Toàn bộ nội dung",
        severity: "warning"
      });
      score -= 8;
    }
  }
  const sentences = text.split(/[.!?]+/);
  const englishSentences = sentences.filter((s) => /^[a-zA-Z\s,;:'"()-]+$/.test(s.trim()) && s.trim().length > 20);
  if (englishSentences.length > 0) {
    violations.push({
      rule: `${englishSentences.length} câu tiếng Anh phát hiện`,
      location: "Nội dung kịch bản",
      severity: "warning"
    });
    score -= englishSentences.length * 5;
  }
  return { score: Math.max(0, Math.min(100, score)), violations };
}
function detectGemTools(text) {
  if (!text) return DEFAULT_GEM_TOOLS;
  const lower = text.toLowerCase();
  return DEFAULT_GEM_TOOLS.map((tool) => ({
    ...tool,
    present: lower.includes(tool.label.toLowerCase()),
    section: lower.includes(tool.label.toLowerCase()) ? "Phát hiện trong nội dung" : void 0
  }));
}
function tryParseJsonContent(text) {
  let str = text.trim();
  if (str.startsWith("```")) {
    str = str.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "");
  }
  try {
    return JSON.parse(str.trim());
  } catch {
    return null;
  }
}
function isHtmlContent(text) {
  if (!text) return false;
  const trimmed = text.trim();
  const stripped = trimmed.startsWith("```") ? trimmed.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "").trim() : trimmed;
  return /^<!DOCTYPE html>/i.test(stripped) || /^<html/i.test(stripped) || stripped.includes("<body") && stripped.includes("</body>") || stripped.includes("<table") && stripped.includes("</table>") || /^<meta/i.test(stripped) || /^<div/i.test(stripped);
}
function stripCodeFence(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }
  return trimmed;
}
function isTabularArray(arr) {
  if (!arr || arr.length < 1) return false;
  if (!arr.every((item) => item && typeof item === "object" && !Array.isArray(item))) return false;
  const keys0 = Object.keys(arr[0]).sort().join(",");
  return arr.every((item) => Object.keys(item).sort().join(",") === keys0);
}
function renderTable(arr) {
  if (!arr || arr.length === 0) return null;
  const keys = Object.keys(arr[0]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-card border border-border my-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "bg-glass-bg/50", children: keys.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2.5 text-left text-xs font-bold text-gold uppercase tracking-wider border-b border-border whitespace-nowrap", children: key.replace(/_/g, " ") }, key)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: arr.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: `border-b border-border/20 ${i % 2 === 0 ? "" : "bg-glass-bg/20"} hover:bg-gold/5 transition-colors`, children: keys.map((key) => {
      const val = row[key];
      const isNum = typeof val === "number";
      const isStr = typeof val === "string";
      return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `px-3 py-2.5 ${isNum ? "text-gold font-mono text-right" : "text-txt-2"} ${isStr && val.length > 200 ? "max-w-md" : isStr && val.length > 80 ? "max-w-sm" : ""} min-w-[80px]`, children: typeof val === "object" ? JSON.stringify(val) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "whitespace-pre-wrap break-words", children: String(val ?? "") }) }, key);
    }) }, i)) })
  ] }) });
}
function renderJsonStructured(obj) {
  const renderValue = (val, depth = 0) => {
    if (val === null || val === void 0) return null;
    if (typeof val === "string") {
      if (val.length > 200) {
        return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 leading-relaxed whitespace-pre-wrap", children: val });
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2", children: val });
    }
    if (typeof val === "number" || typeof val === "boolean") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gold font-mono", children: String(val) });
    }
    if (Array.isArray(val)) {
      if (isTabularArray(val)) {
        return renderTable(val);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 ml-1", children: val.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gold shrink-0 text-xs font-bold mt-0.5", children: [
          i + 1,
          "."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: typeof item === "object" ? renderObject(item, depth + 1) : renderValue(item, depth + 1) })
      ] }, i)) });
    }
    if (typeof val === "object") {
      return renderObject(val, depth + 1);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-3", children: JSON.stringify(val) });
  };
  const renderObject = (obj2, depth = 0) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `space-y-4 ${depth > 0 ? "pl-4 border-l-2 border-gold/20 ml-1" : ""}`, children: Object.entries(obj2).map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const isLongText = typeof val === "string" && val.length > 100;
      const isArray = Array.isArray(val);
      const isObject = val && typeof val === "object" && !isArray;
      if (isLongText) {
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-gold inline-block" }),
            label
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 leading-relaxed whitespace-pre-wrap pl-3.5", children: val })
        ] }, key);
      }
      if (isArray || isObject) {
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-gold inline-block" }),
            label,
            isArray && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-txt-3 font-normal normal-case", children: [
              "(",
              val.length,
              ")"
            ] })
          ] }),
          renderValue(val, depth)
        ] }, key);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt-3 uppercase tracking-wider shrink-0 min-w-[120px]", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-border", children: "|" }),
        renderValue(val, depth)
      ] }, key);
    }) });
  };
  return renderObject(obj);
}
function parseMarkdownTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = lines[i].trim().split("|").filter(Boolean).map((c) => c.trim());
    rows.push(cells);
    i++;
  }
  if (rows.length < 2) return null;
  const isSep = rows[1].every((c) => /^[-:]+$/.test(c));
  if (!isSep) return null;
  return { headers: rows[0], data: rows.slice(2), endIdx: i };
}
function renderMarkdownContent(text) {
  const jsonObj = tryParseJsonContent(text);
  if (jsonObj && typeof jsonObj === "object") {
    return renderJsonStructured(jsonObj);
  }
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  const renderBold = (t) => {
    const parts = t.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-txt font-bold", children: part.slice(2, -2) }, index);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: part }, index);
    });
  };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      i++;
      continue;
    }
    if (trimmed.startsWith("|")) {
      const table = parseMarkdownTable(lines, i);
      if (table) {
        elements.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-card border border-border my-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "bg-glass-bg/50", children: table.headers.map((h, hi) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2.5 text-left text-xs font-bold text-gold uppercase tracking-wider border-b border-border whitespace-nowrap", children: h }, hi)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: table.data.map((row, ri) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: `border-b border-border/20 ${ri % 2 === 0 ? "" : "bg-glass-bg/20"} hover:bg-gold/5 transition-colors`, children: row.map((cell, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2.5 text-txt-2", children: renderBold(cell) }, ci)) }, ri)) })
          ] }) }, `table-${i}`)
        );
        i = table.endIdx;
        continue;
      }
    }
    if (line.startsWith("## ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-heading font-bold text-gold mt-6 mb-3", children: line.slice(3) }, i)
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-heading font-semibold text-txt mt-4 mb-2", children: line.slice(4) }, i)
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 mb-1.5 pl-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2 leading-relaxed", children: renderBold(trimmed.slice(2)) })
        ] }, i)
      );
      i++;
      continue;
    }
    if (trimmed === "") {
      elements.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2" }, i));
      i++;
      continue;
    }
    elements.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 leading-relaxed mb-3", children: renderBold(line) }, i)
    );
    i++;
  }
  return elements;
}
function ScriptDetailPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 32, className: "animate-spin text-gold" }) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScriptDetailContent, {}) });
}
function ScriptDetailContent() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToast((s) => s.addToast);
  const isNew = params?.id === "new";
  const scriptId = isNew ? null : params?.id;
  const isSocialPost = searchParams?.get("source") === "social_post";
  const scriptQuery = useScript(scriptId);
  const postQuery = useSocialPost(scriptId);
  const updateScriptMutation = useUpdateScript();
  const updatePostMutation = useUpdateSocialPost();
  const { data: rawData, isLoading: scriptLoading, error: scriptError } = scriptQuery;
  const { data: postData, isLoading: postLoading, error: postError } = postQuery;
  const defaultNewScript = {
    title: "Kịch Bản Mới",
    content_type: "latc",
    status: "draft",
    body: ""
  };
  const script = isNew ? defaultNewScript : isSocialPost ? postData : rawData ?? postData;
  const isLoading = isNew ? false : isSocialPost ? postLoading : scriptLoading || !rawData && postLoading;
  const error = isNew ? null : isSocialPost ? postError : rawData ? null : scriptError && postError ? scriptError : null;
  const resolvedIsSocialPost = isSocialPost || !rawData && !!postData && !isNew;
  const updateMutation = resolvedIsSocialPost ? updatePostMutation : updateScriptMutation;
  const [body, setBody] = reactExports.useState("");
  const [isDirty, setIsDirty] = reactExports.useState(false);
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [copied, setCopied] = reactExports.useState(false);
  const [isEditing, setIsEditing] = reactExports.useState(isNew);
  const [showVersions, setShowVersions] = reactExports.useState(false);
  const [showLogPanel, setShowLogPanel] = reactExports.useState(false);
  const [isEditingTitle, setIsEditingTitle] = reactExports.useState(false);
  const [editableTitle, setEditableTitle] = reactExports.useState("");
  const [logModalOpen, setLogModalOpen] = reactExports.useState(false);
  const [linkedJobId, setLinkedJobId] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!scriptId) {
      setLinkedJobId(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/ops/content-pipeline/jobs/recent?limit=50`).then((r) => r.json()).then((data) => {
      if (cancelled) return;
      const jobs = data.jobs || [];
      const match = jobs.find((j) => {
        try {
          const od = typeof j.output_data === "string" ? JSON.parse(j.output_data) : j.output_data || {};
          return od?.script_id === scriptId || j.entity_id === scriptId;
        } catch {
          return j.entity_id === scriptId;
        }
      });
      setLinkedJobId(match?.id || null);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);
  const [showExportMenu, setShowExportMenu] = reactExports.useState(false);
  const autoSaveRef = reactExports.useRef(null);
  const undoStack = reactExports.useRef([]);
  const redoStack = reactExports.useRef([]);
  const isUndoRedo = reactExports.useRef(false);
  const [showChatPanel, setShowChatPanel] = reactExports.useState(false);
  const [iterateHistory, setIterateHistory] = reactExports.useState([]);
  const [iterateInput, setIterateInput] = reactExports.useState("");
  const [iterating, setIterating] = reactExports.useState(false);
  const [feedbackNotes, setFeedbackNotes] = reactExports.useState("");
  const [uploadedImages, setUploadedImages] = reactExports.useState([]);
  const [uploading, setUploading] = reactExports.useState(false);
  const [publishing, setPublishing] = reactExports.useState(null);
  const [publishResults, setPublishResults] = reactExports.useState([]);
  const [facebookPages, setFacebookPages] = reactExports.useState([]);
  const [selectedFbPage, setSelectedFbPage] = reactExports.useState("");
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [feedbackSending, setFeedbackSending] = reactExports.useState(null);
  const [feedbackSent, setFeedbackSent] = reactExports.useState(/* @__PURE__ */ new Set());
  const fileInputRef = reactExports.useRef(null);
  const [newsPublishing, setNewsPublishing] = reactExports.useState(false);
  const [newsPublished, setNewsPublished] = reactExports.useState(null);
  const [showNewsSchedule, setShowNewsSchedule] = reactExports.useState(false);
  const [newsScheduleDate, setNewsScheduleDate] = reactExports.useState("");
  const [newsScheduleTime, setNewsScheduleTime] = reactExports.useState("08:00");
  const [metaFields, setMetaFields] = reactExports.useState({
    content_type: "latc",
    job_type: "script",
    pillar: "trading",
    track: "wealth",
    persona: "jennie_mentor",
    writing_mode: "mode_1_calm",
    brand_voice: "jennie",
    publish_mode: "scheduled",
    posted_account: "default",
    model: "",
    provider: "",
    sop_id: ""
  });
  reactExports.useEffect(() => {
    if (script && !isDirty) {
      const extraMeta = script.metadata || {};
      setMetaFields((prev) => ({
        ...prev,
        content_type: script.content_type || "latc",
        job_type: script.job_type || "script",
        pillar: script.pillar || "trading",
        track: script.track || "wealth",
        persona: script.persona || "jennie_mentor",
        writing_mode: script.writing_mode || "mode_1_calm",
        brand_voice: script.brand_voice || "jennie",
        publish_mode: script.publish_mode || "scheduled",
        posted_account: script.posted_account || "default",
        model: script.model || "",
        provider: script.provider || "",
        sop_id: script.sop_id || "",
        email_day: extraMeta.email_day || "",
        from_email: extraMeta.from_email || "",
        email_template: extraMeta.email_template || "",
        audience_type: extraMeta.audience_type || "",
        preview_text: extraMeta.preview_text || "",
        campaign_type: extraMeta.campaign_type || ""
      }));
    }
  }, [script, isDirty]);
  const handleMetaChange = (field, value) => {
    setMetaFields((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };
  const [emailFrom, setEmailFrom] = reactExports.useState("Gemral <hello@gemral.com>");
  const [emailTo, setEmailTo] = reactExports.useState("");
  const [emailBcc, setEmailBcc] = reactExports.useState("");
  const [emailSubject, setEmailSubject] = reactExports.useState("");
  const [emailSending, setEmailSending] = reactExports.useState(false);
  const [showEmailPanel, setShowEmailPanel] = reactExports.useState(false);
  const emailIframeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    fetch("/api/social/publish").then((r) => r.json()).then((data) => {
      if (data.success && data.pages?.length) {
        setFacebookPages(data.pages);
        setSelectedFbPage(data.pages[0].id);
      }
    }).catch(() => {
    });
  }, []);
  reactExports.useEffect(() => {
    if (!isDirty && script) {
      const text = script.body ?? script.content ?? "";
      if (text) setBody(text);
    }
    if (script?.title && !emailSubject) {
      setEmailSubject(script.title);
    }
  }, [script, isDirty]);
  reactExports.useEffect(() => {
    if (!isDirty || !scriptId || isNew) return;
    autoSaveRef.current = setInterval(async () => {
      try {
        const fieldName = resolvedIsSocialPost ? "content" : "body";
        await updateMutation.mutateAsync({
          id: scriptId,
          updates: { [fieldName]: body }
        });
        setIsDirty(false);
      } catch {
      }
    }, 3e4);
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [isDirty, scriptId, isNew, body, updateMutation, resolvedIsSocialPost]);
  const wordCount = reactExports.useMemo(() => countWords(body), [body]);
  const duration = reactExports.useMemo(() => estimateDuration(wordCount), [wordCount]);
  const brandAnalysis = reactExports.useMemo(() => computeBrandScore(body), [body]);
  const gemTools = reactExports.useMemo(() => detectGemTools(body), [body]);
  const presentToolCount = gemTools.filter((t) => t.present).length;
  const imgMarker = "===IMAGE_PROMPT===";
  const mainContent = reactExports.useMemo(() => {
    let text = body;
    const idx = text.indexOf(imgMarker);
    if (idx !== -1) text = text.slice(0, idx).trim();
    const preamblePatterns = [
      /^(I will |I'll |Let me |Now I |First,? I |OK,? |Okay,? |Sure,? |Here is |Here's )/i,
      /^(Tôi sẽ |Để tôi |Bây giờ tôi |Trước tiên |Được rồi |Dưới đây là )/i,
      /^(I need to |I should |I'm going to |Let's |Now let me )/i,
      /^(reading the |start by |begin by |looking at )/i
    ];
    const lines = text.split("\n");
    let startIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) {
        startIdx = i + 1;
        continue;
      }
      if (preamblePatterns.some((p) => p.test(trimmed))) {
        startIdx = i + 1;
        continue;
      }
      break;
    }
    if (startIdx > 0) {
      text = lines.slice(startIdx).join("\n").trim();
    }
    return text;
  }, [body]);
  const derivedImagePrompt = reactExports.useMemo(() => {
    const idx = body.indexOf(imgMarker);
    return idx !== -1 ? body.slice(idx + imgMarker.length).trim() : "";
  }, [body]);
  const [editableImagePrompt, setEditableImagePrompt] = reactExports.useState("");
  const [isEditingImagePrompt, setIsEditingImagePrompt] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!isEditingImagePrompt) {
      setEditableImagePrompt(derivedImagePrompt);
    }
  }, [derivedImagePrompt, isEditingImagePrompt]);
  const imagePrompt = isEditingImagePrompt ? editableImagePrompt : derivedImagePrompt;
  const handleSaveImagePrompt = reactExports.useCallback(() => {
    const idx = body.indexOf(imgMarker);
    if (idx !== -1) {
      const newBody = body.slice(0, idx).trim() + "\n\n" + imgMarker + "\n" + editableImagePrompt;
      setBody(newBody);
      setIsDirty(true);
    }
    setIsEditingImagePrompt(false);
  }, [body, editableImagePrompt, imgMarker]);
  const status = script?.status ?? "draft";
  const statusConfig = STATUS_CONFIG[status];
  const handleBodyChange = reactExports.useCallback((e) => {
    const newVal = e.target.value;
    if (!isUndoRedo.current) {
      undoStack.current.push(body);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
    }
    isUndoRedo.current = false;
    setBody(newVal);
    setIsDirty(true);
  }, [body]);
  const handleUndo = reactExports.useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(body);
    isUndoRedo.current = true;
    setBody(prev);
    setIsDirty(true);
  }, [body]);
  const handleRedo = reactExports.useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(body);
    isUndoRedo.current = true;
    setBody(next);
    setIsDirty(true);
  }, [body]);
  const handleSaveTitle = reactExports.useCallback(async () => {
    if (isNew || !scriptId || !editableTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    if (resolvedIsSocialPost) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: scriptId, updates: { title: editableTitle.trim() } });
      addToast({ type: "success", message: "Đã cập nhật tiêu đề." });
    } catch {
      addToast({ type: "error", message: "Không thể lưu tiêu đề." });
    }
    setIsEditingTitle(false);
  }, [isNew, scriptId, editableTitle, updateMutation, addToast, resolvedIsSocialPost]);
  const handleSave = reactExports.useCallback(async () => {
    setIsSaving(true);
    try {
      const validFields = ["content_type", "pillar", "track", "persona", "writing_mode", "publish_mode", "posted_account", "brand_voice"];
      const metadataKeys = ["email_day", "from_email", "email_template", "audience_type", "preview_text", "campaign_type"];
      const validMetaFields = {};
      const extraMetadataFields = {};
      Object.keys(metaFields).forEach((k) => {
        if (validFields.includes(k)) {
          validMetaFields[k] = metaFields[k];
        } else if (metadataKeys.includes(k)) {
          extraMetadataFields[k] = metaFields[k];
        }
      });
      if (isNew) {
        const res = await fetch("/api/ops/content-pipeline/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editableTitle || "Kịch Bản Mới",
            body,
            ...validMetaFields,
            metadata: extraMetadataFields,
            status: "draft"
          })
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setIsDirty(false);
          addToast({ type: "success", message: "Đã tạo nội dung mới." });
          navigate(`/GEM/cc/scripts/${data.id}`, { replace: true });
        } else {
          console.error("[CCScriptDetail] Insert Error:", data.error);
          addToast({ type: "error", message: data.error || "Không thể tạo nội dung." });
        }
      } else {
        if (!scriptId) return;
        const fieldName = resolvedIsSocialPost ? "content" : "body";
        const updates = {
          [fieldName]: body,
          ...resolvedIsSocialPost ? {} : validMetaFields,
          metadata: {
            ...script?.metadata || {},
            ...extraMetadataFields
          }
        };
        await updateMutation.mutateAsync({
          id: scriptId,
          updates
        });
        setIsDirty(false);
        addToast({ type: "success", message: "Đã lưu nội dung." });
      }
    } catch (err) {
      console.error("[CCScriptDetail] Save Exception:", err);
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      addToast({ type: "error", message: `Không thể lưu nội dung: ${msg}` });
    } finally {
      setIsSaving(false);
    }
  }, [isNew, scriptId, body, editableTitle, updateMutation, resolvedIsSocialPost, addToast, navigate, metaFields]);
  const scriptSessionId = script?.session_id || null;
  const handleIterate = reactExports.useCallback(async (instruction) => {
    if (!instruction?.trim() || !scriptSessionId) return;
    setIterating(true);
    setIterateHistory((prev) => [...prev, { role: "user", text: instruction }]);
    setIterateInput("");
    try {
      const { generationJobService } = await __vitePreload(async () => { const { generationJobService } = await import('./generationJobService-DTWrQm4M.js');return { generationJobService }},true              ?__vite__mapDeps([0,1,2]):void 0);
      const result = await generationJobService.create({
        job_type: "script",
        input_params: {
          action: "iterate",
          session_id: scriptSessionId,
          instruction,
          content_type: script?.content_type || "latc"
        },
        content_type: script?.content_type || null,
        created_by: script?.created_by || "current_user",
        source: "web_iterate"
      });
      if (result.success) {
        setIterateHistory((prev) => [...prev, {
          role: "ai",
          text: `Đã gửi yêu cầu. Job ID: ${result.data?.id}`
        }]);
        addToast({ type: "info", message: "Đã gửi yêu cầu chỉnh sửa cho AI." });
      } else {
        setIterateHistory((prev) => [...prev, { role: "ai", text: `Lỗi: ${result.error}` }]);
      }
    } catch (err) {
      setIterateHistory((prev) => [...prev, { role: "ai", text: `Lỗi: ${err.message}` }]);
    } finally {
      setIterating(false);
    }
  }, [scriptSessionId, script, addToast]);
  const handleSubmitFinal = reactExports.useCallback(async () => {
    if (!scriptSessionId || !script?.draft_body) return;
    try {
      const { generationJobService } = await __vitePreload(async () => { const { generationJobService } = await import('./generationJobService-DTWrQm4M.js');return { generationJobService }},true              ?__vite__mapDeps([0,1,2]):void 0);
      await generationJobService.createSubmitFinal(
        scriptSessionId,
        script.draft_body,
        body,
        feedbackNotes,
        script?.created_by || "current_user"
      );
      addToast({ type: "success", title: "Đã gửi feedback", message: "AI sẽ học từ bản final cho lần tạo sau." });
      setFeedbackNotes("");
    } catch (err) {
      addToast({ type: "error", message: `Lỗi gửi feedback: ${err.message}` });
    }
  }, [scriptSessionId, script, body, feedbackNotes, addToast]);
  const ITERATE_SHORTCUTS = [
    { label: "Sửa Hook", cmd: "Sửa phần Hook cho mạnh hơn, emotional hơn." },
    { label: "Thêm VD", cmd: "Thêm ví dụ đời sống vào phần thiếu ví dụ nhất." },
    { label: "Mềm CTA", cmd: "Làm mềm CTA cuối theo MODE 1." },
    { label: "Kiểm tra", cmd: "Kiểm tra 10 quy tắc vàng. Liệt kê vi phạm." },
    { label: "Tạo Tiêu Đề", cmd: "Tạo 4 tiêu đề cho kịch bản này." }
  ];
  const handleStatusChange = reactExports.useCallback(
    async (newStatus) => {
      if (!scriptId) return;
      try {
        if (newStatus === "approved") {
          const { opsApi } = await __vitePreload(async () => { const { opsApi } = await import('./index-Cxd0f6Om.js').then(n => n.dm);return { opsApi }},true              ?__vite__mapDeps([1,2]):void 0);
          await opsApi.approveScript(scriptId);
        } else {
          await updateMutation.mutateAsync({
            id: scriptId,
            updates: { status: newStatus }
          });
        }
        addToast({
          type: "success",
          message: `Trạng thái chuyển sang: ${STATUS_CONFIG[newStatus].label}`
        });
      } catch {
        addToast({ type: "error", message: "Không thể thay đổi trạng thái." });
      }
    },
    [scriptId, updateMutation, addToast]
  );
  const handleCopyBody = reactExports.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mainContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
      addToast({ type: "success", message: "Đã sao chép nội dung." });
    } catch {
      addToast({ type: "error", message: "Không thể sao chép." });
    }
  }, [mainContent, addToast]);
  const DEFAULT_DESIGN_SYSTEM = `

DESIGN SYSTEM:
Navy đậm #112250
Gold #FFBD59
Accent: Purple #6A5BFF
Burgundy #9C0612
Pink #FF6B9D
Text: White #FFFFFF
Footer: "gemral.com" centered`;
  const handleCopyImagePrompt = reactExports.useCallback(async () => {
    try {
      const fullPrompt = imagePrompt + DEFAULT_DESIGN_SYSTEM;
      await navigator.clipboard.writeText(fullPrompt);
      addToast({ type: "success", message: "Đã sao chép prompt + design system." });
    } catch {
      addToast({ type: "error", message: "Không thể sao chép." });
    }
  }, [imagePrompt, addToast]);
  const handleExportPDF = reactExports.useCallback(() => {
    setShowExportMenu(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast({ type: "error", message: "Trình duyệt đã chặn popup. Vui lòng cho phép popup." });
      return;
    }
    const contentHtml = mainContent.split("\n").map((line) => {
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (!line.trim()) return "<br/>";
      return `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }).join("");
    const t = (script?.title || "Kịch Bản").replace(/^```\w*\s*/, "").replace(/```\s*$/, "").trim() || "Kịch Bản";
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.7;color:#111;padding:20px}h1{font-size:1.4em;margin-bottom:8px}h2{font-size:1.2em;color:#1a1a2e;margin-top:2em}h3{font-size:1.05em;margin-top:1.4em}p{margin:0.6em 0}@media print{body{margin:0}}</style></head><body><h1>${t}</h1><hr/>${contentHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
    addToast({ type: "success", message: "Mở cửa sổ in / xuất PDF." });
  }, [mainContent, script, addToast]);
  const handleExportDocx = reactExports.useCallback(() => {
    setShowExportMenu(false);
    const t = (script?.title || "Kịch Bản").replace(/^```\w*\s*/, "").replace(/```\s*$/, "").trim() || "Kịch Bản";
    const content = mainContent;
    const blob = new Blob(
      [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${t}</title></head><body><h1>${t}</h1>${content.split("\n").map((l) => l.trim() ? `<p>${l}</p>` : "<br/>").join("")}</body></html>`],
      { type: "application/msword" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.slice(0, 60).replace(/[^a-zA-Z0-9\s-]/g, "")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast({ type: "success", message: "Đã tải xuống file DOCX." });
  }, [mainContent, script, addToast]);
  const handleExportHTML = reactExports.useCallback(() => {
    setShowExportMenu(false);
    const t = (script?.title || "Kịch Bản").replace(/^```\w*\s*/, "").replace(/```\s*$/, "").trim() || "Kịch Bản";
    const content = mainContent;
    const htmlContent = content.startsWith("```html") ? content.replace(/^```html\s*/i, "").replace(/```\s*$/i, "") : content;
    const blob = new Blob(
      [htmlContent],
      { type: "text/html;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.slice(0, 60).replace(/[^a-zA-Z0-9\s-]/g, "")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast({ type: "success", message: "Đã tải xuống file HTML." });
  }, [mainContent, script, addToast]);
  const handleExportTeleprompter = reactExports.useCallback(() => {
    const teleText = mainContent.split("\n").map((line) => line.trim()).filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(teleText).then(() => {
      addToast({ type: "success", message: "Đã sao chép định dạng Teleprompter." });
    }).catch(() => {
      addToast({ type: "error", message: "Không thể sao chép." });
    });
    setShowExportMenu(false);
  }, [mainContent, addToast]);
  const handleImageFiles = reactExports.useCallback(async (files) => {
    const newImages = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 10 - uploadedImages.length);
    if (newImages.length === 0) return;
    const previews = newImages.map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setUploadedImages((prev) => [...prev, ...previews]);
  }, [uploadedImages.length]);
  const handleDragOver = reactExports.useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = reactExports.useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = reactExports.useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleImageFiles(e.dataTransfer.files);
    }
  }, [handleImageFiles]);
  const removeImage = reactExports.useCallback((index) => {
    setUploadedImages((prev) => {
      const updated = [...prev];
      if (updated[index]) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);
  const handlePublish = reactExports.useCallback(async (platform) => {
    if (!mainContent) return;
    setPublishing(platform);
    try {
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        setUploading(true);
        const formData = new FormData();
        uploadedImages.forEach((img) => formData.append("files", img.file));
        const uploadRes = await fetch("/api/social/upload", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error);
        imageUrls = uploadData.urls;
        setUploading(false);
        setUploadedImages((prev) => prev.map((img, i) => ({
          ...img,
          url: imageUrls[i] || img.url
        })));
      }
      const publishBody = {
        platform: platform.toLowerCase(),
        content: mainContent,
        imageUrls: imageUrls.length > 0 ? imageUrls : void 0
      };
      if (platform === "Facebook" && selectedFbPage) {
        publishBody.facebookPageId = selectedFbPage;
      }
      const publishRes = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publishBody)
      });
      const publishData = await publishRes.json();
      if (!publishData.success) throw new Error(publishData.error);
      setPublishResults((prev) => [...prev, { platform, url: publishData.postUrl }]);
      addToast({
        type: "success",
        title: `Đã đăng lên ${platform}!`,
        message: publishData.message
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi đăng bài";
      addToast({ type: "error", title: `Lỗi ${platform}`, message: msg });
    } finally {
      setPublishing(null);
      setUploading(false);
    }
  }, [mainContent, uploadedImages, addToast, selectedFbPage]);
  const handleFeedback = reactExports.useCallback(async (type, rule, suggestion) => {
    const key = `${type}:${rule}`;
    if (feedbackSent.has(key)) return;
    setFeedbackSending(key);
    try {
      const res = await fetch("/api/knowledge/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rule, suggestion })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSent((prev) => new Set(prev).add(key));
        addToast({ type: "success", title: "Đã ghi nhận", message: "Hệ thống sẽ cải thiện từ lần tạo tiếp theo." });
      } else {
        addToast({ type: "error", message: data.error ?? "Không thể gửi feedback." });
      }
    } catch {
      addToast({ type: "error", message: "Không thể gửi feedback." });
    } finally {
      setFeedbackSending(null);
    }
  }, [feedbackSent, addToast]);
  const handlePublishNews = reactExports.useCallback(async (pubStatus) => {
    if (!mainContent) return;
    setNewsPublishing(true);
    try {
      const { getSupabase } = await __vitePreload(async () => { const { getSupabase } = await import('./index-Cxd0f6Om.js').then(n => n.dl);return { getSupabase }},true              ?__vite__mapDeps([1,2]):void 0);
      const supabase = getSupabase();
      let articleContent = mainContent;
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        const { getSupabase: getCCSupabase } = await __vitePreload(async () => { const { getSupabase: getCCSupabase } = await import('./index-Cxd0f6Om.js').then(n => n.dl);return { getSupabase: getCCSupabase }},true              ?__vite__mapDeps([1,2]):void 0);
        const ccSupa = getCCSupabase();
        for (const img of uploadedImages) {
          if (!img.file) continue;
          const ext = img.file.name.split(".").pop() || "jpg";
          const filePath = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await ccSupa.storage.from("social-media-images").upload(filePath, img.file, { contentType: img.file.type, upsert: false });
          if (uploadErr) {
            console.warn("[CCScriptDetail] Image upload failed:", uploadErr);
            continue;
          }
          const { data: urlData } = ccSupa.storage.from("social-media-images").getPublicUrl(filePath);
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
        }
        if (imageUrls.length > 0) {
          setUploadedImages((prev) => prev.map((img, i) => ({
            ...img,
            url: imageUrls[i] || img.url
          })));
        }
      }
      const coverImageUrl = imageUrls[0] || uploadedImages[0]?.url || void 0;
      const title = script?.title || mainContent.split("\n")[0]?.replace(/^#+\s*/, "") || "Bài Viết Không Tên";
      const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100) + "-" + Date.now().toString(36);
      const metaDesc = articleContent.replace(/[#*\n]/g, " ").trim().slice(0, 155);
      const wc = articleContent.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wc / 200));
      const { data: article, error: insertErr } = await supabase.from("cc_news_articles").insert({
        title,
        slug,
        meta_description: metaDesc,
        content: articleContent,
        excerpt: articleContent.replace(/[#*\n]/g, " ").trim().slice(0, 200) + "...",
        category: "crypto_market",
        tags: [],
        cover_image_url: coverImageUrl,
        author: "Gemral Editorial",
        status: pubStatus,
        published_at: pubStatus === "published" ? (/* @__PURE__ */ new Date()).toISOString() : null,
        reading_time_minutes: readingTime
      }).select().single();
      if (insertErr) throw new Error(insertErr.message);
      let forumPostId = null;
      if (pubStatus === "published") {
        try {
          const { supabase: gemralSupabase } = await __vitePreload(async () => { const { supabase: gemralSupabase } = await import('./index-Cxd0f6Om.js').then(n => n.dk);return { supabase: gemralSupabase }},true              ?__vite__mapDeps([1,2]):void 0);
          const { data: { user } } = await gemralSupabase.auth.getUser();
          if (user) {
            const { data: forumPost } = await gemralSupabase.from("forum_posts").insert({
              user_id: user.id,
              title,
              content: articleContent,
              image_url: coverImageUrl || null,
              media_urls: imageUrls.length > 0 ? imageUrls : coverImageUrl ? [coverImageUrl] : [],
              status: "published",
              category_id: null,
              post_type: "news",
              feed_type: "news",
              topic: "tin-tuc",
              likes_count: 0,
              comments_count: 0,
              views_count: 0
            }).select("id").single();
            forumPostId = forumPost?.id;
          }
        } catch (crossPostErr) {
          console.warn("[CCScriptDetail] Cross-post to forum failed:", crossPostErr);
        }
      }
      setNewsPublished({
        id: article?.id ?? `local-${Date.now()}`,
        slug: article?.slug ?? slug,
        publishUrl: forumPostId ? `https://gemral.com/forum/thread/${forumPostId}` : `https://gemral.com/forum`
      });
      addToast({
        type: "success",
        title: pubStatus === "published" ? "Đã xuất bản tin tức!" : "Đã lưu nháp!",
        message: `Bài "${title}" đã được ${pubStatus === "published" ? "xuất bản" : "lưu nháp"} thành công.`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi đăng tin tức";
      addToast({ type: "error", title: "Lỗi đăng tin", message: msg });
    } finally {
      setNewsPublishing(false);
    }
  }, [mainContent, script, uploadedImages, addToast]);
  const textareaMinHeight = reactExports.useMemo(() => {
    const lineCount = body.split("\n").length;
    return Math.max(400, lineCount * 22 + 40);
  }, [body]);
  reactExports.useEffect(() => {
    if (!isEditingTitle) {
      const raw = script?.title ?? "";
      const cleaned = raw.replace(/^```\w*\s*/, "").replace(/```\s*$/, "").replace(/^\{?\s*"?\s*/, "").replace(/\s*"?\s*\}?$/, "").trim();
      setEditableTitle(cleaned || raw);
    }
  }, [script?.title, isEditingTitle]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 32, className: "animate-spin text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-3 text-sm text-txt-2", children: "Đang tải kịch bản..." })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => navigate(".."),
          className: "flex items-center gap-2 text-sm text-txt-2 hover:text-txt transition-button",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 16 }),
            "Quay lại"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "glass", padding: "lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 40, className: "mx-auto mb-3 text-danger" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-danger mb-2", children: "Không thể tải kịch bản" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: error.message }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "mt-4", onClick: () => navigate(-1), children: "Quay Lại" })
      ] }) })
    ] });
  }
  const scriptRec = script;
  const rawTitle = resolvedIsSocialPost ? scriptRec?.metadata?.title ?? scriptRec?.content?.slice(0, 60) ?? "Bài Đăng Không Tên" : scriptRec?.title ?? "Kịch Bản Không Tên";
  const scriptTitle = rawTitle.replace(/^```\w*\s*/, "").replace(/```\s*$/, "").replace(/^\{?\s*"?\s*/, "").replace(/\s*"?\s*\}?$/, "").trim() || "Kịch Bản Không Tên";
  const contentType = resolvedIsSocialPost ? "social_post" : scriptRec?.content_type ?? "LATC";
  const track = scriptRec?.track ?? "";
  const personaKey = scriptRec?.persona ?? "";
  const writingMode = scriptRec?.writing_mode ?? "";
  const parentScriptId = scriptRec?.parent_script_id;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => navigate(-1),
            className: "flex items-center gap-1.5 text-sm text-txt-2 hover:text-txt transition-button shrink-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 16 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Quay lại" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-5 w-px bg-border shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 18, className: "text-gold shrink-0" }),
          isEditingTitle ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                autoFocus: true,
                value: editableTitle,
                onChange: (e) => setEditableTitle(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                },
                className: "flex-1 font-heading text-lg font-semibold text-txt bg-bg-3 border border-gold/40 rounded-card px-2 py-0.5 focus:outline-none focus:border-gold/70"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSaveTitle, className: "text-xs px-2 py-1 bg-gold/20 text-gold rounded-badge hover:bg-gold/30 transition-colors", children: "Lưu" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsEditingTitle(false), className: "text-xs px-2 py-1 text-txt-3 hover:text-txt rounded-badge transition-colors", children: "Hủy" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 min-w-0 group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-heading text-lg font-semibold text-txt truncate", children: scriptTitle }),
            !resolvedIsSocialPost && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setIsEditingTitle(true),
                className: "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-txt-3 hover:text-gold",
                title: "Sửa tiêu đề",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { size: 13 })
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        isDirty && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-amber flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 12 }),
          "Chưa lưu"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            text: statusConfig.label,
            variant: statusConfig.variant,
            size: "md",
            dot: true
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 flex-wrap text-xs text-txt-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Badge,
        {
          text: contentType,
          variant: contentType === "LATC" ? "gold" : contentType === "TMT" ? "key" : "default",
          size: "sm"
        }
      ),
      track && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: TRACK_LABELS[track] ?? track }),
      personaKey && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: PERSONA_LABELS[personaKey] ?? personaKey }),
      writingMode && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: MODE_LABELS[writingMode] ?? writingMode }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        wordCount.toLocaleString("vi-VN"),
        " từ"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: duration })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-b border-border flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setIsEditing(false),
              className: `px-3 py-1.5 rounded-card text-xs font-medium transition-all ${!isEditing ? "bg-gold/10 text-gold border border-gold/30" : "text-txt-3 hover:text-txt"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, className: "inline mr-1.5" }),
                "Xem Trước"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setIsEditing(true),
              className: `px-3 py-1.5 rounded-card text-xs font-medium transition-all ${isEditing ? "bg-gold/10 text-gold border border-gold/30" : "text-txt-3 hover:text-txt"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { size: 14, className: "inline mr-1.5" }),
                "Chỉnh Sửa"
              ]
            }
          ),
          isEditing && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-px bg-border mx-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleUndo,
                disabled: undoStack.current.length === 0,
                className: "p-1.5 rounded text-txt-3 hover:text-txt hover:bg-bg-4 transition-all disabled:opacity-30",
                title: "Hoàn tác",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { size: 14 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleRedo,
                disabled: redoStack.current.length === 0,
                className: "p-1.5 rounded text-txt-3 hover:text-txt hover:bg-bg-4 transition-all disabled:opacity-30",
                title: "Làm lại",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Redo2, { size: 14 })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowLogPanel((v) => !v),
              className: `text-xs px-3 py-1.5 rounded-card border flex items-center gap-1.5 transition-all ${showLogPanel ? "bg-gold/10 text-gold border-gold/30" : "border-border text-txt-3 hover:text-txt hover:bg-bg-4"}`,
              title: "Lịch sử Log",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(History, { size: 13 }),
                " Lịch sử Log"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "sm",
              icon: copied ? Check : Copy,
              onClick: handleCopyBody,
              children: copied ? "Đã chép" : "Sao chép"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "sm",
              icon: FileCode,
              onClick: handleExportHTML,
              title: "Xuất nội dung thành file HTML",
              children: "Xuất HTML"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "ghost",
                size: "sm",
                icon: Download,
                onClick: () => setShowExportMenu(!showExportMenu),
                children: [
                  "Xuất",
                  showExportMenu ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 12, className: "ml-1" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, className: "ml-1" })
                ]
              }
            ),
            showExportMenu && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-0 top-full mt-1 p-1 rounded-card bg-white dark:bg-zinc-900 shadow-xl border border-border space-y-0.5 z-50 min-w-[140px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleExportHTML, className: "w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { size: 14 }),
                " Xuất HTML"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleExportPDF, className: "w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { size: 14 }),
                " Xuất PDF"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleExportDocx, className: "w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }),
                " Xuất DOCX"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleExportTeleprompter, className: "w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { size: 14 }),
                " Teleprompter"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "gold",
              size: "sm",
              icon: Save,
              loading: isSaving,
              onClick: handleSave,
              disabled: !isDirty,
              children: "Lưu"
            }
          ),
          status !== "published" && statusConfig.next && statusConfig.nextIcon && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              size: "sm",
              icon: statusConfig.nextIcon,
              onClick: () => handleStatusChange(statusConfig.next),
              loading: updateMutation.isPending,
              children: statusConfig.nextLabel
            }
          ),
          status !== "approved" && status !== "published" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "success",
              size: "sm",
              icon: CircleCheckBig,
              onClick: () => handleStatusChange("approved"),
              loading: updateMutation.isPending,
              children: "Duyệt (Trực tiếp)"
            }
          )
        ] })
      ] }),
      showLogPanel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-3 border-b border-border bg-bg-2/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs font-bold text-txt-3 uppercase tracking-wider", children: "📜 Lịch Sử Log" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowLogPanel(false), className: "text-txt-3 hover:text-txt", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 max-h-[160px] overflow-y-auto", children: [
          [
            { time: script?.updated_at, action: "Cập nhật gần nhất", icon: "✏️" },
            { time: script?.created_at, action: "Tạo nội dung", icon: "🆕" }
          ].filter((e) => e.time).map((entry, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xxs text-txt-3 py-1 border-b border-border/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: entry.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: entry.action }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: new Date(entry.time).toLocaleString("vi-VN") })
          ] }, i)),
          linkedJobId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xxs text-txt-3 py-1 border-b border-border/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🔗" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: "Job liên kết" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                className: "font-mono text-gold hover:underline",
                onClick: () => setLogModalOpen(true),
                children: [
                  linkedJobId.slice(0, 12),
                  "..."
                ]
              }
            )
          ] }),
          iterateHistory.length > 0 && iterateHistory.map((msg, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xxs py-1 border-b border-border/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: msg.role === "user" ? "👤" : "🤖" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex-1 truncate ${msg.role === "user" ? "text-gold/80" : "text-txt-3"}`, children: msg.text })
          ] }, `iter-${i}`)),
          iterateHistory.length === 0 && !linkedJobId && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-4 italic", children: "Chưa có lịch sử chỉnh sửa AI." })
        ] })
      ] }),
      isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col border-t border-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-2/50 p-4 border-b border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Job Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { disabled: true, value: metaFields.job_type || "", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold opacity-50 cursor-not-allowed", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "N/A" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "script", children: "Script" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "social_post", children: "Social Post" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "batch_generate", children: "Batch Generate" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Content Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.content_type || "", onChange: (e) => handleMetaChange("content_type", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "latc", children: "LATC" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tmt", children: "TMT" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "short_clip", children: "Short Clip" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "social_post", children: "Social Post" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "news", children: "News" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "banner", children: "Banner" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "push_notification", children: "Push Notification" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "inapp_story", children: "In-app Story" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "sms", children: "SMS" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "chatbot_script", children: "Chatbot Script" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "content_planner", children: "Content Planner" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Pillar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.pillar || "", onChange: (e) => handleMetaChange("pillar", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "trading", children: "Trading" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Wealth" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "spiritual", children: "Spiritual" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Integration" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "education", children: "Education" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Track" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.track || "", onChange: (e) => handleMetaChange("track", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Wealth" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "spiritual", children: "Spiritual" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Integration" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "education", children: "Education" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Persona" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.persona || "", onChange: (e) => handleMetaChange("persona", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_mentor", children: "Jennie Mentor" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_provocateur", children: "Jennie Provocateur" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_storyteller", children: "Jennie Storyteller" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_analyst", children: "Jennie Analyst" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_motivator", children: "Jennie Motivator" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_confidante", children: "Jennie Confidante" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Writing Mode" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.writing_mode || "", onChange: (e) => handleMetaChange("writing_mode", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mode_1_calm", children: "Mode 1: Calm" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mode_2_provocative", children: "Mode 2: Provocative" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Publish Mode" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.publish_mode || "", onChange: (e) => handleMetaChange("publish_mode", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "scheduled", children: "Lên lịch tự động (Scheduled)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "immediate", children: "Đăng ngay (Immediate)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "threshold_5", children: "Gom đủ 5 bài (Threshold)" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Posted Account" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.posted_account || "", onChange: (e) => handleMetaChange("posted_account", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "page_jennie", children: "Page Jennie Chu" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "page_gemral", children: "Page Gemral Official" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "profile_jennie", children: "Profile Uyen Chu" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "forum_gemral", children: "Forum Gemral" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "telegram_channel", children: "Telegram Channel" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Model" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { disabled: true, value: metaFields.model || "", placeholder: "claude-3-5-sonnet...", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold opacity-50 cursor-not-allowed" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Provider" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { disabled: true, value: metaFields.provider || "", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold opacity-50 cursor-not-allowed", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "(None)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "anthropic", children: "Anthropic" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "openai", children: "OpenAI" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "gemini", children: "Gemini" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Brand Voice" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: metaFields.brand_voice || "", onChange: (e) => handleMetaChange("brand_voice", e.target.value), placeholder: "jennie", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "SOP ID" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { disabled: true, value: metaFields.sop_id || "", placeholder: "UUID...", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold opacity-50 cursor-not-allowed" })
          ] }),
          metaFields.content_type === "email" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Email Day" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: metaFields.email_day || "", onChange: (e) => handleMetaChange("email_day", e.target.value), placeholder: "VD: 1", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "From Email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: metaFields.from_email || "", onChange: (e) => handleMetaChange("from_email", e.target.value), placeholder: "hello@gemral.com", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Email Template" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: metaFields.email_template || "", onChange: (e) => handleMetaChange("email_template", e.target.value), placeholder: "custom", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Audience Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.audience_type || "", onChange: (e) => handleMetaChange("audience_type", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "N/A" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "paid", children: "Paid" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "free", children: "Free" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tier1", children: "Tier 1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tier2", children: "Tier 2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tier3", children: "Tier 3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "students", children: "Students" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Preview Text" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: metaFields.preview_text || "", onChange: (e) => handleMetaChange("preview_text", e.target.value), placeholder: "Preview Text...", className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gold", children: "Campaign Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: metaFields.campaign_type || "", onChange: (e) => handleMetaChange("campaign_type", e.target.value), className: "w-full bg-bg-3 border border-border rounded px-2 py-1 text-txt-2 focus:border-gold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "N/A" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "one_time", children: "One Time" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "automated", children: "Automated" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "drip", children: "Drip Campaign" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: body,
            onChange: handleBodyChange,
            style: { minHeight: `${textareaMinHeight}px` },
            className: "w-full p-5 bg-transparent text-sm text-txt font-body leading-relaxed resize-y focus:outline-none placeholder:text-txt-3",
            placeholder: "Bắt đầu viết kịch bản tại đây...",
            spellCheck: false
          }
        )
      ] }) : isHtmlContent(mainContent) ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-hidden", style: { minHeight: 300 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "iframe",
        {
          ref: emailIframeRef,
          srcDoc: stripCodeFence(mainContent),
          style: { width: "100%", minHeight: 500, border: "none", display: "block" },
          title: "HTML Email Preview",
          sandbox: "allow-same-origin",
          onLoad: (e) => {
            const iframe = e.currentTarget;
            try {
              const h = iframe.contentDocument?.documentElement?.scrollHeight;
              if (h) iframe.style.height = h + 20 + "px";
            } catch {
            }
          }
        }
      ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5", children: renderMarkdownContent(mainContent) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 16, className: "text-purple" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider", children: "Giọng Thương Hiệu" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-16 h-16", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 36 36", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  className: "stroke-bg-4",
                  fill: "none",
                  strokeWidth: "3",
                  d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  className: brandAnalysis.score >= 80 ? "stroke-emerald" : brandAnalysis.score >= 60 ? "stroke-amber" : "stroke-danger",
                  fill: "none",
                  strokeWidth: "3",
                  strokeLinecap: "round",
                  strokeDasharray: `${brandAnalysis.score}, 100`,
                  d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-txt", children: brandAnalysis.score }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-txt", children: [
              brandAnalysis.score,
              "/100"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: brandAnalysis.score >= 80 ? "Tốt" : brandAnalysis.score >= 60 ? "Cần cải thiện" : "Cần sửa ngay" })
          ] })
        ] }),
        brandAnalysis.violations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-amber flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 12 }),
            brandAnalysis.violations.length,
            " vi phạm"
          ] }),
          brandAnalysis.violations.map((v, i) => {
            const fbKey = `brand_violation:${v.rule}`;
            const isSent = feedbackSent.has(fbKey);
            const isSending = feedbackSending === fbKey;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: `p-2 rounded-card text-xxs ${v.severity === "error" ? "bg-danger/10 text-danger" : "bg-amber/10 text-amber"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: v.rule }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "opacity-70", children: v.location }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      disabled: isSent || isSending,
                      onClick: () => handleFeedback(
                        "brand_violation",
                        v.rule,
                        `TUYỆT ĐỐI KHÔNG sử dụng hoặc tạo nội dung vi phạm: "${v.rule}". Quy tắc này áp dụng cho TẤT CẢ loại nội dung.`
                      ),
                      className: `mt-1.5 flex items-center gap-1 px-2 py-1 rounded-badge text-xxs font-medium transition-all ${isSent ? "bg-success/10 text-success cursor-default" : "bg-glass-bg text-txt-2 hover:bg-gold/10 hover:text-gold border border-border hover:border-gold/30"}`,
                      children: [
                        isSending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 10, className: "animate-spin" }) : isSent ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 10 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 10 }),
                        isSent ? "Đã cập nhật knowledge" : "Gửi sửa lỗi vào knowledge"
                      ]
                    }
                  )
                ]
              },
              i
            );
          })
        ] }),
        brandAnalysis.score < 80 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 pt-3 border-t border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: feedbackSent.has("brand_violation:Điểm brand voice thấp") || feedbackSending === "brand_violation:Điểm brand voice thấp",
            onClick: () => handleFeedback(
              "brand_violation",
              "Điểm brand voice thấp",
              "Cần tăng cường giọng thương hiệu Jennie: dùng nhiều tiếng Việt có dấu hơn, tránh câu tiếng Anh dài, giữ tone ấm áp và tự nhiên."
            ),
            className: `w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has("brand_violation:Điểm brand voice thấp") ? "bg-success/10 text-success" : "bg-purple/10 text-purple hover:bg-purple/20 border border-purple/20"}`,
            children: [
              feedbackSending === "brand_violation:Điểm brand voice thấp" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : feedbackSent.has("brand_violation:Điểm brand voice thấp") ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 12 }),
              feedbackSent.has("brand_violation:Điểm brand voice thấp") ? "Đã ghi nhận" : "Cải thiện giọng thương hiệu cho lần sau"
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 16, className: "text-gold" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider", children: "GEM Tools" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Badge,
            {
              text: `${presentToolCount}/5`,
              variant: presentToolCount >= 4 ? "success" : presentToolCount >= 2 ? "gold" : "danger",
              size: "sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ProgressBar,
          {
            value: presentToolCount / 5 * 100,
            color: presentToolCount >= 4 ? "emerald" : presentToolCount >= 2 ? "gold" : "danger",
            size: "sm",
            className: "mb-3"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: gemTools.map((tool) => {
          const fbKey = `gem_tool_missing:${tool.key}`;
          const isSent = feedbackSent.has(fbKey);
          const isSending = feedbackSending === fbKey;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            tool.present ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-emerald shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3.5 h-3.5 rounded-full border border-txt-3 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-txt-3 mr-1", children: [
                tool.key,
                ":"
              ] }),
              tool.label
            ] }),
            !tool.present && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                disabled: isSent || isSending,
                onClick: () => handleFeedback(
                  "gem_tool_missing",
                  `Thiếu GEM Tool: ${tool.label} (${tool.key})`,
                  `BẮT BUỘC tích hợp GEM Tool "${tool.label}" vào nội dung một cách tự nhiên.`
                ),
                className: `shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-badge text-xxs font-medium transition-all ${isSent ? "text-success" : "text-danger hover:text-gold hover:bg-gold/10"}`,
                children: [
                  isSending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 10, className: "animate-spin" }) : isSent ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 10 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 10 }),
                  isSent ? "Đã ghi" : "Sửa"
                ]
              }
            ),
            tool.present && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 10, className: "text-emerald shrink-0 opacity-50" })
          ] }, tool.key);
        }) }),
        presentToolCount < 5 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 pt-3 border-t border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: feedbackSent.has("gem_tool_missing:Thiếu nhiều GEM Tools"),
            onClick: () => handleFeedback(
              "gem_tool_missing",
              "Thiếu nhiều GEM Tools",
              `BẮT BUỘC tích hợp ĐẦY ĐỦ 5 GEM Tools vào MỌI kịch bản: Thở Thanh Lọc, Template Tần Số, Thiền Dẫn Dắt, Tần Số Tình Yêu, Vision Board.`
            ),
            className: `w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has("gem_tool_missing:Thiếu nhiều GEM Tools") ? "bg-success/10 text-success" : "bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20"}`,
            children: [
              feedbackSent.has("gem_tool_missing:Thiếu nhiều GEM Tools") ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12 }),
              feedbackSent.has("gem_tool_missing:Thiếu nhiều GEM Tools") ? "Đã ghi nhận" : "Enforce tất cả GEM Tools cho lần sau"
            ]
          }
        ) })
      ] })
    ] }),
    (imagePrompt || derivedImagePrompt) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 14 }),
          "Prompt Tạo Hình Ảnh Minh Họa"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: isEditingImagePrompt ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
            setIsEditingImagePrompt(false);
            setEditableImagePrompt(derivedImagePrompt);
          }, children: "Hủy" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "gold", size: "sm", icon: Save, onClick: handleSaveImagePrompt, children: "Lưu Prompt" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", icon: PenLine, onClick: () => setIsEditingImagePrompt(true), children: "Sửa" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", icon: Copy, onClick: handleCopyImagePrompt, children: "Sao Chép Tất Cả" })
        ] }) })
      ] }),
      isEditingImagePrompt ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: editableImagePrompt,
          onChange: (e) => setEditableImagePrompt(e.target.value),
          className: "w-full min-h-[120px] text-xs text-txt-2 leading-relaxed bg-glass-bg rounded-card p-3 resize-y focus:outline-none focus:ring-1 focus:ring-purple/50 border border-purple/30 placeholder:text-txt-3",
          placeholder: "Chỉnh sửa image prompt...",
          spellCheck: false
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-txt-2 leading-relaxed whitespace-pre-wrap bg-glass-bg rounded-card p-3 border border-purple/20", children: imagePrompt }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 p-3 rounded-card bg-glass-bg border border-gold/20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs font-semibold text-gold uppercase tracking-wider mb-2", children: "Design System Mặc Định (tự động ghép khi sao chép)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-txt-3 leading-relaxed whitespace-pre-wrap font-mono", children: [
          "DESIGN SYSTEM:",
          "\n",
          "Navy đậm #112250",
          "\n",
          "Gold #FFBD59",
          "\n",
          "Accent: Purple #6A5BFF",
          "\n",
          "Burgundy #9C0612",
          "\n",
          "Pink #FF6B9D",
          "\n",
          "Text: White #FFFFFF",
          "\n",
          'Footer: "gemral.com" centered'
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 14 }),
        "Hình Ảnh Đính Kèm"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `relative border-2 border-dashed rounded-card p-4 transition-all cursor-pointer ${isDragging ? "border-gold bg-gold/10" : "border-border hover:border-gold/30"}`,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
          onClick: () => fileInputRef.current?.click(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: fileInputRef,
                type: "file",
                accept: "image/*",
                multiple: true,
                className: "hidden",
                onChange: (e) => e.target.files && handleImageFiles(e.target.files)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-2 text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 24, className: isDragging ? "text-gold" : "text-txt-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gold font-medium", children: "Kéo thả hình ảnh" }),
                " hoặc bấm để chọn"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "JPEG, PNG, WebP, GIF • Tối đa 10 ảnh • 10MB/ảnh" })
            ] })
          ]
        }
      ),
      uploadedImages.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-txt-3 font-medium", children: [
          uploadedImages.length,
          " hình ảnh đính kèm"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid gap-2 ${uploadedImages.length === 1 ? "grid-cols-1" : uploadedImages.length === 2 ? "grid-cols-2" : uploadedImages.length === 3 ? "grid-cols-3" : uploadedImages.length === 4 ? "grid-cols-2" : "grid-cols-3"}`, children: uploadedImages.map((img, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `relative group rounded-lg overflow-hidden border border-border bg-glass-bg ${uploadedImages.length === 1 ? "" : "aspect-square"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: img.preview,
                  alt: `Preview ${i + 1}`,
                  className: uploadedImages.length === 1 ? "w-full h-auto max-h-[600px] object-contain" : "w-full h-full object-cover"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity",
                  onClick: (e) => {
                    e.stopPropagation();
                    removeImage(i);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 })
                }
              ),
              img.url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-success/80 text-white text-xxs", children: "Đã tải lên" })
            ]
          },
          i
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 14 }),
        "Đăng Lên Mạng Xã Hội"
      ] }),
      publishResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 mb-3", children: publishResults.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-success font-medium", children: [
          "Đã đăng lên ",
          r.platform
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: r.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-gold flex items-center gap-1 ml-auto", children: [
          "Xem bài ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
        ] })
      ] }, i)) }),
      facebookPages.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Facebook Page:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CCSelect,
          {
            value: selectedFbPage,
            onChange: (e) => setSelectedFbPage(e.target.value),
            className: "text-xs py-1 px-2",
            children: facebookPages.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.name }, p.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: [
        { name: "Facebook", color: "hover:bg-blue-500/10 hover:border-blue-400/40 hover:text-blue-400" },
        { name: "Instagram", color: "hover:bg-pink-500/10 hover:border-pink-400/40 hover:text-pink-400" },
        { name: "Threads", color: "hover:bg-gray-400/10 hover:border-gray-300/40 hover:text-gray-300" }
      ].map(({ name, color }) => {
        const alreadyPublished = publishResults.some((r) => r.platform === name);
        const isPublishing = publishing === name;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: isPublishing || !!publishing || alreadyPublished,
            className: `flex items-center gap-1.5 px-4 py-2 rounded-card border text-xs font-medium transition-all ${alreadyPublished ? "border-success/30 text-success bg-success/5 cursor-default" : `border-border bg-glass-bg text-txt-3 ${color}`} disabled:opacity-50`,
            onClick: () => handlePublish(name),
            children: [
              isPublishing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : alreadyPublished ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 12 }),
              isPublishing ? uploading ? "Đang upload ảnh..." : "Đang đăng..." : alreadyPublished ? "Đã đăng" : `Đăng ${name}`
            ]
          },
          name
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 14 }),
          "Gửi Email (Resend)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setShowEmailPanel(!showEmailPanel),
            className: "text-xxs text-txt-3 hover:text-txt transition-colors",
            children: showEmailPanel ? "Thu gọn" : "Mở rộng"
          }
        )
      ] }),
      showEmailPanel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 block mb-1", children: "Gửi từ (Sender) *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: emailFrom,
                onChange: (e) => setEmailFrom(e.target.value),
                placeholder: "Gemral <hello@gemral.com>",
                className: "w-full text-xs px-3 py-2 bg-glass-bg border border-border rounded-card text-txt placeholder:text-txt-3 focus:border-violet-400/50 focus:outline-none transition-colors"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 block mb-1", children: "Email người nhận *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: emailTo,
                onChange: (e) => setEmailTo(e.target.value),
                placeholder: "email@example.com (cách nhau bằng dấu phẩy nếu nhiều người)",
                className: "w-full text-xs px-3 py-2 bg-glass-bg border border-border rounded-card text-txt placeholder:text-txt-3 focus:border-violet-400/50 focus:outline-none transition-colors"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xxs text-txt-3 block mb-1", children: [
              "BCC ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3 font-normal", children: "(tùy chọn, cách nhau bằng dấu phẩy)" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: emailBcc,
                onChange: (e) => setEmailBcc(e.target.value),
                placeholder: "bcc1@example.com, bcc2@example.com",
                className: "w-full text-xs px-3 py-2 bg-glass-bg border border-border rounded-card text-txt placeholder:text-txt-3 focus:border-violet-400/50 focus:outline-none transition-colors"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 block mb-1", children: "Tiêu đề email *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: emailSubject,
                onChange: (e) => setEmailSubject(e.target.value),
                placeholder: "Tiêu đề email...",
                className: "w-full text-xs px-3 py-2 bg-glass-bg border border-border rounded-card text-txt placeholder:text-txt-3 focus:border-violet-400/50 focus:outline-none transition-colors"
              }
            )
          ] })
        ] }),
        isHtmlContent(mainContent) ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 rounded-card bg-violet-500/5 border border-violet-500/20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-violet-400 flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 11 }),
          "Nội dung HTML email sẽ được gửi định dạng đẹp."
        ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 rounded-card bg-amber/5 border border-amber/20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-amber flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 11 }),
          "Nội dung plain text sẽ được wrap trong thẻ pre khi gửi."
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: emailSending || !emailTo.trim() || !emailSubject.trim(),
            onClick: async () => {
              if (!mainContent.trim()) {
                addToast({ type: "error", message: "Không có nội dung để gửi." });
                return;
              }
              setEmailSending(true);
              try {
                const recipients = emailTo.split(",").map((e) => e.trim()).filter(Boolean);
                const bccList = emailBcc.split(",").map((e) => e.trim()).filter(Boolean);
                const htmlContent = isHtmlContent(mainContent) ? stripCodeFence(mainContent) : `<pre style="font-family:sans-serif;white-space:pre-wrap;line-height:1.6">${mainContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
                const res = await fetch("/api/ops/email/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    from: emailFrom,
                    to: recipients,
                    ...bccList.length > 0 && { bcc: bccList },
                    subject: emailSubject,
                    html: htmlContent
                  })
                });
                const data = await res.json();
                if (data.success) {
                  addToast({ type: "success", title: "✅ Đã gửi email!", message: `Gửi đến ${recipients.length} người nhận.` });
                  setEmailTo("");
                } else {
                  addToast({ type: "error", title: "Lỗi gửi email", message: data.error || "Không xác định" });
                }
              } catch (err) {
                addToast({ type: "error", message: `Lỗi: ${err.message}` });
              } finally {
                setEmailSending(false);
              }
            },
            className: "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-card border border-violet-400/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-xs font-semibold transition-all disabled:opacity-50",
            children: [
              emailSending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 14 }),
              emailSending ? "Đang gửi..." : "Gửi Email"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, { size: 14 }),
        "Đăng Lên Mục Tin Tức"
      ] }),
      newsPublished && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 rounded-card bg-success/10 border border-success/20", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14, className: "text-success shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-success font-medium", children: "Đã đăng tin tức thành công!" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-success/70", children: [
              "ID: ",
              newsPublished.id
            ] })
          ] }),
          newsPublished.publishUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "a",
            {
              href: newsPublished.publishUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "flex items-center gap-1 text-xs text-gold hover:underline",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 10 }),
                "Xem bài trên Gemral",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: "Đã lưu nháp" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setNewsPublished(null),
            className: "flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-glass-bg text-cyan hover:bg-cyan/10 text-xs font-medium transition-all",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, { size: 12 }),
              "Đăng Lại"
            ]
          }
        )
      ] }),
      !newsPublished && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: newsPublishing,
              onClick: () => handlePublishNews("draft"),
              className: "flex items-center gap-1.5 px-4 py-2 rounded-card border border-border bg-glass-bg text-txt-3 hover:bg-amber/10 hover:border-amber/40 hover:text-amber text-xs font-medium transition-all disabled:opacity-50",
              children: [
                newsPublishing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }),
                "Lưu Nháp"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: newsPublishing,
              onClick: () => handlePublishNews("published"),
              className: "flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 text-xs font-medium transition-all disabled:opacity-50",
              children: [
                newsPublishing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, { size: 12 }),
                "Xuất Bản Ngay"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowNewsSchedule(!showNewsSchedule),
              className: "flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/5 text-emerald hover:bg-emerald/10 text-xs font-medium transition-all",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarPlus, { size: 12 }),
                "Lên Lịch Đăng"
              ]
            }
          )
        ] }),
        showNewsSchedule && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-card border border-emerald/20 bg-emerald/5 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarPlus, { size: 14, className: "text-emerald" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-emerald", children: "Lên Lịch Xuất Bản" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 block mb-1", children: "Ngày đăng *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "date",
                  value: newsScheduleDate,
                  onChange: (e) => setNewsScheduleDate(e.target.value),
                  min: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
                  className: "fi text-xs w-full"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 block mb-1", children: "Giờ đăng" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "time",
                  value: newsScheduleTime,
                  onChange: (e) => setNewsScheduleTime(e.target.value),
                  className: "fi text-xs w-full"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: newsPublishing || !newsScheduleDate,
              onClick: async () => {
                await handlePublishNews("draft");
                setShowNewsSchedule(false);
                addToast({
                  type: "success",
                  title: "Đã lên lịch!",
                  message: `Bài viết sẽ được xuất bản vào ${newsScheduleDate} lúc ${newsScheduleTime}.`
                });
              },
              className: "flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/10 text-emerald hover:bg-emerald/20 text-xs font-medium transition-all w-full justify-center disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarPlus, { size: 12 }),
                "Xác Nhận Lên Lịch"
              ]
            }
          )
        ] })
      ] })
    ] }),
    parentScriptId && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          className: "w-full flex items-center gap-2 text-left",
          onClick: () => setShowVersions(!showVersions),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(History, { size: 16, className: "text-blue shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider flex-1", children: "Lịch Sử Phiên Bản" }),
            showVersions ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 14, className: "text-txt-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14, className: "text-txt-3" })
          ]
        }
      ),
      showVersions && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 mt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-2 rounded-card bg-glass-bg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, className: "text-gold shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-txt", children: "Phiên bản hiện tại" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-txt-3", children: [
              "ID: ",
              scriptId.slice(0, 8),
              "..."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => navigate(`../${parentScriptId}`),
            className: "w-full flex items-center gap-3 p-2 rounded-card bg-glass-bg hover:bg-bg-4 transition-all text-left",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14, className: "text-purple shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-txt-2", children: "Bản gốc" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xxs text-txt-3", children: [
                  "ID: ",
                  parentScriptId.slice(0, 8),
                  "..."
                ] })
              ] })
            ]
          }
        )
      ] })
    ] }),
    scriptSessionId && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 14 }),
          "Chat Với AI"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setShowChatPanel(!showChatPanel),
            className: "text-xxs text-txt-3 hover:text-txt transition-colors",
            children: showChatPanel ? "Thu gọn" : "Mở rộng"
          }
        )
      ] }),
      showChatPanel && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2 p-2 rounded-card bg-purple/5 border border-purple/10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-purple", children: [
            "Session: ",
            scriptSessionId
          ] }),
          iterateHistory.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-4 ml-auto", children: [
            iterateHistory.filter((m) => m.role === "user").length,
            " lần sửa"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: ITERATE_SHORTCUTS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            disabled: iterating,
            onClick: () => handleIterate(s.cmd),
            className: "h-[22px] px-2 text-[10px] font-semibold rounded bg-[#6A5BFF]/12 text-[#6A5BFF] border-none cursor-pointer hover:bg-[#6A5BFF]/20 transition-colors disabled:opacity-50",
            children: s.label
          },
          s.label
        )) }),
        iterateHistory.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[250px] overflow-y-auto space-y-1.5 mb-2 p-2 rounded-card bg-bg-2", children: iterateHistory.map((msg, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-[11px] ${msg.role === "user" ? "text-gold" : "text-txt-2"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
            msg.role === "user" ? "Bạn" : "AI",
            ":"
          ] }),
          " ",
          msg.text
        ] }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: iterateInput,
              onChange: (e) => setIterateInput(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && handleIterate(iterateInput),
              placeholder: "Sửa phần 3, thêm ví dụ...",
              disabled: iterating,
              className: "flex-1 h-8 px-3 text-[12px] bg-bg-4 border border-border rounded-lg text-white placeholder:text-txt-3 focus:border-purple/40 focus:outline-none transition-colors disabled:opacity-50"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => handleIterate(iterateInput),
              disabled: iterating || !iterateInput.trim(),
              className: "h-8 px-3 text-[11px] font-semibold rounded-lg bg-[#6A5BFF]/15 text-[#6A5BFF] border-none cursor-pointer hover:bg-[#6A5BFF]/25 transition-colors disabled:opacity-50 flex items-center gap-1",
              children: [
                iterating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 12 }),
                "Gửi"
              ]
            }
          )
        ] })
      ] })
    ] }),
    scriptSessionId && script?.draft_body && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-emerald uppercase tracking-wider flex items-center gap-1.5 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14 }),
        "Gửi Feedback Cho AI"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mb-2", children: "So sánh bản draft AI tạo với bản bạn đã chỉnh sửa. AI sẽ học từ sự khác biệt." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: feedbackNotes,
          onChange: (e) => setFeedbackNotes(e.target.value),
          placeholder: "Ghi chú: CTA quá aggressive, Hook cần emotional hơn...",
          rows: 2,
          className: "w-full mb-2 p-2 text-[12px] bg-bg-4 border border-border rounded-lg text-white placeholder:text-txt-3 focus:border-emerald/40 focus:outline-none resize-none transition-colors"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleSubmitFinal,
          className: "w-full h-8 text-[12px] font-semibold rounded-lg bg-emerald/15 text-emerald border-none cursor-pointer hover:bg-emerald/25 transition-colors flex items-center justify-center gap-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14 }),
            "Lưu Bản Final + Gửi Feedback"
          ]
        }
      )
    ] }),
    status === "review" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "outline",
        size: "sm",
        icon: ArrowLeft,
        onClick: () => handleStatusChange("draft"),
        children: "Trả Về Nháp"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      JobLogViewerPanel,
      {
        mode: "modal",
        jobId: linkedJobId,
        open: logModalOpen,
        onClose: () => setLogModalOpen(false)
      }
    )
  ] });
}

export { ScriptDetailPage as default };
