/**
 * EmailResultPanel — ⚠️ DEPRECATED 2026-05-17 ⚠️
 *
 * Replaced by ContentResultPanel.jsx — global result panel cho mọi content type.
 * Reason: chỉ render khi `isHtmlPreview = isEmail || isDocTaiLieu`, không
 * available cho social/blog/forum. User yêu cầu 2026-05-17: "Tất cả tính năng
 * available luôn, không phân biệt điều kiện."
 *
 * Migration done in CCAIGen.jsx Task 6 cutover (paperclip commit b199a816).
 * No remaining call sites trong paperclip-ui.
 *
 * KEPT IN REPO cho rollback window. Delete file này sau khi production stable
 * 1-2 weeks post-migration, không có rollback called.
 *
 * Spec: memory/reports/2026-05-17-content-result-panel-global-design.md
 * Plan: memory/reports/2026-05-17-content-result-panel-implementation-plan.md
 *
 * Original props (cho lịch sử):
 *   output              — string: HTML email content
 *   onOutputChange      — (newHtml: string) => void
 *   emailPreviewSrcDoc  — string: injected srcDoc với script editor
 *   emailIframeRef      — React ref cho iframe
 *   canUndo / canRedo   — boolean: để enable/disable undo/redo buttons
 *   emailPlaceholders   — array: placeholder images trong email
 *   emailFileInputRef   — ref cho hidden file input
 *   onIframeLoad        — () => void
 *   onImageUpload       — (e) => void: handle image upload
 *   onSetReplacingIdx   — (idx: number | null) => void
 *   onDrop              — (e) => void: handle drag-drop images
 *   toolboxCategories   — array: EMAIL_TOOLBOX_CATEGORIES constant
 *   showEmailToolbox    — boolean
 *   onToggleToolbox     — () => void
 *   toolboxOpenState    — {[catId]: boolean}
 *   onToggleCategory    — (catId: string) => void
 *   onToolboxInsert     — (item) => void
 */
import { useRef, useState } from 'react';
import {
  Eye, Code, Smartphone, Layers, Upload, ImageIcon,
  RefreshCw, Mail,
} from 'lucide-react';
import { ContentToolbox } from './ContentToolbox';

// Backward-compat alias — code path migrate sang ContentToolbox dần.
// Re-export so existing imports `{ EmailToolbox } from './EmailResultPanel'` keep working.
export { ContentToolbox as EmailToolbox } from './ContentToolbox';

/**
 * EmailResultPanel — main component
 */
export function EmailResultPanel({
  output,
  onOutputChange,
  emailPreviewSrcDoc,
  emailIframeRef,
  canUndo,
  canRedo,
  emailPlaceholders = [],
  emailFileInputRef,
  onIframeLoad,
  onImageUpload,
  onSetReplacingIdx,
  onDrop,
  // Toolbox props
  toolboxCategories = [],
  showEmailToolbox,
  onToggleToolbox,
  toolboxOpenState = {},
  onToggleCategory,
  onToolboxInsert,
}) {
  const localFileInputRef = useRef(null);
  const fileRef = emailFileInputRef || localFileInputRef;

  // View mode state — real useState (previous fake `[true, () => {}]` made
  // Preview/Source/Split toolbar buttons no-op). Default both true = Split
  // View, which matches the historical hardcoded render.
  const [viewPreview, setViewPreview] = useState(true);
  const [viewSource, setViewSource] = useState(true);

  return (
    <>
      {/* Toolbox — fixed position sidebar (use ContentToolbox imported above) */}
      <ContentToolbox
        show={showEmailToolbox}
        onClose={() => onToggleToolbox()}
        categories={toolboxCategories}
        openState={toolboxOpenState}
        onToggleCategory={onToggleCategory}
        onInsert={onToolboxInsert}
      />

      {/* Container */}
      <EmailResultPanelInner
        output={output}
        onOutputChange={onOutputChange}
        emailPreviewSrcDoc={emailPreviewSrcDoc}
        emailIframeRef={emailIframeRef}
        canUndo={canUndo}
        canRedo={canRedo}
        emailPlaceholders={emailPlaceholders}
        fileRef={fileRef}
        onIframeLoad={onIframeLoad}
        onImageUpload={onImageUpload}
        onSetReplacingIdx={onSetReplacingIdx}
        onDrop={onDrop}
        showEmailToolbox={showEmailToolbox}
        onToggleToolbox={onToggleToolbox}
        viewPreview={viewPreview}
        viewSource={viewSource}
        onSetPreview={setViewPreview}
        onSetSource={setViewSource}
      />

      {/* Hidden file input */}
      {!emailFileInputRef && (
        <input
          ref={localFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageUpload}
        />
      )}
    </>
  );
}

/**
 * EmailResultPanelInner — view + source split with toolbar
 */
function EmailResultPanelInner({
  output,
  onOutputChange,
  emailPreviewSrcDoc,
  emailIframeRef,
  canUndo,
  canRedo,
  emailPlaceholders,
  fileRef,
  onIframeLoad,
  onImageUpload,
  onSetReplacingIdx,
  onDrop,
  showEmailToolbox,
  onToggleToolbox,
  viewPreview,
  viewSource,
  onSetPreview,
  onSetSource,
}) {
  return (
    <div className="mb-4 space-y-3">
      {/* Email view toolbar */}
      <EmailViewToolbar
        showPreview={viewPreview}
        showSource={viewSource}
        onSetPreview={onSetPreview}
        onSetSource={onSetSource}
        showEmailToolbox={showEmailToolbox}
        emailPlaceholders={emailPlaceholders}
        canUndo={canUndo}
        canRedo={canRedo}
        fileRef={fileRef}
        onToggleToolbox={onToggleToolbox}
        onSetReplacingIdx={onSetReplacingIdx}
        onImageUpload={onImageUpload}
        emailIframeRef={emailIframeRef}
      />

      {/* Content area */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={onDrop}
      >
        {/* HTML Source Editor — hide khi user chỉ chọn Preview */}
        {viewSource && (
          <div className="rounded-card bg-glass-bg border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Code size={14} className="text-purple" />
              <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">HTML Source</span>
            </div>
            <textarea
              value={output}
              onChange={(e) => onOutputChange(e.target.value)}
              className="w-full bg-transparent text-xs text-txt-2 leading-relaxed focus:outline-none resize-y p-3 font-mono"
              style={{ minHeight: 'calc(100vh - 260px)' }}
              spellCheck={false}
            />
          </div>
        )}

        {/* HTML Preview iframe — hide khi user chỉ chọn Source */}
        {viewPreview && (
        <div className="rounded-card border border-border overflow-hidden bg-white mt-3">
          <div className="px-3 py-2 border-b border-border bg-glass-bg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gold" />
              <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">Email Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!canUndo}
                onClick={() => emailIframeRef?.current?.contentWindow?.postMessage({ type: 'email-undo' }, '*')}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Hoàn tác (Ctrl+Z)"
              >
                <RefreshCw size={12} className="scale-x-[-1]" />
                Undo
              </button>
              <button
                disabled={!canRedo}
                onClick={() => emailIframeRef?.current?.contentWindow?.postMessage({ type: 'email-redo' }, '*')}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Làm lại (Ctrl+Y)"
              >
                <RefreshCw size={12} />
                Redo
              </button>
              <span className="text-xxs text-txt-3">600px max-width</span>
            </div>
          </div>
          <div className="flex justify-center bg-[#e8e8ec] p-4">
            <iframe
              ref={emailIframeRef}
              key="email-preview-stable"
              title="Email Preview"
              srcDoc={emailPreviewSrcDoc}
              className="border-0 w-full max-w-[620px] bg-white shadow-lg rounded"
              style={{ minHeight: '800px' }}
              sandbox="allow-same-origin allow-scripts"
              onLoad={onIframeLoad}
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/**
 * EmailViewToolbar — toolbar with view mode, toolbox toggle, image buttons
 */
export function EmailViewToolbar({
  showEmailToolbox,
  emailPlaceholders = [],
  canUndo,
  canRedo,
  fileRef,
  onToggleToolbox,
  onSetReplacingIdx,
  emailIframeRef,
  // view mode (optional — nếu caller muốn control từ ngoài)
  showPreview,
  showSource,
  onSetPreview,
  onSetSource,
}) {
  const setPreview = onSetPreview || (() => {});
  const setSource = onSetSource || (() => {});

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Preview / Source / Split buttons */}
      <button
        onClick={() => { setPreview(true); setSource(false); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showPreview && !showSource ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
      >
        <Eye size={14} />
        Preview
      </button>
      <button
        onClick={() => { setSource(true); setPreview(false); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showSource && !showPreview ? 'bg-purple/20 text-purple border border-purple/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-purple/20'}`}
      >
        <Code size={14} />
        HTML Source
      </button>
      <button
        onClick={() => { setPreview(true); setSource(true); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showPreview && showSource ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-cyan/20'}`}
      >
        <Smartphone size={14} />
        Split View
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Toolbox toggle */}
      <button
        onClick={onToggleToolbox}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showEmailToolbox ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
      >
        <Layers size={14} />
        Toolbox
      </button>

      {/* Image Management */}
      <button
        onClick={() => { onSetReplacingIdx?.(null); fileRef?.current?.click(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium bg-glass-bg text-txt-3 border border-border hover:border-emerald/30 hover:text-emerald transition-all"
      >
        <Upload size={14} />
        Thêm Hình Ảnh
      </button>

      {emailPlaceholders.length > 0 && (
        <span className="text-xxs text-txt-3">
          {emailPlaceholders.length} placeholder •
        </span>
      )}

      {emailPlaceholders.map((ph, i) => (
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
    </div>
  );
}

export default EmailResultPanel;
