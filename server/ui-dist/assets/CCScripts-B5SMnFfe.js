import { j as jsxRuntimeExports, bQ as Inbox, bk as cn, r as reactExports, bm as Card, bR as Upload, X, F as FileText, t as TriangleAlert, b3 as CircleCheck, k as LoaderCircle, bc as Button, ae as useNavigate, bl as useToast, bS as useDeleteScript, b0 as useScripts, z as CCSelect, a0 as ArrowUpDown, ao as Funnel, aB as Plus, y as Search, q as ChartColumn, bT as Newspaper, U as Users, B as BookOpen, bU as Link, bg as Badge, c as Clock, E as Eye, ac as Copy, af as Trash2, J as ChevronLeft, K as ChevronRight } from './index-DE6uMbR4.js';
import { F as Film } from './film-DfgKdbwF.js';

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex flex-col items-center justify-center text-center p-12",
        "relative overflow-hidden rounded-glass",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute inset-0 opacity-[0.03] pointer-events-none",
            style: {
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "24px 24px"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mb-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 rounded-full bg-bg-3/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 48, className: "text-txt-3", strokeWidth: 1.5 }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "relative font-heading text-xl text-txt-2 font-semibold mb-2", children: title }),
        description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "relative text-sm text-txt-3 max-w-md mb-6", children: description }),
        actionLabel && onAction && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onAction,
            className: "relative btn btn-g",
            children: actionLabel
          }
        )
      ]
    }
  );
}

function cleanBody(body) {
  let text = body;
  text = text.replace(/## 📝 Full Content\s*/gm, "");
  if (text.toLowerCase().includes("<html") || text.toLowerCase().includes("<!doctype")) {
    const match = text.match(/(<!doctype|<html)[\s\S]*/i);
    if (match) return match[0].trim();
  }
  text = text.replace(/([a-z]\.)([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])/g, "$1\n\n$2");
  let lines = text.split("\n");
  const markers = [
    "output format",
    "emoji rules",
    "facebook compliance",
    "knowledge files",
    "brand identity",
    "tone of voice",
    "i will",
    "mental sandbox",
    "strict adherence",
    "generate the",
    "the user wants",
    "maximum of two",
    "drafting plan",
    "content structure",
    "here is the",
    "dưới đây là",
    "plan for",
    "kế hoạch:",
    "the knowledge files have been read",
    "i will now draft"
  ];
  let lastAiIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if (markers.some((m) => lineLower.includes(m))) {
      lastAiIdx = i;
    }
  }
  if (lastAiIdx >= 0) {
    lines = lines.slice(lastAiIdx + 1);
  }
  while (lines.length > 0) {
    const line = lines[0].trim().toLowerCase();
    if (!line) {
      lines.shift();
      continue;
    }
    let isChatter = false;
    const chatterPattern = /^(chào chị|em chào|em sẽ|em đã|chị muốn|bây giờ, em|đây là bản|chị xem|đây là bài|chúc chị|nếu chị|hy vọng|chị thấy|dạ |đầu tiên,|chị đã|đã rõ|tuyệt vời|quan trọng:|cấu trúc bài|đã nắm|được ạ|đã đọc|nội dung cần|với bài|chị vui lòng|tất cả các file|dạ vâng)/;
    if (chatterPattern.test(line) && line.split(" ").length < 150) {
      isChatter = true;
    }
    if (/^\d+\.\s+(câu chuyện|insight|hành trình|emoji|hình ảnh|tiêu đề)/.test(line)) {
      isChatter = true;
    }
    if (isChatter) {
      lines.shift();
      continue;
    }
    break;
  }
  while (lines.length > 0) {
    const line = lines[lines.length - 1].trim().toLowerCase();
    if (!line) {
      lines.pop();
      continue;
    }
    let isChatter = false;
    const chatterPatternEnd = /^(chị có muốn|chị thấy sao|chúc chị|hy vọng|em đã hoàn thành|đã tạo|quy trình của em|em đã lưu|em đã xong|nếu chị cần|nếu chị muốn)/;
    if (chatterPatternEnd.test(line)) isChatter = true;
    if (line.includes("thực hiện tác vụ nào khác")) isChatter = true;
    if (line.startsWith("image prompt:")) isChatter = true;
    if (isChatter) {
      lines.pop();
      continue;
    }
    break;
  }
  text = lines.join("\n").trim();
  const imagePromptMatch = body.match(/\n*(Image prompt:[\s\S]*)$/i);
  if (imagePromptMatch) {
    if (!text.toLowerCase().includes("image prompt:")) {
      text += "\n\n" + imagePromptMatch[1];
    } else {
      const parts = text.split(/\n*Image prompt:/i);
      if (parts.length > 1) {
        text = parts[0].trim() + "\n\nImage prompt:" + parts.slice(1).join("Image prompt:");
      }
    }
  }
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}
function parseCSV(csvText) {
  const lines = [];
  let currentLine = [];
  let currentVal = "";
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentLine.push(currentVal);
      currentVal = "";
    } else if ((char === "\n" || char === "\r" && nextChar === "\n") && !inQuotes) {
      if (char === "\r") i++;
      currentLine.push(currentVal);
      lines.push(currentLine);
      currentLine = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentLine.length > 0) {
    currentLine.push(currentVal);
    lines.push(currentLine);
  }
  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim().toLowerCase());
  const bodyIdx = headers.findIndex((h) => h === "body");
  const nameIdx = headers.findIndex((h) => h === "name" || h === "title");
  const typeIdx = headers.findIndex((h) => h === "content type" || h === "type");
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length < Math.max(bodyIdx, nameIdx, typeIdx) + 1) continue;
    let body = bodyIdx >= 0 ? row[bodyIdx] : "";
    const name = nameIdx >= 0 ? row[nameIdx] : "";
    const type = typeIdx >= 0 ? row[typeIdx] : "latc";
    if (!body && !name) continue;
    results.push({
      title: name.trim() || "Imported Script",
      body: cleanBody(body),
      content_type: type.toLowerCase().includes("social") ? "social_post" : type.toLowerCase().includes("tmt") ? "tmt" : type.toLowerCase().includes("clip") ? "short_clip" : "latc",
      status: "draft",
      track: "wealth"
      // Default track
    });
  }
  return results;
}
function parseMarkdown(mdText) {
  let sections = mdText.split(/\n---\n/);
  if (sections.length < 2) {
    sections = mdText.split(/\n(?=###? )/);
  }
  const results = [];
  for (const sec of sections) {
    const trimSec = sec.trim();
    if (!trimSec) continue;
    let title = "Imported Script";
    let body = trimSec;
    const titleMatch = trimSec.match(/^(?:###|##|#)\s+(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      body = trimSec.replace(/^(?:###|##|#)\s+(.+)\n*/, "").trim();
    }
    results.push({
      title,
      body: cleanBody(body),
      content_type: "latc",
      status: "draft",
      track: "wealth"
    });
  }
  return results;
}
function CCImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = reactExports.useState(null);
  const [isProcessing, setIsProcessing] = reactExports.useState(false);
  const [progress, setProgress] = reactExports.useState(0);
  const [error, setError] = reactExports.useState("");
  const [successCount, setSuccessCount] = reactExports.useState(0);
  const fileInputRef = reactExports.useRef(null);
  if (!isOpen) return null;
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError("");
      setSuccessCount(0);
    }
  };
  const handleImport = async () => {
    if (!file) {
      setError("Vui lòng chọn file.");
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setError("");
    try {
      const text = await file.text();
      let scriptsToImport = [];
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "csv") {
        scriptsToImport = parseCSV(text);
      } else if (ext === "md" || ext === "txt") {
        scriptsToImport = parseMarkdown(text);
      } else {
        throw new Error("Định dạng file không được hỗ trợ. Vui lòng dùng CSV, MD, hoặc TXT.");
      }
      if (scriptsToImport.length === 0) {
        throw new Error("Không tìm thấy nội dung hợp lệ trong file.");
      }
      let imported = 0;
      for (const script of scriptsToImport) {
        const res = await fetch("/api/ops/content-pipeline/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(script)
        });
        if (!res.ok) {
          console.error(`Failed to import script: ${script.title}`);
        } else {
          imported++;
        }
        setProgress(Math.round(imported / scriptsToImport.length * 100));
      }
      setSuccessCount(imported);
      setTimeout(() => {
        onImportSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi import.");
    } finally {
      setIsProcessing(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", className: "w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading font-semibold text-txt", children: "Import Nội Dung" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "text-txt-3 hover:text-txt transition-colors",
          disabled: isProcessing,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 space-y-6", children: !isProcessing && successCount === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "border-2 border-dashed border-border hover:border-gold/50 rounded-xl p-8 text-center cursor-pointer transition-colors",
          onClick: () => fileInputRef.current?.click(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                className: "hidden",
                ref: fileInputRef,
                accept: ".csv,.md,.txt",
                onChange: handleFileChange
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 32, className: "mx-auto text-txt-3 mb-3" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-txt mb-1", children: file ? file.name : "Kéo thả hoặc Click để chọn file" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "Hỗ trợ: CSV, Markdown (.md), Text (.txt)" })
          ]
        }
      ),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-lg text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 16 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center", children: successCount > 0 && progress === 100 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 48, className: "mx-auto text-success mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-heading font-bold text-lg text-txt mb-1", children: "Import Thành Công!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-txt-2", children: [
        "Đã import ",
        successCount,
        " kịch bản."
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 40, className: "mx-auto text-gold animate-spin mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-heading font-bold text-txt mb-2", children: "Đang xử lý nội dung..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-bg-3 rounded-full h-2 mt-4 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "bg-gold h-full transition-all duration-300",
          style: { width: `${progress}%` }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3 mt-2", children: [
        progress,
        "% hoàn thành"
      ] })
    ] }) }) }),
    !isProcessing && successCount === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-border/50 bg-bg-2 flex justify-end gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: onClose, children: "Hủy" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "gold", onClick: handleImport, disabled: !file, children: "Bắt Đầu Import" })
    ] })
  ] }) });
}

const STATUS_CONFIG = {
  draft: { label: "Bản Nháp", variant: "info" },
  generating: { label: "Đang Tạo", variant: "default" },
  review: { label: "Chờ Duyệt", variant: "gold" },
  revision: { label: "Cần Sửa", variant: "danger" },
  approved: { label: "Đã Duyệt", variant: "success" },
  published: { label: "Đã Xuất Bản", variant: "success" },
  archived: { label: "Lưu Trữ", variant: "default" }
};
const CONTENT_TYPE_CONFIG = {
  latc: { label: "LATC", icon: BookOpen, color: "text-gold" },
  tmt: { label: "TMT", icon: Users, color: "text-purple" },
  short_clip: { label: "Clip Ngắn", icon: Film, color: "text-cyan" },
  social_post: { label: "Bài Đăng MXH", icon: FileText, color: "text-pink" },
  news: { label: "Tin Tức", icon: Newspaper, color: "text-emerald" },
  analysis: { label: "Phân Tích", icon: ChartColumn, color: "text-cyan" }
};
const TRACK_CONFIG = {
  wealth: { label: "Wealth", color: "text-gold" },
  wellness: { label: "Wellness", color: "text-purple" },
  integration: { label: "Integration", color: "text-emerald" }
};
const PAGE_SIZE = 20;
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function formatTimeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(dateStr);
}
function estimateDuration(wordCount) {
  if (!wordCount) return "—";
  const minutes = Math.round(wordCount / 150);
  if (minutes < 1) return "< 1 phút";
  return `~${minutes} phút`;
}
function ScriptsListPage() {
  const navigate = useNavigate();
  const addToast = useToast((s) => s.addToast);
  const deleteMutation = useDeleteScript();
  const [search, setSearch] = reactExports.useState("");
  const [contentTypeFilter, setContentTypeFilter] = reactExports.useState("");
  const [trackFilter, setTrackFilter] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [page, setPage] = reactExports.useState(0);
  const [showAll, setShowAll] = reactExports.useState(false);
  const [showFilters, setShowFilters] = reactExports.useState(false);
  const [sortBy, setSortBy] = reactExports.useState("newest");
  const [deleteConfirmId, setDeleteConfirmId] = reactExports.useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = reactExports.useState(false);
  const filters = reactExports.useMemo(() => ({
    ...search ? { search } : {},
    ...contentTypeFilter ? { content_type: contentTypeFilter } : {},
    ...trackFilter ? { track: trackFilter } : {},
    ...statusFilter ? { status: statusFilter } : {},
    page: showAll ? 0 : page,
    pageSize: showAll ? 1e3 : PAGE_SIZE
  }), [search, contentTypeFilter, trackFilter, statusFilter, page, showAll]);
  const { data: scriptsData, isLoading, error } = useScripts(filters);
  const scripts = reactExports.useMemo(() => {
    const items = (scriptsData?.data ?? []).map((s) => {
      let title = s.title ?? "Nội Dung Không Tên";
      if (title.startsWith("```") || title.startsWith("{")) {
        title = title.replace(/^```\w*\s*/, "").replace(/```\s*$/, "").replace(/^\{?\s*"?\s*/, "").replace(/\s*"?\s*\}?$/, "").trim();
        if (!title || title.includes('":')) {
          try {
            let bodyStr = (s.body ?? "").trim();
            if (bodyStr.startsWith("```")) bodyStr = bodyStr.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "");
            const parsed = JSON.parse(bodyStr);
            title = parsed.title || parsed.summary?.slice(0, 80) || title;
          } catch {
          }
        }
      }
      return { ...s, _source: "script", title: title || "Nội Dung Không Tên" };
    });
    switch (sortBy) {
      case "oldest":
        items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "title_asc":
        items.sort((a, b) => a.title.localeCompare(b.title, "vi"));
        break;
      case "title_desc":
        items.sort((a, b) => b.title.localeCompare(a.title, "vi"));
        break;
      case "word_count":
        items.sort((a, b) => (b.word_count ?? 0) - (a.word_count ?? 0));
        break;
    }
    return items;
  }, [scriptsData, sortBy]);
  const totalCount = scriptsData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = contentTypeFilter || trackFilter || statusFilter;
  const handleClearFilters = reactExports.useCallback(() => {
    setContentTypeFilter("");
    setTrackFilter("");
    setStatusFilter("");
    setSearch("");
    setPage(0);
    setShowAll(false);
  }, []);
  const handleDelete = reactExports.useCallback(async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      addToast({ type: "success", message: "Đã xóa nội dung." });
      setDeleteConfirmId(null);
    } catch {
      addToast({ type: "error", message: "Không thể xóa nội dung." });
    }
  }, [deleteMutation, addToast]);
  const handleDuplicate = reactExports.useCallback(async (_script) => {
    addToast({ type: "info", message: "Đang chuyển đến Trình Tạo Nội Dung AI..." });
    navigate("../ai-gen");
  }, [navigate, addToast]);
  const statsSummary = reactExports.useMemo(() => {
    const total = totalCount;
    return { total };
  }, [totalCount]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 24, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-heading text-xl font-bold text-txt", children: "Tất Cả Nội Dung" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3 mt-0.5", children: [
            statsSummary.total,
            " nội dung"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: sortBy,
              onChange: (e) => setSortBy(e.target.value),
              className: "text-xs pl-8 pr-3 py-1.5 w-auto cursor-pointer",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "newest", children: "Mới nhất" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "oldest", children: "Cũ nhất" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "title_asc", children: "A → Z" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "title_desc", children: "Z → A" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "word_count", children: "Số từ" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { size: 14, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-3 pointer-events-none" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            icon: Funnel,
            onClick: () => setShowFilters(!showFilters),
            children: [
              "Bộ Lọc",
              hasActiveFilters && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 w-2 h-2 rounded-full bg-gold inline-block" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: () => setIsImportModalOpen(true),
            children: "Import"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "gold",
            size: "sm",
            icon: Plus,
            onClick: () => navigate("./new"),
            children: "Tạo Mới"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CCImportModal,
      {
        isOpen: isImportModalOpen,
        onClose: () => setIsImportModalOpen(false),
        onImportSuccess: () => {
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "glass", padding: "md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 18, className: "text-txt-3 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: search,
          onChange: (e) => {
            setSearch(e.target.value);
            setPage(0);
            setShowAll(false);
          },
          placeholder: "Tìm kiếm kịch bản theo tiêu đề...",
          className: "flex-1 bg-transparent text-sm text-txt placeholder:text-txt-3 focus:outline-none"
        }
      ),
      search && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setSearch(""),
          className: "text-txt-3 hover:text-txt transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
        }
      )
    ] }) }),
    showFilters && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "glass", padding: "md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider", children: "Bộ Lọc" }),
        hasActiveFilters && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleClearFilters,
            className: "text-xxs text-gold hover:underline",
            children: "Xóa tất cả"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 mb-1 block", children: "Sắp Xếp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: sortBy,
              onChange: (e) => setSortBy(e.target.value),
              className: "text-xs w-full",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "newest", children: "Mới nhất" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "oldest", children: "Cũ nhất" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "title_asc", children: "Tiêu đề A → Z" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "title_desc", children: "Tiêu đề Z → A" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "word_count", children: "Số từ nhiều nhất" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 mb-1 block", children: "Loại Nội Dung" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: contentTypeFilter,
              onChange: (e) => {
                setContentTypeFilter(e.target.value);
                setPage(0);
                setShowAll(false);
              },
              className: "text-xs w-full",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "latc", children: "LATC" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tmt", children: "TMT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "short_clip", children: "Clip Ngắn" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "social_post", children: "Bài Đăng MXH" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "news", children: "Tin Tức / Blog" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 mb-1 block", children: "Track" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: trackFilter,
              onChange: (e) => {
                setTrackFilter(e.target.value);
                setPage(0);
                setShowAll(false);
              },
              className: "text-xs w-full",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Wealth" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wellness", children: "Wellness" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Integration" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xxs text-txt-3 mb-1 block", children: "Trạng Thái" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: statusFilter,
              onChange: (e) => {
                setStatusFilter(e.target.value);
                setPage(0);
                setShowAll(false);
              },
              className: "text-xs w-full",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "draft", children: "Bản Nháp" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "review", children: "Chờ Duyệt" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "approved", children: "Đã Duyệt" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "published", children: "Đã Xuất Bản" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "archived", children: "Lưu Trữ" })
              ]
            }
          )
        ] })
      ] })
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 28, className: "animate-spin text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-3 text-sm text-txt-2", children: "Đang tải danh sách..." })
    ] }),
    error && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "glass", padding: "lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 36, className: "mx-auto mb-3 text-danger" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-danger mb-1", children: "Không thể tải danh sách kịch bản" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: error.message })
    ] }) }),
    !isLoading && !error && scripts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      EmptyState,
      {
        icon: FileText,
        title: search || hasActiveFilters ? "Không tìm thấy kịch bản" : "Chưa có kịch bản nào",
        description: search || hasActiveFilters ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." : "Bắt đầu tạo kịch bản đầu tiên bằng Trình Tạo Nội Dung AI.",
        actionLabel: search || hasActiveFilters ? "Xóa Bộ Lọc" : "Tạo Kịch Bản",
        onAction: search || hasActiveFilters ? handleClearFilters : () => navigate("./720bd1a5-5934-431f-a323-41aa95e989ff")
      }
    ),
    !isLoading && !error && scripts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: scripts.map((script) => {
      let contentType = script.content_type ?? "latc";
      let contentTypeStr = contentType.toLowerCase();
      if (script.job_type === "analysis" || contentTypeStr === "short_clip" && script.job_type === "analysis") {
        contentTypeStr = "analysis";
      }
      const typeConfig = CONTENT_TYPE_CONFIG[contentTypeStr] ?? {
        label: contentType.toUpperCase(),
        icon: FileText,
        color: "text-gold"
      };
      const TypeIcon = typeConfig.icon;
      const track = script.track ?? "";
      const trackConfig = TRACK_CONFIG[track];
      const status = script.status ?? "draft";
      const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
      const wordCount = script.word_count;
      const title = script.title ?? "Kịch Bản Không Tên";
      const createdAt = script.created_at ?? "";
      const updatedAt = script.updated_at ?? "";
      const id = script.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "rounded-card border border-border bg-glass-bg hover:border-gold/30 transition-colors relative",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Link,
              {
                className: "absolute inset-0 z-0 rounded-card",
                to: `./${id}`
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 px-5 py-4 relative z-10 pointer-events-none", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `shrink-0 w-10 h-10 rounded-card bg-glass-bg flex items-center justify-center ${typeConfig.color}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypeIcon, { size: 20 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-txt truncate max-w-full", children: title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Badge,
                      {
                        text: typeConfig.label,
                        variant: contentTypeStr === "latc" ? "gold" : contentTypeStr === "tmt" ? "key" : "default",
                        size: "sm"
                      }
                    ),
                    script.job_type && script.job_type.toLowerCase() !== contentTypeStr && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Badge,
                      {
                        text: script.job_type.toUpperCase(),
                        variant: "outline",
                        size: "sm"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-xxs text-txt-3", children: [
                  trackConfig && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: trackConfig.color, children: trackConfig.label }),
                  wordCount && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    wordCount.toLocaleString("vi-VN"),
                    " từ"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: estimateDuration(wordCount) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
                    formatTimeAgo(updatedAt || createdAt)
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 shrink-0 pointer-events-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Badge,
                  {
                    text: statusCfg.label,
                    variant: statusCfg.variant,
                    size: "sm",
                    dot: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Link,
                    {
                      to: `./${id}`,
                      className: "p-1.5 flex items-center justify-center rounded-badge text-txt-3 hover:text-txt hover:bg-bg-4 transition-all",
                      title: "Xem chi tiết",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14 })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => {
                        e.preventDefault();
                        handleDuplicate(script);
                      },
                      className: "p-1.5 rounded-badge text-txt-3 hover:text-txt hover:bg-bg-4 transition-all",
                      title: "Tạo bản sao",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 14 })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: (e) => {
                        e.preventDefault();
                        setDeleteConfirmId(id);
                      },
                      className: "p-1.5 rounded-badge text-txt-3 hover:text-danger hover:bg-danger/10 transition-all",
                      title: "Xóa",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 })
                    }
                  )
                ] })
              ] })
            ] }),
            deleteConfirmId === id && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-t border-border bg-danger/5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-danger", children: [
                'Xóa kịch bản "',
                title,
                '"? Hành động không thể hoàn tác.'
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: () => setDeleteConfirmId(null),
                    children: "Hủy"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "danger",
                    size: "sm",
                    icon: Trash2,
                    loading: deleteMutation.isPending,
                    onClick: () => handleDelete(id),
                    children: "Xóa"
                  }
                )
              ] })
            ] })
          ]
        },
        id
      );
    }) }),
    totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3", children: [
        "Trang ",
        showAll ? "Tất cả" : page + 1,
        " / ",
        showAll ? "Tất cả" : totalPages,
        " (",
        totalCount,
        " kịch bản)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        !showAll && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            icon: ChevronLeft,
            disabled: page === 0,
            onClick: () => setPage(page - 1),
            children: "Trước"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: () => {
              setShowAll(!showAll);
              setPage(0);
            },
            children: showAll ? "Phân trang" : "Tất cả"
          }
        ),
        !showAll && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            icon: ChevronRight,
            disabled: page >= totalPages - 1,
            onClick: () => setPage(page + 1),
            children: "Sau"
          }
        )
      ] })
    ] })
  ] });
}

export { ScriptsListPage as default };
