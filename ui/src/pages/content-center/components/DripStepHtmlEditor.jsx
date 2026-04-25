/**
 * DripStepHtmlEditor — paste-and-save HTML directly for one drip-sequence step.
 * Bypasses the generate → approve → publish pipeline by writing straight into
 * cc_email_campaigns + linking via email_sequence_steps.campaign_id_override.
 *
 * Server endpoint: POST /api/ops/email/steps/:stepId/save-campaign
 * Backend sanitizes html_body with DOMPurify (strips <script>/onerror/etc).
 *
 * Three confirmation layers exposed to the user after save:
 *   1. Inline success panel with campaign_id + bytes-stripped count.
 *   2. "Xem preview HTML" button → modal iframe rendering the saved HTML
 *      (re-fetched from server via GET /api/ops/email/campaigns/:id) so the
 *      user can verify the exact version that will be sent.
 *   3. onSaved callback → parent refetches sequence list, the step dropdown
 *      then displays "· đã override" for the step.
 */
import React, { useState } from 'react';

function timeAgo(iso) {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  return `${Math.floor(diffSec / 3600)} giờ trước`;
}

function shortId(id) {
  if (!id) return '';
  return id.slice(0, 8);
}

function PreviewModal({ campaignId, onClose }) {
  const [campaign, setCampaign] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/ops/email/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error || 'Không tải được preview');
          return;
        }
        setCampaign(data.campaign);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [campaignId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {campaign ? `📧 ${campaign.subject}` : '📧 Đang tải preview...'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {campaign ? (
                <>
                  Campaign <code>{shortId(campaign.id)}…</code> · {campaign.html_length} bytes ·
                  status <code>{campaign.status}</code> · audience <code>{campaign.audience_type}</code>
                  {campaign.metadata?.sanitized_bytes_stripped > 0 && (
                    <> · sanitized {campaign.metadata.sanitized_bytes_stripped} bytes</>
                  )}
                </>
              ) : 'Đây là HTML chính xác sẽ được gửi khi drip step này trigger.'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 h-7 w-7 shrink-0 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          {error ? (
            <div className="p-6 text-center text-destructive">⚠ {error}</div>
          ) : campaign ? (
            <iframe
              title="Email preview"
              srcDoc={campaign.html_body}
              sandbox=""
              className="h-[70vh] w-full border-0"
            />
          ) : (
            <div className="p-6 text-center text-muted-foreground">Đang tải...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DripStepHtmlEditor({
  stepId,
  stepLabel,
  defaultFrom = 'Jennie <hello@gemral.com>',
  track = 'wealth',
  htmlBody = '',
  htmlSubject = '',
  htmlPreview = '',
  onChange,
  onSaved, // (info: {campaignId, stepId}) => void — parent uses this to refetch sequences
}) {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [bytesStripped, setBytesStripped] = useState(0);
  const [campaignId, setCampaignId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
      setCampaignId(data.campaign_id);
      onSaved?.({ campaignId: data.campaign_id, stepId });
    } catch (err) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  }

  function handleResetForReoverride() {
    setSavedAt(null);
    setCampaignId(null);
    setError(null);
    setBytesStripped(0);
  }

  // After successful save → render the prominent confirmation panel instead of
  // the editor form. User can preview, re-override, or close it.
  if (savedAt && campaignId && !error) {
    return (
      <>
        <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
          <div className="flex items-start gap-2">
            <div className="text-2xl leading-none">✅</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
                ĐÃ OVERRIDE {stepLabel || 'step này'}
              </div>
              <div className="mt-0.5 text-[11px] text-foreground/80">
                Khi drip sequence trigger, hệ thống sẽ gửi đi <strong>chính xác HTML</strong> chị
                vừa paste — không qua generate, không qua approve, không qua Notion.
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>
                  Campaign <code className="rounded bg-muted/40 px-1">{shortId(campaignId)}…</code>
                </span>
                <span>Saved {timeAgo(savedAt)}</span>
                {bytesStripped > 0 && <span>Sanitized {bytesStripped} bytes</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="h-7 rounded-md bg-emerald-500/15 px-3 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                >
                  📋 Xem preview HTML đã lưu
                </button>
                <button
                  type="button"
                  onClick={handleResetForReoverride}
                  className="h-7 rounded-md border border-border bg-transparent px-3 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  🔄 Override lại
                </button>
              </div>
            </div>
          </div>
        </div>
        {showPreview && (
          <PreviewModal campaignId={campaignId} onClose={() => setShowPreview(false)} />
        )}
      </>
    );
  }

  return (
    <details className="mt-2 rounded-md border border-border bg-muted/20" open={!!error || !!htmlBody}>
      <summary className="cursor-pointer select-none px-3 py-2 text-[12px] font-medium text-foreground/80 hover:text-foreground">
        📄 Hoặc paste HTML trực tiếp (skip generate)
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
            {error ? (
              <span className="text-destructive">⚠ {error}</span>
            ) : (
              <span>Bypass generate — write thẳng vào cc_email_campaigns + link step</span>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
