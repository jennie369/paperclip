/**
 * DripStepHtmlEditor — paste-and-save HTML directly for one drip-sequence step.
 * Bypasses the generate → approve → publish pipeline by writing straight into
 * cc_email_campaigns + linking via email_sequence_steps.campaign_id_override.
 *
 * Server endpoint: POST /api/ops/email/steps/:stepId/save-campaign
 * Backend sanitizes html_body with DOMPurify (strips <script>/onerror/etc).
 */
import React, { useState } from 'react';

function timeAgo(iso) {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  return `${Math.floor(diffSec / 3600)} giờ trước`;
}

export default function DripStepHtmlEditor({
  stepId,
  stepLabel,
  defaultFrom = 'Jennie <hello@gemral.com>',
  track = 'wealth',
  /** controlled state — kept on the parent so the "Override drip" map can persist
   *  what the user typed when they switch tabs / sequences. */
  htmlBody = '',
  htmlSubject = '',
  htmlPreview = '',
  onChange, // (patch: Partial<{htmlBody, htmlSubject, htmlPreview}>) => void
}) {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [bytesStripped, setBytesStripped] = useState(0);

  const canSave = !!stepId && htmlBody.trim().length > 0 && htmlSubject.trim().length > 0;

  async function handleSave() {
    if (!canSave) {
      setError('Cần stepId + subject + html_body để lưu');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const senderMatch = defaultFrom.match(/<(.+)>/);
      const fromEmail = senderMatch ? senderMatch[1] : defaultFrom;
      const fromName = defaultFrom.split('<')[0]?.trim() || 'GEM';
      const res = await fetch(`/api/ops/email/steps/${stepId}/save-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html_body: htmlBody,
          subject: htmlSubject,
          preview_text: htmlPreview || null,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: fromEmail,
          track,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setSavedAt(new Date().toISOString());
      setBytesStripped(data.sanitized_bytes_stripped || 0);
    } catch (err) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="mt-2 rounded-md border border-border bg-muted/20">
      <summary className="cursor-pointer select-none px-3 py-2 text-[12px] font-medium text-foreground/80 hover:text-foreground">
        📄 Hoặc paste HTML trực tiếp (skip generate)
        {savedAt && <span className="ml-2 text-[10px] text-emerald-500">✓ đã lưu {timeAgo(savedAt)}</span>}
      </summary>
      <div className="space-y-2 px-3 pb-3 pt-1">
        <input
          type="text"
          value={htmlSubject}
          onChange={(e) => onChange?.({ htmlSubject: e.target.value })}
          placeholder="Subject (bắt buộc)..."
          className="w-full rounded border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary/40"
        />
        <input
          type="text"
          value={htmlPreview}
          onChange={(e) => onChange?.({ htmlPreview: e.target.value })}
          placeholder="Preview text (50-100 ký tự, optional)..."
          maxLength={150}
          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary/40"
        />
        <textarea
          value={htmlBody}
          onChange={(e) => onChange?.({ htmlBody: e.target.value })}
          placeholder="<html>...</html>  — paste full HTML email body. Backend sẽ tự sanitize <script>/onerror/javascript: trước khi lưu."
          rows={8}
          className="w-full resize-y rounded border border-border bg-background px-2 py-1 font-mono text-[11px] leading-relaxed outline-none focus:border-primary/40"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="h-7 rounded-md bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Đang lưu...' : `Lưu HTML cho ${stepLabel || 'step này'}`}
          </button>
          <div className="text-[10px] text-muted-foreground">
            {error && <span className="text-destructive">⚠ {error}</span>}
            {!error && savedAt && (
              <span className="text-emerald-500">
                ✓ Saved campaign · linked vào step
                {bytesStripped > 0 && ` · sanitized ${bytesStripped} bytes`}
              </span>
            )}
            {!error && !savedAt && (
              <span>Bypass generate — write thẳng vào cc_email_campaigns + link step</span>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
