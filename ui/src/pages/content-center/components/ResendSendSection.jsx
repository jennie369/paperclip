/**
 * ResendSendSection — Collapsible "Gửi Email qua Resend" form.
 * Extracted từ CCAIGen.jsx line 6887-7000 cho ContentResultPanel global refactor.
 * Always available (không gate by content_type) — user click header expand.
 *
 * Spec: memory/reports/2026-05-17-content-result-panel-global-design.md
 *
 * Props:
 *   sender           — string: from email
 *   subject          — string: email subject
 *   recipients       — string: comma-separated recipients
 *   bcc              — string: comma-separated bcc
 *   manualHtml       — string: manual HTML body (used when no AI output)
 *   sent             — { id, recipients } | null: send result toast data
 *   sending          — boolean: send in progress
 *   output           — string: AI-generated content (alternative to manualHtml)
 *   onSenderChange   — (str) => void
 *   onSubjectChange  — (str) => void
 *   onRecipientsChange — (str) => void
 *   onBccChange      — (str) => void
 *   onManualHtmlChange — (str) => void
 *   onSend           — () => Promise<void>: trigger Resend API call
 *   addToast         — ({ type, message }) => void: toast helper
 *   defaultOpen      — boolean: initial expanded state (default false)
 */
import { useState } from 'react';
import { Mail, Send, Loader2, Copy, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

export function ResendSendSection({
  sender, subject, recipients, bcc, manualHtml,
  sent, sending, output,
  onSenderChange, onSubjectChange, onRecipientsChange, onBccChange, onManualHtmlChange,
  onSend, addToast,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(output || manualHtml || '');
      addToast?.({ type: 'success', message: 'Đã sao chép HTML email.' });
    } catch {
      addToast?.({ type: 'error', message: 'Không thể sao chép.' });
    }
  };

  return (
    <div className="rounded-card border border-gold/20 bg-gold/5">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gold/10 transition-colors rounded-card"
      >
        <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
          <Mail size={14} />
          Gửi Email qua Resend
        </h4>
        {open
          ? <ChevronDown size={14} className="text-gold" />
          : <ChevronRight size={14} className="text-gold" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gold/10">
          {/* Sender & Subject & Recipients */}
          <div className="space-y-2 pt-4">
            <div>
              <label className="block text-xxs font-medium text-txt-2 mb-1">Gửi từ (Sender) *</label>
              <select
                value={sender}
                onChange={(e) => onSenderChange(e.target.value)}
                className="fi text-sm w-full"
              >
                <option value="Gemral <hello@gemral.com>">Gemral &lt;hello@gemral.com&gt;</option>
                <option value="Jennie Uyen Chu <jennieuyenchu@gemral.com>">Jennie Uyen Chu &lt;jennieuyenchu@gemral.com&gt;</option>
                <option value="Gemral <no_reply@gemral.com>">Gemral &lt;no_reply@gemral.com&gt;</option>
                <option value="Gemral <info@gemral.com>">Gemral &lt;info@gemral.com&gt;</option>
                <option value="Gemral <support@gemral.com>">Gemral &lt;support@gemral.com&gt;</option>
              </select>
            </div>
            <div>
              <label className="block text-xxs font-medium text-txt-2 mb-1">Tiêu đề email *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Nhập tiêu đề email..."
                className="fi text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xxs font-medium text-txt-2 mb-1">Người nhận * (dấu phẩy phân cách)</label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => onRecipientsChange(e.target.value)}
                placeholder="email1@gmail.com, email2@gmail.com"
                className="fi text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xxs font-medium text-txt-2 mb-1">BCC <span className="text-txt-3 font-normal">(tùy chọn, dấu phẩy phân cách)</span></label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => onBccChange(e.target.value)}
                placeholder="bcc1@gmail.com, bcc2@gmail.com"
                className="fi text-sm w-full"
              />
            </div>
            {/* Manual HTML — chỉ hiển thị khi chưa có output từ AI */}
            {!output && (
              <div>
                <label className="block text-xxs font-medium text-txt-2 mb-1">
                  HTML Email * <span className="text-txt-3 font-normal">(dán code HTML nếu không dùng AI tạo nội dung)</span>
                </label>
                <textarea
                  value={manualHtml}
                  onChange={(e) => onManualHtmlChange(e.target.value)}
                  placeholder="<!DOCTYPE html><html>...</html>"
                  rows={10}
                  className="fi text-xs w-full font-mono resize-y"
                />
                {manualHtml && (
                  <div className="mt-1 text-xxs text-txt-3">{manualHtml.length.toLocaleString()} ký tự</div>
                )}
              </div>
            )}
            {output && (
              <div className="p-2 rounded bg-success/10 border border-success/20 text-xxs text-success flex items-center gap-1.5">
                <CheckCircle2 size={11} />
                Sẽ gửi nội dung đã tạo ({output.length.toLocaleString()} ký tự)
              </div>
            )}
          </div>

          {/* Send result */}
          {sent && (
            <div className="flex items-center gap-2 p-3 rounded-card bg-success/10 border border-success/20">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-success font-medium">Email đã gửi thành công!</p>
                <p className="text-xxs text-success/70">ID: {sent.id} • {sent.recipients.length} người nhận</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={sending || !subject.trim() || !recipients.trim()}
              onClick={onSend}
              className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 text-xs font-medium transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {sending ? 'Đang gửi...' : sent ? 'Gửi Lại' : 'Gửi Email'}
            </button>
            <button
              onClick={handleCopyHtml}
              className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-border bg-glass-bg text-txt-3 hover:bg-purple/10 hover:border-purple/30 hover:text-purple text-xs font-medium transition-all"
            >
              <Copy size={12} />
              Sao Chép HTML
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResendSendSection;
