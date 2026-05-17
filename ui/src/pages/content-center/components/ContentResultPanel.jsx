/**
 * ContentResultPanel — Global result panel cho mọi content type.
 *
 * Tất cả features available luôn (không gate theo content_type):
 *   - View modes: Preview / HTML Source / Split View
 *   - Toolbox sidebar (categories với draggable items)
 *   - Image insert (placeholders + file picker)
 *   - Undo/Redo (postMessage tới iframe)
 *   - Prompt cards (auto-detect từ output)
 *   - Resend send-email (collapsible)
 *   - Stats row (word count / duration / brand score)
 *
 * Replaces EmailResultPanel + scattered conditional UI trong CCAIGen.jsx.
 * Spec: memory/reports/2026-05-17-content-result-panel-global-design.md
 *
 * Props: xem spec §4 (Component API).
 */
import { useState, useRef } from 'react';
import {
  Eye, Code, Smartphone, Layers, Upload, ImageIcon,
  RefreshCw, Mail, FileText, Clock,
} from 'lucide-react';
import { ContentToolbox } from './ContentToolbox';
import { PromptImageCards } from './PromptImageCards';
import { ResendSendSection } from './ResendSendSection';

// ─── Default view mode by content_type ─────────────────────────────
function pickDefaultViewMode(contentType) {
  if (contentType === 'email' || contentType === 'doc_tai_lieu') {
    return { preview: true, source: true }; // Split View
  }
  return { preview: true, source: false }; // Preview only
}

// ─── Stats row inline component ───────────────────────────────────
function StatsRow({ wordCount, duration, brandResult }) {
  if (!wordCount && !duration && !brandResult) return null;
  return (
    <div className="flex items-center gap-6 flex-wrap mb-4">
      {brandResult && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-3">Giọng thương hiệu:</span>
          <span className={`text-lg font-heading font-bold ${brandResult.score >= 80 ? 'text-success' : brandResult.score >= 60 ? 'text-amber' : 'text-danger'}`}>
            {brandResult.score}/100
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${brandResult.passed ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
            {brandResult.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
          </span>
        </div>
      )}
      {wordCount > 0 && (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-txt-3" />
          <span className="text-xs text-txt-3">Số từ:</span>
          <span className="text-sm font-semibold text-txt">{wordCount.toLocaleString('vi-VN')}</span>
        </div>
      )}
      {duration && (
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-txt-3" />
          <span className="text-xs text-txt-3">Thời lượng:</span>
          <span className="text-sm font-semibold text-txt">{duration}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export function ContentResultPanel({
  // Output
  output, onOutputChange, contentType,
  // Preview iframe
  previewSrcDoc, iframeRef, onIframeLoad, canUndo, canRedo,
  // Image insert
  placeholders = [], fileInputRef, onImageUpload, onSetReplacingIdx, onDrop,
  // Toolbox
  toolboxCategories = [], onToolboxInsert,
  // Resend (grouped object — null to disable)
  resend = null,
  // Stats (grouped object — null to disable)
  stats = null,
  // Collapse toolbar+content area only (prompts/resend/stats vẫn visible)
  collapsed = false,
  // Utilities
  addToast,
}) {
  // View mode state — pick default by contentType
  const [view, setView] = useState(() => pickDefaultViewMode(contentType));

  // Toolbox visibility state
  const [showToolbox, setShowToolbox] = useState(false);
  const [toolboxOpenState, setToolboxOpenState] = useState({});

  // Local file input ref fallback
  const localFileInputRef = useRef(null);
  const fileRef = fileInputRef || localFileInputRef;

  const setPreviewOnly = () => setView({ preview: true, source: false });
  const setSourceOnly = () => setView({ preview: false, source: true });
  const setSplit = () => setView({ preview: true, source: true });

  const toggleToolbox = () => setShowToolbox(s => !s);
  const toggleCategory = (id) => setToolboxOpenState(s => ({ ...s, [id]: !s[id] }));

  return (
    <>
      {/* Toolbox sidebar — fixed position, conditional render */}
      <ContentToolbox
        show={showToolbox}
        onClose={() => setShowToolbox(false)}
        categories={toolboxCategories}
        openState={toolboxOpenState}
        onToggleCategory={toggleCategory}
        onInsert={onToolboxInsert}
      />

      <div className="mb-4 space-y-3">
        {/* Toolbar + content area — gate bằng `collapsed` để parent có thể ẩn
            chỉ content preview, prompts/resend/stats vẫn render bên dưới. */}
        {!collapsed && (
        <>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode buttons */}
          <button
            onClick={setPreviewOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${view.preview && !view.source ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={setSourceOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${view.source && !view.preview ? 'bg-purple/20 text-purple border border-purple/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-purple/20'}`}
          >
            <Code size={14} />
            HTML Source
          </button>
          <button
            onClick={setSplit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${view.preview && view.source ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-cyan/20'}`}
          >
            <Smartphone size={14} />
            Split View
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Toolbox toggle */}
          <button
            onClick={toggleToolbox}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showToolbox ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
          >
            <Layers size={14} />
            Toolbox
          </button>

          {/* Add image */}
          <button
            onClick={() => { onSetReplacingIdx?.(null); fileRef?.current?.click(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium bg-glass-bg text-txt-3 border border-border hover:border-emerald/30 hover:text-emerald transition-all"
          >
            <Upload size={14} />
            Thêm Hình Ảnh
          </button>

          {placeholders.length > 0 && (
            <span className="text-xxs text-txt-3 ml-1">
              {placeholders.length} placeholder •
            </span>
          )}

          {placeholders.map((ph, i) => (
            <button
              key={i}
              onClick={() => { onSetReplacingIdx?.(i); fileRef?.current?.click(); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xxs bg-amber/10 text-amber border border-amber/20 hover:bg-amber/20 transition-all"
              title={ph.url}
            >
              <ImageIcon size={10} />
              Thay #{i + 1}
            </button>
          ))}

          {/* Undo / Redo */}
          {(canUndo !== undefined || canRedo !== undefined) && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                disabled={!canUndo}
                onClick={() => iframeRef?.current?.contentWindow?.postMessage({ type: 'email-undo' }, '*')}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Hoàn tác (Ctrl+Z)"
              >
                <RefreshCw size={12} className="scale-x-[-1]" />
                Undo
              </button>
              <button
                disabled={!canRedo}
                onClick={() => iframeRef?.current?.contentWindow?.postMessage({ type: 'email-redo' }, '*')}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Làm lại (Ctrl+Y)"
              >
                <RefreshCw size={12} />
                Redo
              </button>
            </>
          )}
        </div>

        {/* Content area */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDrop}
        >
          {/* HTML Source Editor — show when view.source */}
          {view.source && (
            <div className="rounded-card bg-glass-bg border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <Code size={14} className="text-purple" />
                <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">HTML Source</span>
              </div>
              <textarea
                value={output}
                onChange={(e) => onOutputChange(e.target.value)}
                className="w-full bg-transparent text-xs text-txt-2 leading-relaxed focus:outline-none resize-y p-3 font-mono"
                style={{ minHeight: 'calc(100vh - 360px)' }}
                spellCheck={false}
              />
            </div>
          )}

          {/* HTML Preview iframe — show when view.preview */}
          {view.preview && (
            <div className="rounded-card border border-border overflow-hidden bg-white mt-3">
              <div className="px-3 py-2 border-b border-border bg-glass-bg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gold" />
                  <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">Content Preview</span>
                </div>
                <span className="text-xxs text-txt-3">600px max-width</span>
              </div>
              <div className="flex justify-center bg-[#e8e8ec] p-4">
                <iframe
                  ref={iframeRef}
                  key="content-preview-stable"
                  title="Content Preview"
                  srcDoc={previewSrcDoc}
                  className="border-0 w-full max-w-[620px] bg-white shadow-lg rounded"
                  style={{ minHeight: '800px' }}
                  sandbox="allow-same-origin allow-scripts"
                  onLoad={onIframeLoad}
                />
              </div>
            </div>
          )}
        </div>
        </>
        )}
        {/* End collapsible (toolbar + content area) — stats/prompts/resend below always visible */}

        {/* Hidden file input (fallback if parent didn't provide) */}
        {!fileInputRef && (
          <input
            ref={localFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageUpload}
          />
        )}

        {/* Stats row */}
        {stats && <StatsRow {...stats} />}

        {/* Prompt Image Cards — auto detect, render null nếu < 2 cards */}
        <PromptImageCards output={output} addToast={addToast} />

        {/* Resend send-email section — collapsible, default closed
            (open by default cho email content type) */}
        {resend && (
          <ResendSendSection
            sender={resend.sender}
            subject={resend.subject}
            recipients={resend.recipients}
            bcc={resend.bcc}
            manualHtml={resend.manualHtml}
            sent={resend.sent}
            sending={resend.sending}
            output={output}
            onSenderChange={resend.onSenderChange}
            onSubjectChange={resend.onSubjectChange}
            onRecipientsChange={resend.onRecipientsChange}
            onBccChange={resend.onBccChange}
            onManualHtmlChange={resend.onManualHtmlChange}
            onSend={resend.onSend}
            onScheduleClick={resend.onScheduleClick}
            addToast={addToast}
            defaultOpen={contentType === 'email'}
          />
        )}
      </div>
    </>
  );
}

export default ContentResultPanel;
