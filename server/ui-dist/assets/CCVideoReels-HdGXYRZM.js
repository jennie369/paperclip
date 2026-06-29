import { o as createLucideIcon, r as reactExports, bR as Upload, cu as Music, cv as Mic, aw as Brain, j as jsxRuntimeExports, cw as Video, Z as Zap, cx as File, X, C as CircleCheckBig, k as LoaderCircle, R as RefreshCw, a2 as Download, F as FileText, y as Search, z as CCSelect, cy as List, cz as FolderOpen, a3 as Monitor, W as Info, cA as Cpu, a8 as CircleX, ac as Copy, a1 as WandSparkles, P as PenLine, v as Play, E as Eye, af as Trash2 } from './index-vfZhbUFH.js';
import { S as Scissors } from './scissors-CbpUWQor.js';
import { G as Grid3x3 } from './grid-3x3-exyPWS5y.js';
import { H as HardDrive } from './hard-drive-CnSL7Vyt.js';

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$2 = [
  ["rect", { width: "18", height: "14", x: "3", y: "5", rx: "2", ry: "2", key: "12ruh7" }],
  ["path", { d: "M7 15h4M15 15h2M7 11h2M13 11h4", key: "1ueiar" }]
];
const Captions = createLucideIcon("captions", __iconNode$2);

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$1 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M9 15h6", key: "cctwl0" }],
  ["path", { d: "M12 18v-6", key: "17g6i2" }]
];
const FilePlus = createLucideIcon("file-plus", __iconNode$1);

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  ["path", { d: "m16 6 4 14", key: "ji33uf" }],
  ["path", { d: "M12 6v14", key: "1n7gus" }],
  ["path", { d: "M8 8v12", key: "1gg7y9" }],
  ["path", { d: "M4 4v16", key: "6qkkli" }]
];
const Library = createLucideIcon("library", __iconNode);

const PIPELINE_STEPS = [
  {
    id: "upload",
    label: "Upload Video",
    description: "Kéo thả hoặc chọn file MP4, MOV, WebM",
    icon: Upload,
    status: "idle"
  },
  {
    id: "audio",
    label: "Trích Xuất Audio",
    description: "Tách audio track từ video (FFmpeg)",
    icon: Music,
    status: "idle"
  },
  {
    id: "whisper",
    label: "Whisper STT",
    description: "Chuyển giọng nói thành văn bản (OpenAI Whisper)",
    icon: Mic,
    status: "idle"
  },
  {
    id: "sentiment",
    label: "Phân Tích Cảm Xúc",
    description: "Phân tích sentiment từng đoạn văn bản",
    icon: Brain,
    status: "idle"
  },
  {
    id: "smartcut",
    label: "Smart Cut",
    description: "Gợi ý điểm cắt thông minh dựa trên nội dung",
    icon: Scissors,
    status: "idle"
  },
  {
    id: "subtitle",
    label: "Xuất Phụ Đề",
    description: "Tạo file SRT/VTT từ transcript",
    icon: Captions,
    status: "idle"
  },
  {
    id: "library",
    label: "Thư Viện Video",
    description: "Lưu và quản lý video đã xử lý",
    icon: Library,
    status: "idle"
  }
];
const MOCK_TRANSCRIPT = [
  {
    id: "seg-1",
    start: 0,
    end: 4.2,
    text: "Xin chào các bạn, hôm nay chúng ta sẽ nói về Luật Hấp Dẫn và cách áp dụng trong giao dịch.",
    sentiment: "positive",
    confidence: 0.95,
    isHighlight: true
  },
  {
    id: "seg-2",
    start: 4.2,
    end: 9.8,
    text: "Nhiều người hỏi tôi rằng làm thế nào để kiếm được nhiều tiền hơn. Câu trả lời không nằm ở công cụ.",
    sentiment: "neutral",
    confidence: 0.92,
    isHighlight: false
  },
  {
    id: "seg-3",
    start: 9.8,
    end: 15.3,
    text: "Mà nằm ở tư duy của bạn. Khi bạn thay đổi cách suy nghĩ, kết quả giao dịch sẽ thay đổi.",
    sentiment: "positive",
    confidence: 0.88,
    isHighlight: true
  },
  {
    id: "seg-4",
    start: 15.3,
    end: 21.7,
    text: "Tôi đã từng thua lỗ rất nhiều. Nhưng mỗi lần thất bại, tôi học được một bài học quan trọng.",
    sentiment: "negative",
    confidence: 0.91,
    isHighlight: false
  },
  {
    id: "seg-5",
    start: 21.7,
    end: 28.4,
    text: "Và đây là 3 bước đơn giản để bạn có thể bắt đầu áp dụng ngay hôm nay.",
    sentiment: "positive",
    confidence: 0.94,
    isHighlight: true
  },
  {
    id: "seg-6",
    start: 28.4,
    end: 35,
    text: 'Bước một: Thiết lập mục tiêu rõ ràng. Không phải "tôi muốn giàu", mà là "tôi muốn đạt 100 triệu trong 6 tháng".',
    sentiment: "positive",
    confidence: 0.93,
    isHighlight: false
  },
  {
    id: "seg-7",
    start: 35,
    end: 42.1,
    text: "Bước hai: Tạo kế hoạch hành động cụ thể. Mỗi ngày bạn cần làm gì để tiến gần hơn đến mục tiêu.",
    sentiment: "neutral",
    confidence: 0.9,
    isHighlight: false
  },
  {
    id: "seg-8",
    start: 42.1,
    end: 48.5,
    text: "Bước ba: Kiểm soát cảm xúc khi giao dịch. Đây là điều quan trọng nhất mà hầu hết mọi người bỏ qua.",
    sentiment: "positive",
    confidence: 0.96,
    isHighlight: true
  },
  {
    id: "seg-9",
    start: 48.5,
    end: 55,
    text: "Nếu bạn thích video này, hãy nhấn nút đăng ký và bật chuông thông báo để không bỏ lỡ những chia sẻ tiếp theo.",
    sentiment: "positive",
    confidence: 0.97,
    isHighlight: true
  }
];
const MOCK_SMART_CUTS = [
  {
    id: "cut-1",
    startTime: 0,
    endTime: 4.2,
    reason: "Hook mở đầu — thu hút sự chú ý",
    type: "hook",
    score: 95
  },
  {
    id: "cut-2",
    startTime: 9.8,
    endTime: 15.3,
    reason: "Điểm chuyển tư duy — insight quan trọng",
    type: "climax",
    score: 88
  },
  {
    id: "cut-3",
    startTime: 21.7,
    endTime: 28.4,
    reason: "Bắt đầu hướng dẫn — giá trị cao",
    type: "climax",
    score: 82
  },
  {
    id: "cut-4",
    startTime: 42.1,
    endTime: 48.5,
    reason: "Điểm cảm xúc mạnh — emotional peak",
    type: "emotional",
    score: 90
  },
  {
    id: "cut-5",
    startTime: 48.5,
    endTime: 55,
    reason: "Call-to-Action cuối video",
    type: "cta",
    score: 85
  }
];
const MOCK_SUBTITLES = MOCK_TRANSCRIPT.map((seg, i) => ({
  id: `sub-${i + 1}`,
  index: i + 1,
  start: seg.start,
  end: seg.end,
  text: seg.text
}));
const MOCK_LIBRARY = [
  {
    id: "vid-1",
    title: "LATC #47 — 3 Bước Áp Dụng Luật Hấp Dẫn Trong Trading",
    duration: "12:34",
    durationSec: 754,
    thumbnail: "",
    size: "245 MB",
    date: "2026-03-01",
    status: "processed",
    hasSubtitles: true,
    segmentCount: 42,
    pillar: "wealth"
  },
  {
    id: "vid-2",
    title: "TMT #23 — Thiền Định Và Cách Nâng Cao Tần Số Bản Thân",
    duration: "15:07",
    durationSec: 907,
    thumbnail: "",
    size: "312 MB",
    date: "2026-02-28",
    status: "processed",
    hasSubtitles: true,
    segmentCount: 56,
    pillar: "wellness"
  },
  {
    id: "vid-3",
    title: "GEM Integration — Cân Bằng Cuộc Sống Và Tài Chính",
    duration: "09:45",
    durationSec: 585,
    thumbnail: "",
    size: "178 MB",
    date: "2026-02-26",
    status: "processed",
    hasSubtitles: true,
    segmentCount: 35,
    pillar: "integration"
  },
  {
    id: "vid-4",
    title: "LATC #48 — Tư Duy Triệu Phú Và Tâm Lý Giao Dịch",
    duration: "18:22",
    durationSec: 1102,
    thumbnail: "",
    size: "402 MB",
    date: "2026-02-24",
    status: "processing",
    hasSubtitles: false,
    segmentCount: 0,
    pillar: "wealth"
  },
  {
    id: "vid-5",
    title: "TMT #24 — Chữa Lành Tổn Thương Nội Tâm",
    duration: "20:11",
    durationSec: 1211,
    thumbnail: "",
    size: "456 MB",
    date: "2026-02-22",
    status: "processed",
    hasSubtitles: true,
    segmentCount: 68,
    pillar: "wellness"
  }
];
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor(seconds % 1 * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}
function getSentimentColor(sentiment) {
  switch (sentiment) {
    case "positive":
      return "text-emerald";
    case "negative":
      return "text-rose-400";
    default:
      return "text-txt-3";
  }
}
function getSentimentBg(sentiment) {
  switch (sentiment) {
    case "positive":
      return "bg-emerald/10 border-emerald/20";
    case "negative":
      return "bg-rose-400/10 border-rose-400/20";
    default:
      return "bg-bg-4 border-border";
  }
}
function getCutTypeColor(type) {
  switch (type) {
    case "hook":
      return "text-gold bg-gold/10";
    case "climax":
      return "text-purple bg-purple/10";
    case "cta":
      return "text-emerald bg-emerald/10";
    case "emotional":
      return "text-rose-400 bg-rose-400/10";
    default:
      return "text-txt-3 bg-bg-4";
  }
}
function getCutTypeLabel(type) {
  switch (type) {
    case "hook":
      return "Hook";
    case "climax":
      return "Climax";
    case "cta":
      return "CTA";
    case "emotional":
      return "Cảm Xúc";
    default:
      return type;
  }
}
function getPillarBadge(pillar) {
  switch (pillar) {
    case "wealth":
      return "bg-gold/10 text-gold";
    case "wellness":
      return "bg-purple/10 text-purple";
    case "integration":
      return "bg-emerald/10 text-emerald";
    default:
      return "bg-bg-4 text-txt-3";
  }
}
function getPillarLabel(pillar) {
  switch (pillar) {
    case "wealth":
      return "Wealth";
    case "wellness":
      return "Wellness";
    case "integration":
      return "Integration";
    default:
      return pillar;
  }
}
function DesktopOnlyGate({ children }) {
  const [isTauri, setIsTauri] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const hasTauri = typeof window !== "undefined" && "__TAURI__" in window;
    setIsTauri(hasTauri);
  }, []);
  if (isTauri === null) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 32, className: "animate-spin text-txt-3" }) });
  }
  if (!isTauri) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6 animate-fade-in", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-12 text-center max-w-lg mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-20 rounded-full bg-purple/10 flex items-center justify-center mx-auto mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { size: 40, className: "text-gold" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-2xl font-bold text-txt mb-3", children: "Chức Năng Desktop" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 mb-6 leading-relaxed", children: "Chức năng xử lý video chỉ khả dụng trên ứng dụng Desktop. Phiên bản web không hỗ trợ xử lý video cục bộ vì giới hạn trình duyệt." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 rounded-card bg-glass-bg border border-border mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 18, className: "text-gold shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium mb-1", children: "Tại sao cần Desktop?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-1 text-xs text-txt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { size: 12 }),
              " Xử lý FFmpeg cục bộ — không cần upload lên server"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 12 }),
              " Truy cập trực tiếp hệ thống file"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 12 }),
              " GPU acceleration cho video processing"
            ] })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-p flex items-center gap-2 mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16 }),
        "Tải Ứng Dụng Desktop"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-3", children: "Hỗ trợ Windows 10+, macOS 12+, Linux (Ubuntu 22.04+)" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}
function UploadZone({
  onFileSelect,
  isDragging,
  setIsDragging
}) {
  const inputRef = reactExports.useRef(null);
  const handleDragOver = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
    },
    [setIsDragging]
  );
  const handleDragLeave = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
    },
    [setIsDragging]
  );
  const handleDrop = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect, setIsDragging]
  );
  const handleClick = () => {
    inputRef.current?.click();
  };
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onClick: handleClick,
      className: `
        relative cursor-pointer rounded-card border-2 border-dashed p-12 text-center
        transition-all duration-300
        ${isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-border-2 hover:border-gold/40 hover:bg-glass-bg"}
      `,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            type: "file",
            accept: "video/mp4,video/mov,video/webm,video/quicktime",
            onChange: handleChange,
            className: "hidden"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-bg-4 flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 28, className: isDragging ? "text-gold" : "text-txt-3" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium mb-1", children: isDragging ? "Thả file ở đây..." : "Kéo thả video vào đây" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-4", children: "hoặc nhấn để chọn file từ máy tính" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-4 text-xxs text-txt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(File, { size: 12 }),
            " MP4, MOV, WebM"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 12 }),
            " Tối đa 2 GB"
          ] })
        ] })
      ]
    }
  );
}
function PipelineProgress({ steps }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt mb-4 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 16, className: "text-gold" }),
      "Pipeline Xử Lý"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: steps.map((step, index) => {
      const Icon = step.icon;
      const isLast = index === steps.length - 1;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all
                    ${step.status === "complete" ? "bg-emerald/20" : ""}
                    ${step.status === "active" ? "bg-gold/20 animate-pulse" : ""}
                    ${step.status === "error" ? "bg-rose-400/20" : ""}
                    ${step.status === "idle" ? "bg-bg-4" : ""}
                  `,
              children: step.status === "complete" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 16, className: "text-emerald" }) : step.status === "active" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 16, className: "text-gold animate-spin" }) : step.status === "error" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 16, className: "text-rose-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 16, className: "text-txt-3" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `text-xs font-medium ${step.status === "active" ? "text-gold" : step.status === "complete" ? "text-emerald" : "text-txt-2"}`,
                  children: step.label
                }
              ),
              step.status === "active" && step.progress !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-gold", children: [
                step.progress,
                "%"
              ] })
            ] }),
            step.status === "active" && step.progress !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-bg-4 rounded-full h-1 mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "bg-gold h-1 rounded-full transition-all duration-300",
                style: { width: `${step.progress}%` }
              }
            ) })
          ] })
        ] }),
        !isLast && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-4 border-l border-border-2 h-2" })
      ] }, step.id);
    }) })
  ] });
}
function TranscriptViewer({
  segments,
  activeSegment,
  onSegmentClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16, className: "text-gold" }),
        "Transcript"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-gh text-xxs flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 12 }),
          " Sao Chép"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-gh text-xxs flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12 }),
          " Xuất TXT"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 max-h-[400px] overflow-y-auto pr-2", children: segments.map((seg) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        onClick: () => onSegmentClick(seg.id),
        className: `
              p-3 rounded-card border cursor-pointer transition-all
              ${activeSegment === seg.id ? "border-gold/40 bg-gold/5" : getSentimentBg(seg.sentiment)}
              hover:border-gold/30
            `,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3 font-mono", children: [
              formatTime(seg.start),
              " — ",
              formatTime(seg.end)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              seg.isHighlight && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs bg-gold/10 text-gold px-1.5 py-0.5 rounded-badge", children: "Highlight" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xxs ${getSentimentColor(seg.sentiment)}`, children: seg.confidence > 0.9 ? "Cao" : seg.confidence > 0.8 ? "TB" : "Thấp" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 leading-relaxed", children: seg.text })
        ]
      },
      seg.id
    )) })
  ] });
}
function SmartCutPanel({ suggestions }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { size: 16, className: "text-gold" }),
        "Gợi Ý Smart Cut"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
        suggestions.length,
        " gợi ý"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: suggestions.map((cut) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "p-3 rounded-card bg-glass-bg border border-border hover:border-border-2 transition-all",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xxs px-2 py-0.5 rounded-badge ${getCutTypeColor(cut.type)}`, children: getCutTypeLabel(cut.type) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3 font-mono", children: [
                formatTime(cut.startTime),
                " — ",
                formatTime(cut.endTime)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-1.5 rounded-full bg-bg-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "h-1.5 rounded-full bg-gold",
                  style: { width: `${cut.score}%` }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-gold", children: cut.score })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2", children: cut.reason })
        ]
      },
      cut.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-p text-xs flex-1 flex items-center justify-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 14 }),
        " Tạo Clip Tự Động"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-o text-xs flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14 }),
        " EDL"
      ] })
    ] })
  ] });
}
function SubtitleEditor({ subtitles }) {
  const [editingId, setEditingId] = reactExports.useState(null);
  const [editText, setEditText] = reactExports.useState("");
  const handleEdit = (sub) => {
    setEditingId(sub.id);
    setEditText(sub.text);
  };
  const handleSave = () => {
    setEditingId(null);
    setEditText("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 16, className: "text-emerald" }),
        "Chỉnh Sửa Phụ Đề"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-gh text-xxs flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12 }),
          " SRT"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-gh text-xxs flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12 }),
          " VTT"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 max-h-[350px] overflow-y-auto pr-2", children: subtitles.map((sub) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-start gap-2 p-2 rounded-card bg-glass-bg hover:bg-bg-4 transition-all group",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3 font-mono w-6 shrink-0 pt-0.5 text-right", children: sub.index }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3 font-mono w-24 shrink-0 pt-0.5", children: [
            formatTime(sub.start),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            formatTime(sub.end)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: editingId === sub.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: editText,
                onChange: (e) => setEditText(e.target.value),
                className: "ft text-xs flex-1 min-h-[40px]",
                autoFocus: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleSave,
                className: "btn btn-p text-xxs px-2",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12 })
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 leading-relaxed", children: sub.text }) }),
          editingId !== sub.id && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => handleEdit(sub),
              className: "opacity-0 group-hover:opacity-100 transition-all text-txt-3 hover:text-gold",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { size: 12 })
            }
          )
        ]
      },
      sub.id
    )) })
  ] });
}
function VideoLibraryGrid({
  videos,
  viewMode
}) {
  if (viewMode === "grid") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g2", style: { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }, children: videos.map((video) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "card overflow-hidden hover:shadow-glass-hover transition-all group",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-video bg-bg-4 flex items-center justify-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 32, className: "text-txt-3" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Play,
              {
                size: 36,
                className: "text-white opacity-0 group-hover:opacity-100 transition-all"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute bottom-2 right-2 text-xxs bg-black/70 text-white px-1.5 py-0.5 rounded", children: video.duration }),
            video.status === "processing" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "absolute top-2 left-2 text-xxs bg-gold/90 text-bg px-1.5 py-0.5 rounded-badge flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 10, className: "animate-spin" }),
              " Đang xử lý"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs text-txt font-medium mb-2 line-clamp-2 leading-relaxed", children: video.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xxs px-1.5 py-0.5 rounded-badge ${getPillarBadge(video.pillar)}`, children: getPillarLabel(video.pillar) }),
                video.hasSubtitles && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3 flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 10 }),
                  " Phụ đề"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: video.size })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mt-2 pt-2 border-t border-border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: video.date }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1 rounded text-txt-3 hover:text-gold transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 12 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1 rounded text-txt-3 hover:text-gold transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1 rounded text-txt-3 hover:text-rose-400 transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 12 }) })
              ] })
            ] })
          ] })
        ]
      },
      video.id
    )) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Video" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Trụ Cột" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Thời Lượng" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Kích Thước" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Trạng Thái" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left text-xxs text-txt-3 font-medium p-3", children: "Ngày" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right text-xxs text-txt-3 font-medium p-3", children: "Thao Tác" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: videos.map((video) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "tr",
      {
        className: "border-b border-border last:border-0 hover:bg-glass-bg transition-all",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded bg-bg-4 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 16, className: "text-txt-3" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt font-medium line-clamp-1", children: video.title })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xxs px-1.5 py-0.5 rounded-badge ${getPillarBadge(video.pillar)}`, children: getPillarLabel(video.pillar) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-xs text-txt-2", children: video.duration }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-xs text-txt-3", children: video.size }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: video.status === "processed" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-emerald flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12 }),
            " Hoàn thành"
          ] }) : video.status === "processing" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-gold flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }),
            " Đang xử lý"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-rose-400 flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 12 }),
            " Lỗi"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-xs text-txt-3", children: video.date }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1.5 rounded text-txt-3 hover:text-gold transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1.5 rounded text-txt-3 hover:text-gold transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-1.5 rounded text-txt-3 hover:text-rose-400 transition-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 }) })
          ] }) })
        ]
      },
      video.id
    )) })
  ] }) });
}
function VideoReelsPage() {
  const [activeSection, setActiveSection] = reactExports.useState("pipeline");
  const [selectedFile, setSelectedFile] = reactExports.useState(null);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [pipelineSteps, setPipelineSteps] = reactExports.useState(PIPELINE_STEPS);
  const [isProcessing, setIsProcessing] = reactExports.useState(false);
  const [processingComplete, setProcessingComplete] = reactExports.useState(false);
  const [activeSegment, setActiveSegment] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("grid");
  const [librarySearch, setLibrarySearch] = reactExports.useState("");
  const [pillarFilter, setPillarFilter] = reactExports.useState("all");
  const handleFileSelect = reactExports.useCallback((file) => {
    setSelectedFile(file);
    setPipelineSteps(
      (prev) => prev.map((s) => s.id === "upload" ? { ...s, status: "complete" } : s)
    );
  }, []);
  const simulateProcessing = reactExports.useCallback(async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProcessingComplete(false);
    const stepOrder = [
      "audio",
      "whisper",
      "sentiment",
      "smartcut",
      "subtitle",
      "library"
    ];
    for (const stepId of stepOrder) {
      setPipelineSteps(
        (prev) => prev.map(
          (s) => s.id === stepId ? { ...s, status: "active", progress: 0 } : s
        )
      );
      for (let p = 0; p <= 100; p += 20) {
        await new Promise((r) => setTimeout(r, 200));
        setPipelineSteps(
          (prev) => prev.map((s) => s.id === stepId ? { ...s, progress: p } : s)
        );
      }
      setPipelineSteps(
        (prev) => prev.map(
          (s) => s.id === stepId ? { ...s, status: "complete", progress: void 0 } : s
        )
      );
    }
    setIsProcessing(false);
    setProcessingComplete(true);
  }, [selectedFile]);
  const handleReset = reactExports.useCallback(() => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProcessingComplete(false);
    setActiveSegment(null);
    setPipelineSteps(PIPELINE_STEPS);
  }, []);
  const filteredLibrary = MOCK_LIBRARY.filter((v) => {
    const matchSearch = !librarySearch || v.title.toLowerCase().includes(librarySearch.toLowerCase());
    const matchPillar = pillarFilter === "all" || v.pillar === pillarFilter;
    return matchSearch && matchPillar;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopOnlyGate, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "font-heading text-2xl font-bold text-txt flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 24, className: "text-emerald" }),
          "Xử Lý Video"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3 mt-1", children: "Upload, trích xuất audio, Whisper STT, smart cut và xuất phụ đề" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setActiveSection("pipeline"),
            className: `btn ${activeSection === "pipeline" ? "btn-p" : "btn-gh"} text-xs flex items-center gap-1.5`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 14 }),
              "Pipeline"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setActiveSection("library"),
            className: `btn ${activeSection === "library" ? "btn-p" : "btn-gh"} text-xs flex items-center gap-1.5`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Library, { size: 14 }),
              "Thư Viện (",
              MOCK_LIBRARY.length,
              ")"
            ]
          }
        )
      ] })
    ] }),
    activeSection === "pipeline" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", style: { gridTemplateColumns: "1fr 300px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: !selectedFile ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          UploadZone,
          {
            onFileSelect: handleFileSelect,
            isDragging,
            setIsDragging
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(File, { size: 16, className: "text-gold" }),
              "File Đã Chọn"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleReset,
                className: "text-txt-3 hover:text-rose-400 transition-all",
                title: "Xóa và chọn file mới",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 rounded-card bg-glass-bg border border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-card bg-bg-4 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 24, className: "text-emerald" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium truncate", children: selectedFile.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-1 text-xxs text-txt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  (selectedFile.size / (1024 * 1024)).toFixed(1),
                  " MB"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: selectedFile.type })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 20, className: "text-emerald shrink-0" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-4", children: [
            !isProcessing && !processingComplete && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: simulateProcessing,
                className: "btn btn-p flex-1 flex items-center justify-center gap-2",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 16 }),
                  "Bắt Đầu Xử Lý"
                ]
              }
            ),
            isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: true, className: "btn btn-p flex-1 flex items-center justify-center gap-2 opacity-60", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 16, className: "animate-spin" }),
              "Đang Xử Lý..."
            ] }),
            processingComplete && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-g flex-1 flex items-center justify-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 16 }),
                "Hoàn Thành"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: handleReset,
                  className: "btn btn-o flex items-center gap-2",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 16 }),
                    "Xử Lý Mới"
                  ]
                }
              )
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PipelineProgress, { steps: pipelineSteps })
      ] }),
      processingComplete && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { size: 20, className: "text-gold mx-auto mb-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-heading font-bold text-txt", children: MOCK_TRANSCRIPT.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Đoạn Transcript" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 20, className: "text-purple mx-auto mb-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-heading font-bold text-txt", children: MOCK_TRANSCRIPT.filter((s) => s.sentiment === "positive").length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Đoạn Tích Cực" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { size: 20, className: "text-emerald mx-auto mb-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-heading font-bold text-txt", children: MOCK_SMART_CUTS.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Gợi Ý Smart Cut" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 20, className: "text-blue mx-auto mb-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-heading font-bold text-txt", children: MOCK_SUBTITLES.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Dòng Phụ Đề" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TranscriptViewer,
            {
              segments: MOCK_TRANSCRIPT,
              activeSegment,
              onSegmentClick: setActiveSegment
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SmartCutPanel, { suggestions: MOCK_SMART_CUTS })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SubtitleEditor, { subtitles: MOCK_SUBTITLES }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-sm font-semibold text-txt mb-4 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16, className: "text-gold" }),
            "Xuất Kết Quả"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-o flex items-center justify-center gap-2 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: "Transcript TXT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Văn bản thường" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-o flex items-center justify-center gap-2 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 16 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: "Phụ Đề SRT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "SubRip format" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-o flex items-center justify-center gap-2 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 16 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: "Phụ Đề VTT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "WebVTT format" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-g flex items-center justify-center gap-2 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { size: 16 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: "Smart Clips" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "EDL + Markers" })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] }),
    activeSection === "library" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-txt-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: librarySearch,
              onChange: (e) => setLibrarySearch(e.target.value),
              placeholder: "Tìm kiếm video...",
              className: "fi pl-10 w-full"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: pillarFilter,
              onChange: (e) => setPillarFilter(e.target.value),
              className: "text-xs",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "Tất cả trụ cột" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Wealth" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wellness", children: "Wellness" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Integration" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center border border-border rounded-card overflow-hidden", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setViewMode("grid"),
                className: `p-2 transition-all ${viewMode === "grid" ? "bg-glass-bg text-gold" : "text-txt-3 hover:text-txt"}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3x3, { size: 16 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setViewMode("list"),
                className: `p-2 transition-all ${viewMode === "list" ? "bg-glass-bg text-gold" : "text-txt-3 hover:text-txt"}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(List, { size: 16 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setActiveSection("pipeline"),
              className: "btn btn-p text-xs flex items-center gap-1.5",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus, { size: 14 }),
                "Upload Mới"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-card bg-emerald/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 18, className: "text-emerald" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-heading font-bold text-txt", children: MOCK_LIBRARY.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Tổng Video" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-card bg-gold/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 18, className: "text-gold" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-heading font-bold text-txt", children: MOCK_LIBRARY.filter((v) => v.status === "processed").length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Đã Xử Lý" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-card bg-purple/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Captions, { size: 18, className: "text-purple" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-heading font-bold text-txt", children: MOCK_LIBRARY.filter((v) => v.hasSubtitles).length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Có Phụ Đề" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-card bg-blue/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 18, className: "text-blue" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-heading font-bold text-txt", children: "1.59 GB" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Tổng Dung Lượng" })
          ] })
        ] })
      ] }),
      filteredLibrary.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(VideoLibraryGrid, { videos: filteredLibrary, viewMode }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-12 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 48, className: "mx-auto mb-4 text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 mb-1", children: "Không tìm thấy video nào" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" })
      ] })
    ] })
  ] }) });
}

export { VideoReelsPage as default };
