import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Save,
  Copy,
  Check,
  Send,
  CheckCircle,
  CheckCircle2,
  Globe,
  Loader2,
  Clock,
  AlertTriangle,
  Shield,
  Sparkles,
  BookOpen,
  Download,
  Monitor,
  FileDown,
  History,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Share2,
  Upload,
  X,
  ExternalLink,
  Zap,
  Newspaper,
  CalendarPlus,
} from 'lucide-react';
import { Button } from '@gem/ui';
import { Badge } from '@gem/ui';
import { Card } from '@gem/ui';
import { ProgressBar } from '@gem/ui';
import { useToast } from '@gem/ui';
import { useScript, useUpdateScript, useSocialPost, useUpdateSocialPost } from '@gem/hooks/useQueryHooks';
import CCSelect from './CCSelect';

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG = {
  draft: {
    label: 'Bản Nháp',
    variant: 'info',
    next: 'review',
    nextLabel: 'Gửi Duyệt',
    nextIcon: Send,
  },
  review: {
    label: 'Chờ Duyệt',
    variant: 'gold',
    next: 'approved',
    nextLabel: 'Duyệt',
    nextIcon: CheckCircle,
  },
  approved: {
    label: 'Đã Duyệt',
    variant: 'success',
    next: 'published',
    nextLabel: 'Xuất Bản',
    nextIcon: Globe,
  },
  published: {
    label: 'Đã Xuất Bản',
    variant: 'success',
  },
};

// ============================================================================
// Content Type Labels
// ============================================================================

const TRACK_LABELS = {
  wealth: 'Tài Chính (Wealth)',
  wellness: 'Tâm Thức (Wellness)',
  integration: 'Tích Hợp (Integration)',
};

const MODE_LABELS = {
  MODE_1: 'MODE 1 \u2014 Giáo Dục Nhẹ',
  MODE_2: 'MODE 2 \u2014 Cảm Xúc Sâu',
  MODE_3: 'MODE 3 \u2014 Kết Hợp',
};

const PERSONA_LABELS = {
  'career-woman': 'Career Woman 28-35',
  'spiritual-seeker': 'Spiritual Seeker 25-40',
  'young-trader': 'Young Trader 22-30',
  'healing-mom': 'Healing Mom 30-45',
};

// ============================================================================
// GEM Tools (5 placeholders)
// ============================================================================

const DEFAULT_GEM_TOOLS = [
  { key: 'P1', label: 'Thở Thanh Lọc', present: false },
  { key: 'P2', label: 'Template Tần Số', present: false },
  { key: 'P3', label: 'Thiền Dẫn Dắt', present: false },
  { key: 'P4', label: 'Tần Số Tình Yêu', present: false },
  { key: 'P5', label: 'Vision Board', present: false },
];

// ============================================================================
// Helpers
// ============================================================================

function countWords(text) {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function estimateDuration(wordCount) {
  const minutes = Math.round(wordCount / 150);
  if (minutes < 1) return '< 1 phút';
  return `~${minutes} phút`;
}

function computeBrandScore(text) {
  const violations = [];
  let score = 100;

  if (!text) return { score: 0, violations: [] };

  const bannedWords = ['shopify', 'amazon', 'clickbank'];
  for (const word of bannedWords) {
    if (text.toLowerCase().includes(word)) {
      violations.push({
        rule: `Tên sản phẩm bên ngoài: "${word}"`,
        location: 'Nội dung kịch bản',
        severity: 'error',
      });
      score -= 15;
    }
  }

  const viChars = text.match(/[\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ec\u00ed\u1ec9\u0129\u1ecb\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u1ef3\u00fd\u1ef7\u1ef9\u1ef5\u0111]/gi);
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars > 100 && viChars) {
    const ratio = viChars.length / totalChars;
    if (ratio < 0.02) {
      violations.push({
        rule: 'Tỷ lệ dấu tiếng Việt quá thấp',
        location: 'Toàn bộ nội dung',
        severity: 'warning',
      });
      score -= 8;
    }
  }

  const sentences = text.split(/[.!?]+/);
  const englishSentences = sentences.filter((s) => /^[a-zA-Z\s,;:'"()-]+$/.test(s.trim()) && s.trim().length > 20);
  if (englishSentences.length > 0) {
    violations.push({
      rule: `${englishSentences.length} câu tiếng Anh phát hiện`,
      location: 'Nội dung kịch bản',
      severity: 'warning',
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
    section: lower.includes(tool.label.toLowerCase()) ? 'Phát hiện trong nội dung' : undefined,
  }));
}

// ============================================================================
// Markdown Renderer (same as AI Gen page)
// ============================================================================

// --- Strip JSON code fences and try to parse ---
function tryParseJsonContent(text) {
  let str = text.trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');
  }
  try {
    return JSON.parse(str.trim());
  } catch {
    return null;
  }
}

// --- Check if an array is tabular (all items are objects with same keys) ---
function isTabularArray(arr) {
  if (!arr || arr.length < 1) return false;
  if (!arr.every(item => item && typeof item === 'object' && !Array.isArray(item))) return false;
  const keys0 = Object.keys(arr[0]).sort().join(',');
  return arr.every(item => Object.keys(item).sort().join(',') === keys0);
}

// --- Render an array of objects as a styled table ---
function renderTable(arr) {
  if (!arr || arr.length === 0) return null;
  const keys = Object.keys(arr[0]);
  return (
    <div className="overflow-x-auto rounded-card border border-border my-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-glass-bg/50">
            {keys.map(key => (
              <th key={key} className="px-3 py-2.5 text-left text-xs font-bold text-gold uppercase tracking-wider border-b border-border whitespace-nowrap">
                {key.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arr.map((row, i) => (
            <tr key={i} className={`border-b border-border/20 ${i % 2 === 0 ? '' : 'bg-glass-bg/20'} hover:bg-gold/5 transition-colors`}>
              {keys.map(key => {
                const val = row[key];
                const isNum = typeof val === 'number';
                const isStr = typeof val === 'string';
                return (
                  <td key={key} className={`px-3 py-2.5 ${isNum ? 'text-gold font-mono text-right' : 'text-txt-2'} ${isStr && val.length > 200 ? 'max-w-md' : isStr && val.length > 80 ? 'max-w-sm' : ''} min-w-[80px]`}>
                    {typeof val === 'object' ? JSON.stringify(val) : (
                      <span className="whitespace-pre-wrap break-words">{String(val ?? '')}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Render parsed JSON as structured content ---
function renderJsonStructured(obj) {
  const renderValue = (val, depth = 0) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
      if (val.length > 200) {
        return <p className="text-sm text-txt-2 leading-relaxed whitespace-pre-wrap">{val}</p>;
      }
      return <span className="text-sm text-txt-2">{val}</span>;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return <span className="text-sm text-gold font-mono">{String(val)}</span>;
    }
    if (Array.isArray(val)) {
      // Tabular array → render as table
      if (isTabularArray(val)) {
        return renderTable(val);
      }
      return (
        <div className="space-y-3 ml-1">
          {val.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gold shrink-0 text-xs font-bold mt-0.5">{i + 1}.</span>
              <div className="flex-1">{typeof item === 'object' ? renderObject(item, depth + 1) : renderValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    if (typeof val === 'object') {
      return renderObject(val, depth + 1);
    }
    return <span className="text-sm text-txt-3">{JSON.stringify(val)}</span>;
  };

  const renderObject = (obj, depth = 0) => {
    return (
      <div className={`space-y-4 ${depth > 0 ? 'pl-4 border-l-2 border-gold/20 ml-1' : ''}`}>
        {Object.entries(obj).map(([key, val]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const isLongText = typeof val === 'string' && val.length > 100;
          const isArray = Array.isArray(val);
          const isObject = val && typeof val === 'object' && !isArray;

          if (isLongText) {
            return (
              <div key={key} className="space-y-2">
                <h4 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                  {label}
                </h4>
                <p className="text-sm text-txt-2 leading-relaxed whitespace-pre-wrap pl-3.5">{val}</p>
              </div>
            );
          }

          if (isArray || isObject) {
            return (
              <div key={key} className="space-y-2">
                <h4 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                  {label}
                  {isArray && <span className="text-txt-3 font-normal normal-case">({val.length})</span>}
                </h4>
                {renderValue(val, depth)}
              </div>
            );
          }

          return (
            <div key={key} className="flex items-start gap-3 py-1">
              <span className="text-xs font-semibold text-txt-3 uppercase tracking-wider shrink-0 min-w-[120px]">{label}</span>
              <span className="text-xs text-border">|</span>
              {renderValue(val, depth)}
            </div>
          );
        })}
      </div>
    );
  };

  return renderObject(obj);
}

// --- Parse markdown tables ---
function parseMarkdownTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = lines[i].trim().split('|').filter(Boolean).map(c => c.trim());
    rows.push(cells);
    i++;
  }
  if (rows.length < 2) return null; // Need at least header + separator
  // Check if second row is separator (dashes)
  const isSep = rows[1].every(c => /^[-:]+$/.test(c));
  if (!isSep) return null;
  return { headers: rows[0], data: rows.slice(2), endIdx: i };
}

function renderMarkdownContent(text) {
  // Check if content is JSON — render as structured card
  const jsonObj = tryParseJsonContent(text);
  if (jsonObj && typeof jsonObj === 'object') {
    return renderJsonStructured(jsonObj);
  }

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  const renderBold = (t) => {
    const parts = t.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-txt font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip code fences
    if (trimmed.startsWith('```')) { i++; continue; }

    // Markdown table detection
    if (trimmed.startsWith('|')) {
      const table = parseMarkdownTable(lines, i);
      if (table) {
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto rounded-card border border-border my-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-glass-bg/50">
                  {table.headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2.5 text-left text-xs font-bold text-gold uppercase tracking-wider border-b border-border whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.data.map((row, ri) => (
                  <tr key={ri} className={`border-b border-border/20 ${ri % 2 === 0 ? '' : 'bg-glass-bg/20'} hover:bg-gold/5 transition-colors`}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2.5 text-txt-2">
                        {renderBold(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = table.endIdx;
        continue;
      }
    }

    // Headings
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-heading font-bold text-gold mt-6 mb-3">
          {line.slice(3)}
        </h2>
      );
      i++; continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-heading font-semibold text-txt mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
      i++; continue;
    }

    // Bullet list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 mb-1.5 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />
          <span className="text-sm text-txt-2 leading-relaxed">{renderBold(trimmed.slice(2))}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line
    if (trimmed === '') {
      elements.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-txt-2 leading-relaxed mb-3">
        {renderBold(line)}
      </p>
    );
    i++;
  }

  return elements;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ScriptDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-gold" /></div>}>
      <ScriptDetailContent />
    </Suspense>
  );
}

function ScriptDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToast = useToast((s) => s.addToast);
  const scriptId = params?.id;
  const isSocialPost = searchParams?.get('source') === 'social_post';

  // --- Data Hooks (switch by source type) ---
  const scriptQuery = useScript(scriptId);
  const postQuery = useSocialPost(scriptId);
  const updateScriptMutation = useUpdateScript();
  const updatePostMutation = useUpdateSocialPost();

  const { data: rawData, isLoading: scriptLoading, error: scriptError } = scriptQuery;
  const { data: postData, isLoading: postLoading, error: postError } = postQuery;

  const script = isSocialPost ? postData : (rawData ?? postData);
  const isLoading = isSocialPost ? postLoading : (scriptLoading || (!rawData && postLoading));
  const error = isSocialPost ? postError : (rawData ? null : (scriptError && postError ? scriptError : null));
  const resolvedIsSocialPost = isSocialPost || (!rawData && !!postData);
  const updateMutation = resolvedIsSocialPost ? updatePostMutation : updateScriptMutation;

  // --- Local State ---
  const [body, setBody] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const autoSaveRef = useRef(null);
  // --- Session / Iterate State ---
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [iterateHistory, setIterateHistory] = useState([]);
  const [iterateInput, setIterateInput] = useState('');
  const [iterating, setIterating] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // --- Image & Publish State (new) ---
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [publishResults, setPublishResults] = useState([]);
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFbPage, setSelectedFbPage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(new Set());
  const fileInputRef = useRef(null);

  // --- News Publish State ---
  const [newsPublishing, setNewsPublishing] = useState(false);
  const [newsPublished, setNewsPublished] = useState(null);
  const [showNewsSchedule, setShowNewsSchedule] = useState(false);
  const [newsScheduleDate, setNewsScheduleDate] = useState('');
  const [newsScheduleTime, setNewsScheduleTime] = useState('08:00');

  // --- Load Facebook Pages ---
  useEffect(() => {
    fetch('/api/social/publish')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pages?.length) {
          setFacebookPages(data.pages);
          setSelectedFbPage(data.pages[0].id);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // --- Initialize body from script data ---
  useEffect(() => {
    if (!isDirty && script) {
      const text = script.body
        ?? script.content
        ?? '';
      if (text) setBody(text);
    }
  }, [script, isDirty]);

  // --- Auto-save every 30 seconds ---
  useEffect(() => {
    if (!isDirty || !scriptId) return;

    autoSaveRef.current = setInterval(async () => {
      try {
        const fieldName = resolvedIsSocialPost ? 'content' : 'body';
        await updateMutation.mutateAsync({
          id: scriptId,
          updates: { [fieldName]: body },
        });
        setIsDirty(false);
      } catch {
        // Silently fail auto-save
      }
    }, 30000);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [isDirty, scriptId, body, updateMutation]);

  // --- Derived Values ---
  const wordCount = useMemo(() => countWords(body), [body]);
  const duration = useMemo(() => estimateDuration(wordCount), [wordCount]);
  const brandAnalysis = useMemo(() => computeBrandScore(body), [body]);
  const gemTools = useMemo(() => detectGemTools(body), [body]);
  const presentToolCount = gemTools.filter((t) => t.present).length;

  // --- Split content / image prompt + strip AI preamble ---
  const imgMarker = '===IMAGE_PROMPT===';
  const mainContent = useMemo(() => {
    let text = body;
    const idx = text.indexOf(imgMarker);
    if (idx !== -1) text = text.slice(0, idx).trim();

    // Strip AI preamble lines (e.g. "I will start by reading...", "Let me...", "Tôi sẽ bắt đầu bằng...")
    const preamblePatterns = [
      /^(I will |I'll |Let me |Now I |First,? I |OK,? |Okay,? |Sure,? |Here is |Here's )/i,
      /^(Tôi sẽ |Để tôi |Bây giờ tôi |Trước tiên |Được rồi |Dưới đây là )/i,
      /^(I need to |I should |I'm going to |Let's |Now let me )/i,
      /^(reading the |start by |begin by |looking at )/i,
    ];
    const lines = text.split('\n');
    let startIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) { startIdx = i + 1; continue; }
      if (preamblePatterns.some(p => p.test(trimmed))) {
        startIdx = i + 1;
        continue;
      }
      break;
    }
    if (startIdx > 0) {
      text = lines.slice(startIdx).join('\n').trim();
    }

    return text;
  }, [body]);

  const derivedImagePrompt = useMemo(() => {
    const idx = body.indexOf(imgMarker);
    return idx !== -1 ? body.slice(idx + imgMarker.length).trim() : '';
  }, [body]);

  const [editableImagePrompt, setEditableImagePrompt] = useState('');
  const [isEditingImagePrompt, setIsEditingImagePrompt] = useState(false);

  // Sync derived -> editable when body changes (and not currently editing)
  useEffect(() => {
    if (!isEditingImagePrompt) {
      setEditableImagePrompt(derivedImagePrompt);
    }
  }, [derivedImagePrompt, isEditingImagePrompt]);

  // The imagePrompt used everywhere
  const imagePrompt = isEditingImagePrompt ? editableImagePrompt : derivedImagePrompt;

  // Save image prompt edits back into body
  const handleSaveImagePrompt = useCallback(() => {
    const idx = body.indexOf(imgMarker);
    if (idx !== -1) {
      const newBody = body.slice(0, idx).trim() + '\n\n' + imgMarker + '\n' + editableImagePrompt;
      setBody(newBody);
      setIsDirty(true);
    }
    setIsEditingImagePrompt(false);
  }, [body, editableImagePrompt, imgMarker]);

  const status = script?.status ?? 'draft';
  const statusConfig = STATUS_CONFIG[status];

  // --- Handlers ---
  const handleBodyChange = useCallback((e) => {
    setBody(e.target.value);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!scriptId) return;
    setIsSaving(true);
    try {
      const fieldName = resolvedIsSocialPost ? 'content' : 'body';
      await updateMutation.mutateAsync({
        id: scriptId,
        updates: { [fieldName]: body },
      });
      setIsDirty(false);
      addToast({ type: 'success', message: 'Đã lưu nội dung.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể lưu nội dung.' });
    }
    setIsSaving(false);
  }, [scriptId, body, updateMutation, resolvedIsSocialPost, addToast]);

  // ═══ Iterate — Sửa script trong cùng session ═══
  const scriptSessionId = script?.session_id || null;

  const handleIterate = useCallback(async (instruction) => {
    if (!instruction?.trim() || !scriptSessionId) return;

    setIterating(true);
    setIterateHistory(prev => [...prev, { role: 'user', text: instruction }]);
    setIterateInput('');

    try {
      const { generationJobService } = await import('../../gem/services/data/generationJobService');
      const result = await generationJobService.create({
        job_type: 'script',
        input_params: {
          action: 'iterate',
          session_id: scriptSessionId,
          instruction,
          content_type: script?.content_type || 'latc',
        },
        content_type: script?.content_type || null,
        created_by: script?.created_by || 'current_user',
        source: 'web_iterate',
      });

      if (result.success) {
        setIterateHistory(prev => [...prev, {
          role: 'ai',
          text: `Đã gửi yêu cầu. Job ID: ${result.data?.id}`,
        }]);
        addToast({ type: 'info', message: 'Đã gửi yêu cầu chỉnh sửa cho AI.' });
      } else {
        setIterateHistory(prev => [...prev, { role: 'ai', text: `Lỗi: ${result.error}` }]);
      }
    } catch (err) {
      setIterateHistory(prev => [...prev, { role: 'ai', text: `Lỗi: ${err.message}` }]);
    } finally {
      setIterating(false);
    }
  }, [scriptSessionId, script, addToast]);

  const handleSubmitFinal = useCallback(async () => {
    if (!scriptSessionId || !script?.draft_body) return;

    try {
      const { generationJobService } = await import('../../gem/services/data/generationJobService');
      await generationJobService.createSubmitFinal(
        scriptSessionId,
        script.draft_body,
        body,
        feedbackNotes,
        script?.created_by || 'current_user',
      );
      addToast({ type: 'success', title: 'Đã gửi feedback', message: 'AI sẽ học từ bản final cho lần tạo sau.' });
      setFeedbackNotes('');
    } catch (err) {
      addToast({ type: 'error', message: `Lỗi gửi feedback: ${err.message}` });
    }
  }, [scriptSessionId, script, body, feedbackNotes, addToast]);

  const ITERATE_SHORTCUTS = [
    { label: 'Sửa Hook', cmd: 'Sửa phần Hook cho mạnh hơn, emotional hơn.' },
    { label: 'Thêm VD', cmd: 'Thêm ví dụ đời sống vào phần thiếu ví dụ nhất.' },
    { label: 'Mềm CTA', cmd: 'Làm mềm CTA cuối theo MODE 1.' },
    { label: 'Kiểm tra', cmd: 'Kiểm tra 10 quy tắc vàng. Liệt kê vi phạm.' },
    { label: 'Tạo Tiêu Đề', cmd: 'Tạo 4 tiêu đề cho kịch bản này.' },
  ];

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (!scriptId) return;
      try {
        await updateMutation.mutateAsync({
          id: scriptId,
          updates: { status: newStatus },
        });
        addToast({
          type: 'success',
          message: `Trạng thái chuyển sang: ${STATUS_CONFIG[newStatus].label}`,
        });
      } catch {
        addToast({ type: 'error', message: 'Không thể thay đổi trạng thái.' });
      }
    },
    [scriptId, updateMutation, addToast],
  );

  const handleCopyBody = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mainContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: 'success', message: 'Đã sao chép nội dung.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    }
  }, [mainContent, addToast]);

  const DEFAULT_DESIGN_SYSTEM = `\n\nDESIGN SYSTEM:\nNavy đậm #112250\nGold #FFBD59\nAccent: Purple #6A5BFF\nBurgundy #9C0612\nPink #FF6B9D\nText: White #FFFFFF\nFooter: "gemral.com" centered`;

  const handleCopyImagePrompt = useCallback(async () => {
    try {
      const fullPrompt = imagePrompt + DEFAULT_DESIGN_SYSTEM;
      await navigator.clipboard.writeText(fullPrompt);
      addToast({ type: 'success', message: 'Đã sao chép prompt + design system.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    }
  }, [imagePrompt, addToast]);

  const handleExportPDF = useCallback(() => {
    addToast({ type: 'info', message: 'Tính năng xuất PDF sẽ được cập nhật.' });
    setShowExportMenu(false);
  }, [addToast]);

  const handleExportDocx = useCallback(() => {
    addToast({ type: 'info', message: 'Tính năng xuất DOCX sẽ được cập nhật.' });
    setShowExportMenu(false);
  }, [addToast]);

  const handleExportTeleprompter = useCallback(() => {
    const teleText = mainContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard.writeText(teleText).then(() => {
      addToast({ type: 'success', message: 'Đã sao chép định dạng Teleprompter.' });
    }).catch(() => {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    });
    setShowExportMenu(false);
  }, [mainContent, addToast]);

  // --- Image upload handlers ---
  const handleImageFiles = useCallback(async (files) => {
    const newImages = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10 - uploadedImages.length);
    if (newImages.length === 0) return;

    const previews = newImages.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setUploadedImages(prev => [...prev, ...previews]);
  }, [uploadedImages.length]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleImageFiles(e.dataTransfer.files);
    }
  }, [handleImageFiles]);

  const removeImage = useCallback((index) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      if (updated[index]) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // --- Publish handler ---
  const handlePublish = useCallback(async (platform) => {
    if (!mainContent) return;
    setPublishing(platform);

    try {
      let imageUrls = [];

      if (uploadedImages.length > 0) {
        setUploading(true);
        const formData = new FormData();
        uploadedImages.forEach(img => formData.append('files', img.file));

        const uploadRes = await fetch('/api/social/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error);
        imageUrls = uploadData.urls;
        setUploading(false);

        setUploadedImages(prev => prev.map((img, i) => ({
          ...img,
          url: imageUrls[i] || img.url,
        })));
      }

      const publishBody = {
        platform: platform.toLowerCase(),
        content: mainContent,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };
      if (platform === 'Facebook' && selectedFbPage) {
        publishBody.facebookPageId = selectedFbPage;
      }
      const publishRes = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishBody),
      });
      const publishData = await publishRes.json();
      if (!publishData.success) throw new Error(publishData.error);

      setPublishResults(prev => [...prev, { platform, url: publishData.postUrl }]);
      addToast({
        type: 'success',
        title: `Đã đăng lên ${platform}!`,
        message: publishData.message,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đăng bài';
      addToast({ type: 'error', title: `Lỗi ${platform}`, message: msg });
    } finally {
      setPublishing(null);
      setUploading(false);
    }
  }, [mainContent, uploadedImages, addToast, selectedFbPage]);

  // --- Feedback handler ---
  const handleFeedback = useCallback(async (
    type,
    rule,
    suggestion,
  ) => {
    const key = `${type}:${rule}`;
    if (feedbackSent.has(key)) return;
    setFeedbackSending(key);
    try {
      const res = await fetch('/api/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, rule, suggestion }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSent(prev => new Set(prev).add(key));
        addToast({ type: 'success', title: 'Đã ghi nhận', message: 'Hệ thống sẽ cải thiện từ lần tạo tiếp theo.' });
      } else {
        addToast({ type: 'error', message: data.error ?? 'Không thể gửi feedback.' });
      }
    } catch {
      addToast({ type: 'error', message: 'Không thể gửi feedback.' });
    } finally {
      setFeedbackSending(null);
    }
  }, [feedbackSent, addToast]);

  // --- News Publish Handler ---
  const handlePublishNews = useCallback(async (pubStatus) => {
    if (!mainContent) return;
    setNewsPublishing(true);

    try {
      const { getSupabase } = await import('@gem/services/api/supabase');
      const supabase = getSupabase();

      let articleContent = mainContent;

      // Upload images to CC Supabase Storage (public bucket)
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        const { getSupabase: getCCSupabase } = await import('@gem/services/api/supabase');
        const ccSupa = getCCSupabase();
        for (const img of uploadedImages) {
          if (!img.file) continue;
          const ext = img.file.name.split('.').pop() || 'jpg';
          const filePath = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await ccSupa.storage
            .from('social-media-images')
            .upload(filePath, img.file, { contentType: img.file.type, upsert: false });
          if (uploadErr) {
            console.warn('[CCScriptDetail] Image upload failed:', uploadErr);
            continue;
          }
          const { data: urlData } = ccSupa.storage.from('social-media-images').getPublicUrl(filePath);
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
        }
        if (imageUrls.length > 0) {
          setUploadedImages(prev => prev.map((img, i) => ({
            ...img,
            url: imageUrls[i] || img.url,
          })));
        }
      }
      const coverImageUrl = imageUrls[0] || uploadedImages[0]?.url || undefined;

      const title = script?.title || mainContent.split('\n')[0]?.replace(/^#+\s*/, '') || 'Bài Viết Không Tên';
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 100)
        + '-' + Date.now().toString(36);

      const metaDesc = articleContent.replace(/[#*\n]/g, ' ').trim().slice(0, 155);
      const wc = articleContent.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wc / 200));

      const { data: article, error: insertErr } = await supabase
        .from('cc_news_articles')
        .insert({
          title,
          slug,
          meta_description: metaDesc,
          content: articleContent,
          excerpt: articleContent.replace(/[#*\n]/g, ' ').trim().slice(0, 200) + '...',
          category: 'crypto_market',
          tags: [],
          cover_image_url: coverImageUrl,
          author: 'Gemral Editorial',
          status: pubStatus,
          published_at: pubStatus === 'published' ? new Date().toISOString() : null,
          reading_time_minutes: readingTime,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Cross-post to Gemral forum_posts
      let forumPostId = null;
      if (pubStatus === 'published') {
        try {
          const { supabase: gemralSupabase } = await import('../../lib/supabaseClient');
          const { data: { user } } = await gemralSupabase.auth.getUser();
          if (user) {
            const { data: forumPost } = await gemralSupabase.from('forum_posts').insert({
              user_id: user.id,
              title,
              content: articleContent,
              image_url: coverImageUrl || null,
              media_urls: imageUrls.length > 0 ? imageUrls : (coverImageUrl ? [coverImageUrl] : []),
              status: 'published',
              category_id: null,
              post_type: 'news',
              feed_type: 'news',
              topic: 'tin-tuc',
              likes_count: 0,
              comments_count: 0,
              views_count: 0,
            }).select('id').single();
            forumPostId = forumPost?.id;
          }
        } catch (crossPostErr) {
          console.warn('[CCScriptDetail] Cross-post to forum failed:', crossPostErr);
        }
      }

      setNewsPublished({
        id: article?.id ?? `local-${Date.now()}`,
        slug: article?.slug ?? slug,
        publishUrl: forumPostId
          ? `https://gemral.com/forum/thread/${forumPostId}`
          : `https://gemral.com/forum`,
      });
      addToast({
        type: 'success',
        title: pubStatus === 'published' ? 'Đã xuất bản tin tức!' : 'Đã lưu nháp!',
        message: `Bài "${title}" đã được ${pubStatus === 'published' ? 'xuất bản' : 'lưu nháp'} thành công.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đăng tin tức';
      addToast({ type: 'error', title: 'Lỗi đăng tin', message: msg });
    } finally {
      setNewsPublishing(false);
    }
  }, [mainContent, script, uploadedImages, addToast]);

  // --- Textarea dynamic height ---
  const textareaMinHeight = useMemo(() => {
    const lineCount = body.split('\n').length;
    return Math.max(400, lineCount * 22 + 40);
  }, [body]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gold" />
        <span className="ml-3 text-sm text-txt-2">Đang tải kịch bản...</span>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/scripts')}
          className="flex items-center gap-2 text-sm text-txt-2 hover:text-txt transition-button"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <Card variant="glass" padding="lg">
          <div className="text-center py-8">
            <AlertTriangle size={40} className="mx-auto mb-3 text-danger" />
            <p className="text-sm text-danger mb-2">Không thể tải kịch bản</p>
            <p className="text-xxs text-txt-3">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              Quay Lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scriptRec = script;
  const rawTitle = resolvedIsSocialPost
    ? (scriptRec?.metadata?.title
      ?? scriptRec?.content?.slice(0, 60)
      ?? 'Bài Đăng Không Tên')
    : (scriptRec?.title ?? 'Kịch Bản Không Tên');
  // Clean title: strip code fences, JSON artifacts, quotes
  const scriptTitle = rawTitle
    .replace(/^```\w*\s*/, '')
    .replace(/```\s*$/, '')
    .replace(/^\{?\s*"?\s*/, '')
    .replace(/\s*"?\s*\}?$/, '')
    .trim() || 'Kịch Bản Không Tên';
  const contentType = resolvedIsSocialPost ? 'social_post' : (scriptRec?.content_type ?? 'LATC');
  const track = scriptRec?.track ?? '';
  const personaKey = scriptRec?.persona ?? '';
  const writingMode = scriptRec?.writing_mode ?? '';
  const parentScriptId = scriptRec?.parent_script_id;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-txt-2 hover:text-txt transition-button shrink-0"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <div className="h-5 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-gold shrink-0" />
            <h1 className="font-heading text-lg font-semibold text-txt truncate">
              {scriptTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xxs text-amber flex items-center gap-1">
              <Clock size={12} />
              Chưa lưu
            </span>
          )}
          <Badge
            text={statusConfig.label}
            variant={statusConfig.variant}
            size="md"
            dot
          />
        </div>
      </div>

      {/* ===== Metadata Bar ===== */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-txt-3">
        <Badge
          text={contentType}
          variant={contentType === 'LATC' ? 'gold' : contentType === 'TMT' ? 'key' : 'default'}
          size="sm"
        />
        {track && <span>{TRACK_LABELS[track] ?? track}</span>}
        {personaKey && <span>{PERSONA_LABELS[personaKey] ?? personaKey}</span>}
        {writingMode && <span>{MODE_LABELS[writingMode] ?? writingMode}</span>}
        <span className="text-txt-3">|</span>
        <span>{wordCount.toLocaleString('vi-VN')} từ</span>
        <span>{duration}</span>
      </div>

      {/* ===== Content Card (full width) ===== */}
      <Card variant="glass" padding="none">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className={`px-3 py-1.5 rounded-card text-xs font-medium transition-all ${!isEditing ? 'bg-gold/10 text-gold border border-gold/30' : 'text-txt-3 hover:text-txt'}`}
            >
              <Eye size={14} className="inline mr-1.5" />
              Xem Trước
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className={`px-3 py-1.5 rounded-card text-xs font-medium transition-all ${isEditing ? 'bg-gold/10 text-gold border border-gold/30' : 'text-txt-3 hover:text-txt'}`}
            >
              <Edit3 size={14} className="inline mr-1.5" />
              Chỉnh Sửa
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopyBody}
            >
              {copied ? 'Đã chép' : 'Sao chép'}
            </Button>

            {/* Export dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                icon={Download}
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                Xuất
                {showExportMenu ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 p-1 rounded-card bg-glass-bg border border-border space-y-0.5 z-10 min-w-[140px]">
                  <button onClick={handleExportPDF} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all">
                    <FileDown size={14} /> Xuất PDF
                  </button>
                  <button onClick={handleExportDocx} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all">
                    <FileText size={14} /> Xuất DOCX
                  </button>
                  <button onClick={handleExportTeleprompter} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-txt-2 hover:text-txt hover:bg-bg-4 rounded-badge transition-all">
                    <Monitor size={14} /> Teleprompter
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="gold"
              size="sm"
              icon={Save}
              loading={isSaving}
              onClick={handleSave}
              disabled={!isDirty}
            >
              Lưu
            </Button>

            {/* Status action */}
            {status !== 'published' && statusConfig.next && statusConfig.nextIcon && (
              <Button
                variant="outline"
                size="sm"
                icon={statusConfig.nextIcon}
                onClick={() => handleStatusChange(statusConfig.next)}
                loading={updateMutation.isPending}
              >
                {statusConfig.nextLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {isEditing ? (
          <textarea
            value={body}
            onChange={handleBodyChange}
            style={{ minHeight: `${textareaMinHeight}px` }}
            className="w-full p-5 bg-transparent text-sm text-txt font-body leading-relaxed resize-y focus:outline-none placeholder:text-txt-3"
            placeholder="Bắt đầu viết kịch bản tại đây..."
            spellCheck={false}
          />
        ) : (
          <div className="p-5">
            {renderMarkdownContent(mainContent)}
          </div>
        )}
      </Card>

      {/* ===== Brand Voice + GEM Tools (2 columns) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brand Voice Card */}
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-purple" />
            <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider">
              Giọng Thương Hiệu
            </h3>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-bg-4"
                  fill="none"
                  strokeWidth="3"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    brandAnalysis.score >= 80
                      ? 'stroke-emerald'
                      : brandAnalysis.score >= 60
                        ? 'stroke-amber'
                        : 'stroke-danger'
                  }
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${brandAnalysis.score}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-txt">{brandAnalysis.score}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-txt">{brandAnalysis.score}/100</p>
              <p className="text-xxs text-txt-3">
                {brandAnalysis.score >= 80
                  ? 'Tốt'
                  : brandAnalysis.score >= 60
                    ? 'Cần cải thiện'
                    : 'Cần sửa ngay'}
              </p>
            </div>
          </div>

          {brandAnalysis.violations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xxs text-amber flex items-center gap-1">
                <AlertTriangle size={12} />
                {brandAnalysis.violations.length} vi phạm
              </p>
              {brandAnalysis.violations.map((v, i) => {
                const fbKey = `brand_violation:${v.rule}`;
                const isSent = feedbackSent.has(fbKey);
                const isSending = feedbackSending === fbKey;
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-card text-xxs ${v.severity === 'error'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-amber/10 text-amber'
                    }`}
                  >
                    <p className="font-medium">{v.rule}</p>
                    <p className="opacity-70">{v.location}</p>
                    <button
                      disabled={isSent || isSending}
                      onClick={() => handleFeedback(
                        'brand_violation',
                        v.rule,
                        `TUYỆT ĐỐI KHÔNG sử dụng hoặc tạo nội dung vi phạm: "${v.rule}". Quy tắc này áp dụng cho TẤT CẢ loại nội dung.`,
                      )}
                      className={`mt-1.5 flex items-center gap-1 px-2 py-1 rounded-badge text-xxs font-medium transition-all ${isSent
                        ? 'bg-success/10 text-success cursor-default'
                        : 'bg-glass-bg text-txt-2 hover:bg-gold/10 hover:text-gold border border-border hover:border-gold/30'
                      }`}
                    >
                      {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <Check size={10} /> : <Zap size={10} />}
                      {isSent ? 'Đã cập nhật knowledge' : 'Gửi sửa lỗi vào knowledge'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {brandAnalysis.score < 80 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                disabled={feedbackSent.has('brand_violation:Điểm brand voice thấp') || feedbackSending === 'brand_violation:Điểm brand voice thấp'}
                onClick={() => handleFeedback(
                  'brand_violation',
                  'Điểm brand voice thấp',
                  'Cần tăng cường giọng thương hiệu Jennie: dùng nhiều tiếng Việt có dấu hơn, tránh câu tiếng Anh dài, giữ tone ấm áp và tự nhiên.',
                )}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has('brand_violation:Điểm brand voice thấp')
                  ? 'bg-success/10 text-success'
                  : 'bg-purple/10 text-purple hover:bg-purple/20 border border-purple/20'
                }`}
              >
                {feedbackSending === 'brand_violation:Điểm brand voice thấp' ? <Loader2 size={12} className="animate-spin" /> : feedbackSent.has('brand_violation:Điểm brand voice thấp') ? <Check size={12} /> : <BookOpen size={12} />}
                {feedbackSent.has('brand_violation:Điểm brand voice thấp') ? 'Đã ghi nhận' : 'Cải thiện giọng thương hiệu cho lần sau'}
              </button>
            </div>
          )}
        </Card>

        {/* GEM Tools Card */}
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-gold" />
            <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider">
              GEM Tools
            </h3>
            <Badge
              text={`${presentToolCount}/5`}
              variant={presentToolCount >= 4 ? 'success' : presentToolCount >= 2 ? 'gold' : 'danger'}
              size="sm"
            />
          </div>

          <ProgressBar
            value={(presentToolCount / 5) * 100}
            color={presentToolCount >= 4 ? 'emerald' : presentToolCount >= 2 ? 'gold' : 'danger'}
            size="sm"
            className="mb-3"
          />

          <div className="space-y-2">
            {gemTools.map((tool) => {
              const fbKey = `gem_tool_missing:${tool.key}`;
              const isSent = feedbackSent.has(fbKey);
              const isSending = feedbackSending === fbKey;
              return (
                <div key={tool.key} className="flex items-center gap-2">
                  {tool.present ? (
                    <CheckCircle size={14} className="text-emerald shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-txt-3 shrink-0" />
                  )}
                  <span className="text-xs text-txt-2 flex-1">
                    <span className="font-mono text-txt-3 mr-1">{tool.key}:</span>
                    {tool.label}
                  </span>
                  {!tool.present && (
                    <button
                      disabled={isSent || isSending}
                      onClick={() => handleFeedback(
                        'gem_tool_missing',
                        `Thiếu GEM Tool: ${tool.label} (${tool.key})`,
                        `BẮT BUỘC tích hợp GEM Tool "${tool.label}" vào nội dung một cách tự nhiên.`,
                      )}
                      className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-badge text-xxs font-medium transition-all ${isSent
                        ? 'text-success'
                        : 'text-danger hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <Check size={10} /> : <Zap size={10} />}
                      {isSent ? 'Đã ghi' : 'Sửa'}
                    </button>
                  )}
                  {tool.present && (
                    <CheckCircle size={10} className="text-emerald shrink-0 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>

          {presentToolCount < 5 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                disabled={feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools')}
                onClick={() => handleFeedback(
                  'gem_tool_missing',
                  'Thiếu nhiều GEM Tools',
                  `BẮT BUỘC tích hợp ĐẦY ĐỦ 5 GEM Tools vào MỌI kịch bản: Thở Thanh Lọc, Template Tần Số, Thiền Dẫn Dắt, Tần Số Tình Yêu, Vision Board.`,
                )}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools')
                  ? 'bg-success/10 text-success'
                  : 'bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20'
                }`}
              >
                {feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools') ? <Check size={12} /> : <Sparkles size={12} />}
                {feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools') ? 'Đã ghi nhận' : 'Enforce tất cả GEM Tools cho lần sau'}
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* ===== Image Prompt (tách riêng, editable) ===== */}
      {(imagePrompt || derivedImagePrompt) && (
        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} />
              Prompt Tạo Hình Ảnh Minh Họa
            </h4>
            <div className="flex items-center gap-2">
              {isEditingImagePrompt ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditingImagePrompt(false); setEditableImagePrompt(derivedImagePrompt); }}>
                    Hủy
                  </Button>
                  <Button variant="gold" size="sm" icon={Save} onClick={handleSaveImagePrompt}>
                    Lưu Prompt
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" icon={Edit3} onClick={() => setIsEditingImagePrompt(true)}>
                    Sửa
                  </Button>
                  <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyImagePrompt}>
                    Sao Chép Tất Cả
                  </Button>
                </>
              )}
            </div>
          </div>
          {isEditingImagePrompt ? (
            <textarea
              value={editableImagePrompt}
              onChange={(e) => setEditableImagePrompt(e.target.value)}
              className="w-full min-h-[120px] text-xs text-txt-2 leading-relaxed bg-glass-bg rounded-card p-3 resize-y focus:outline-none focus:ring-1 focus:ring-purple/50 border border-purple/30 placeholder:text-txt-3"
              placeholder="Chỉnh sửa image prompt..."
              spellCheck={false}
            />
          ) : (
            <div className="text-xs text-txt-2 leading-relaxed whitespace-pre-wrap bg-glass-bg rounded-card p-3 border border-purple/20">
              {imagePrompt}
            </div>
          )}
          <div className="mt-3 p-3 rounded-card bg-glass-bg border border-gold/20">
            <p className="text-xxs font-semibold text-gold uppercase tracking-wider mb-2">Design System Mặc Định (tự động ghép khi sao chép)</p>
            <p className="text-xxs text-txt-3 leading-relaxed whitespace-pre-wrap font-mono">DESIGN SYSTEM:{'\n'}Navy đậm #112250{'\n'}Gold #FFBD59{'\n'}Accent: Purple #6A5BFF{'\n'}Burgundy #9C0612{'\n'}Pink #FF6B9D{'\n'}Text: White #FFFFFF{'\n'}Footer: &quot;gemral.com&quot; centered</p>
          </div>
        </Card>
      )}

      {/* ===== Image Upload Zone ===== */}
      <Card variant="glass" padding="md">
        <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <ImageIcon size={14} />
          Hình Ảnh Đính Kèm
        </h4>

        <div
          className={`relative border-2 border-dashed rounded-card p-4 transition-all cursor-pointer ${isDragging ? 'border-gold bg-gold/10' : 'border-border hover:border-gold/30'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload size={24} className={isDragging ? 'text-gold' : 'text-txt-3'} />
            <p className="text-xs text-txt-3">
              <span className="text-gold font-medium">Kéo thả hình ảnh</span> hoặc bấm để chọn
            </p>
            <p className="text-xxs text-txt-3">JPEG, PNG, WebP, GIF &bull; Tối đa 10 ảnh &bull; 10MB/ảnh</p>
          </div>
        </div>

        {/* Image Preview Grid */}
        {uploadedImages.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xxs text-txt-3 font-medium">{uploadedImages.length} hình ảnh đính kèm</p>
            <div className={`grid gap-2 ${uploadedImages.length === 1 ? 'grid-cols-1' :
              uploadedImages.length === 2 ? 'grid-cols-2' :
                uploadedImages.length === 3 ? 'grid-cols-3' :
                  uploadedImages.length === 4 ? 'grid-cols-2' :
                    'grid-cols-3'
            }`}>
              {uploadedImages.map((img, i) => (
                <div
                  key={i}
                  className={`relative group rounded-lg overflow-hidden border border-border bg-glass-bg ${uploadedImages.length === 1 ? '' : 'aspect-square'}`}
                >
                  <img
                    src={img.preview}
                    alt={`Preview ${i + 1}`}
                    className={uploadedImages.length === 1 ? 'w-full h-auto max-h-[600px] object-contain' : 'w-full h-full object-cover'}
                  />
                  <button
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  >
                    <X size={12} />
                  </button>
                  {img.url && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-success/80 text-white text-xxs">
                      Đã tải lên
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ===== Publish Section ===== */}
      <Card variant="glass" padding="md">
        <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Share2 size={14} />
          Đăng Lên Mạng Xã Hội
        </h4>

        {/* Publish Results */}
        {publishResults.length > 0 && (
          <div className="space-y-1 mb-3">
            {publishResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-xs text-success font-medium">Đã đăng lên {r.platform}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold flex items-center gap-1 ml-auto">
                  Xem bài <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Facebook Page Selector */}
        {facebookPages.length > 1 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-txt-3">Facebook Page:</span>
            <CCSelect
              value={selectedFbPage}
              onChange={(e) => setSelectedFbPage(e.target.value)}
              className="text-xs py-1 px-2"
            >
              {facebookPages.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </CCSelect>
          </div>
        )}

        {/* Publish Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Facebook', color: 'hover:bg-blue-500/10 hover:border-blue-400/40 hover:text-blue-400' },
            { name: 'Instagram', color: 'hover:bg-pink-500/10 hover:border-pink-400/40 hover:text-pink-400' },
            { name: 'Threads', color: 'hover:bg-gray-400/10 hover:border-gray-300/40 hover:text-gray-300' },
          ].map(({ name, color }) => {
            const alreadyPublished = publishResults.some(r => r.platform === name);
            const isPublishing = publishing === name;
            return (
              <button
                key={name}
                disabled={isPublishing || !!publishing || alreadyPublished}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-card border text-xs font-medium transition-all ${alreadyPublished
                  ? 'border-success/30 text-success bg-success/5 cursor-default'
                  : `border-border bg-glass-bg text-txt-3 ${color}`
                } disabled:opacity-50`}
                onClick={() => handlePublish(name)}
              >
                {isPublishing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : alreadyPublished ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Send size={12} />
                )}
                {isPublishing
                  ? (uploading ? 'Đang upload ảnh...' : 'Đang đăng...')
                  : alreadyPublished
                    ? 'Đã đăng'
                    : `Đăng ${name}`
                }
              </button>
            );
          })}
        </div>
      </Card>

      {/* ===== News Publish Section ===== */}
      <Card variant="glass" padding="md">
        <h4 className="text-xs font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Newspaper size={14} />
          Đăng Lên Mục Tin Tức
        </h4>

        {/* Published result */}
        {newsPublished && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-card bg-success/10 border border-success/20">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-success font-medium">Đã đăng tin tức thành công!</p>
                <p className="text-xxs text-success/70">ID: {newsPublished.id}</p>
              </div>
              {newsPublished.publishUrl ? (
                <a
                  href={newsPublished.publishUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  <Globe size={10} />
                  Xem bài trên Gemral
                  <ExternalLink size={10} />
                </a>
              ) : (
                <span className="text-xxs text-txt-3">Đã lưu nháp</span>
              )}
            </div>
            <button
              onClick={() => setNewsPublished(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-glass-bg text-cyan hover:bg-cyan/10 text-xs font-medium transition-all"
            >
              <Newspaper size={12} />
              Đăng Lại
            </button>
          </div>
        )}

        {/* Publish & Schedule buttons */}
        {!newsPublished && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                disabled={newsPublishing}
                onClick={() => handlePublishNews('draft')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-border bg-glass-bg text-txt-3 hover:bg-amber/10 hover:border-amber/40 hover:text-amber text-xs font-medium transition-all disabled:opacity-50"
              >
                {newsPublishing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                Lưu Nháp
              </button>
              <button
                disabled={newsPublishing}
                onClick={() => handlePublishNews('published')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 text-xs font-medium transition-all disabled:opacity-50"
              >
                {newsPublishing ? <Loader2 size={12} className="animate-spin" /> : <Newspaper size={12} />}
                Xuất Bản Ngay
              </button>
              <button
                onClick={() => setShowNewsSchedule(!showNewsSchedule)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/5 text-emerald hover:bg-emerald/10 text-xs font-medium transition-all"
              >
                <CalendarPlus size={12} />
                Lên Lịch Đăng
              </button>
            </div>

            {/* Schedule date/time picker */}
            {showNewsSchedule && (
              <div className="p-3 rounded-card border border-emerald/20 bg-emerald/5 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarPlus size={14} className="text-emerald" />
                  <span className="text-xs font-semibold text-emerald">Lên Lịch Xuất Bản</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xxs text-txt-3 block mb-1">Ngày đăng *</label>
                    <input
                      type="date"
                      value={newsScheduleDate}
                      onChange={(e) => setNewsScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="fi text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xxs text-txt-3 block mb-1">Giờ đăng</label>
                    <input
                      type="time"
                      value={newsScheduleTime}
                      onChange={(e) => setNewsScheduleTime(e.target.value)}
                      className="fi text-xs w-full"
                    />
                  </div>
                </div>
                <button
                  disabled={newsPublishing || !newsScheduleDate}
                  onClick={async () => {
                    await handlePublishNews('draft');
                    setShowNewsSchedule(false);
                    addToast({
                      type: 'success',
                      title: 'Đã lên lịch!',
                      message: `Bài viết sẽ được xuất bản vào ${newsScheduleDate} lúc ${newsScheduleTime}.`,
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/10 text-emerald hover:bg-emerald/20 text-xs font-medium transition-all w-full justify-center disabled:opacity-50"
                >
                  <CalendarPlus size={12} />
                  Xác Nhận Lên Lịch
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ===== Version History ===== */}
      {parentScriptId && (
        <Card variant="glass" padding="md">
          <button
            className="w-full flex items-center gap-2 text-left"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History size={16} className="text-blue shrink-0" />
            <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider flex-1">
              Lịch Sử Phiên Bản
            </h3>
            {showVersions ? <ChevronUp size={14} className="text-txt-3" /> : <ChevronDown size={14} className="text-txt-3" />}
          </button>

          {showVersions && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-3 p-2 rounded-card bg-glass-bg">
                <Eye size={14} className="text-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-txt">Phiên bản hiện tại</p>
                  <p className="text-xxs text-txt-3">ID: {scriptId.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/scripts/${parentScriptId}`)}
                className="w-full flex items-center gap-3 p-2 rounded-card bg-glass-bg hover:bg-bg-4 transition-all text-left"
              >
                <BookOpen size={14} className="text-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-txt-2">Bản gốc</p>
                  <p className="text-xxs text-txt-3">ID: {parentScriptId.slice(0, 8)}...</p>
                </div>
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ===== Chat Với AI (Persistent Session) ===== */}
      {scriptSessionId && (
        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} />
              Chat Với AI
            </h4>
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              className="text-xxs text-txt-3 hover:text-txt transition-colors"
            >
              {showChatPanel ? 'Thu gọn' : 'Mở rộng'}
            </button>
          </div>

          {showChatPanel && (
            <>
              {/* Session info */}
              <div className="flex items-center gap-2 mb-2 p-2 rounded-card bg-purple/5 border border-purple/10">
                <span className="text-xxs text-purple">Session: {scriptSessionId}</span>
                {iterateHistory.length > 0 && (
                  <span className="text-xxs text-txt-4 ml-auto">{iterateHistory.filter(m => m.role === 'user').length} lần sửa</span>
                )}
              </div>

              {/* Quick shortcuts */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ITERATE_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    disabled={iterating}
                    onClick={() => handleIterate(s.cmd)}
                    className="h-[22px] px-2 text-[10px] font-semibold rounded bg-[#6A5BFF]/12 text-[#6A5BFF] border-none cursor-pointer hover:bg-[#6A5BFF]/20 transition-colors disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Chat history */}
              {iterateHistory.length > 0 && (
                <div className="max-h-[250px] overflow-y-auto space-y-1.5 mb-2 p-2 rounded-card bg-bg-2">
                  {iterateHistory.map((msg, i) => (
                    <div key={i} className={`text-[11px] ${msg.role === 'user' ? 'text-gold' : 'text-txt-2'}`}>
                      <span className="font-semibold">{msg.role === 'user' ? 'Bạn' : 'AI'}:</span> {msg.text}
                    </div>
                  ))}
                </div>
              )}

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  value={iterateInput}
                  onChange={(e) => setIterateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleIterate(iterateInput)}
                  placeholder="Sửa phần 3, thêm ví dụ..."
                  disabled={iterating}
                  className="flex-1 h-8 px-3 text-[12px] bg-bg-4 border border-border rounded-lg text-white placeholder:text-txt-3 focus:border-purple/40 focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => handleIterate(iterateInput)}
                  disabled={iterating || !iterateInput.trim()}
                  className="h-8 px-3 text-[11px] font-semibold rounded-lg bg-[#6A5BFF]/15 text-[#6A5BFF] border-none cursor-pointer hover:bg-[#6A5BFF]/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {iterating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Gửi
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ===== Lưu Bản Final + Gửi Feedback ===== */}
      {scriptSessionId && script?.draft_body && (
        <Card variant="glass" padding="md">
          <h4 className="text-xs font-semibold text-emerald uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <BookOpen size={14} />
            Gửi Feedback Cho AI
          </h4>
          <p className="text-xxs text-txt-3 mb-2">
            So sánh bản draft AI tạo với bản bạn đã chỉnh sửa. AI sẽ học từ sự khác biệt.
          </p>
          <textarea
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="Ghi chú: CTA quá aggressive, Hook cần emotional hơn..."
            rows={2}
            className="w-full mb-2 p-2 text-[12px] bg-bg-4 border border-border rounded-lg text-white placeholder:text-txt-3 focus:border-emerald/40 focus:outline-none resize-none transition-colors"
          />
          <button
            onClick={handleSubmitFinal}
            className="w-full h-8 text-[12px] font-semibold rounded-lg bg-emerald/15 text-emerald border-none cursor-pointer hover:bg-emerald/25 transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle size={14} />
            Lưu Bản Final + Gửi Feedback
          </button>
        </Card>
      )}

      {/* ===== Status Action (bottom, for review) ===== */}
      {status === 'review' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => handleStatusChange('draft')}
          >
            Trả Về Nháp
          </Button>
        </div>
      )}
    </div>
  );
}
