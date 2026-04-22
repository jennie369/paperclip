// Add manual row modal (Phase 7).
// POST /api/companies/:id/timetable/manual — when createAsIssue is true
// BE also inserts an issue with origin_kind='manual_timetable' and links
// it back to the manual row via issue_id. Widget + page both mount this
// modal through state; React Query invalidation keeps them in sync.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";
import { useCreateTimetableManual } from "@/hooks/useTimetable";
import { SimpleModal } from "@/pages/crm/components/SimpleModal";
import { HCM_TZ } from "./TimetableTable";

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "manual_task", label: "📌 Việc thủ công" },
  { value: "meeting", label: "🗓 Họp" },
  { value: "reminder", label: "⏰ Nhắc nhở" },
  { value: "call", label: "📞 Gọi điện" },
  { value: "test", label: "🧪 Test / kiểm tra" },
  { value: "reply", label: "💬 Reply thủ công" },
];

function nowHCMForDatetimeLocal(): string {
  // datetime-local input needs `YYYY-MM-DDTHH:mm` in the *displayed* wall
  // clock. We stay in HCM for the whole flow.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HCM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// `2026-04-23T14:30` (HCM wall clock) → `2026-04-23T14:30:00+07:00` (ISO).
function datetimeLocalToHCMIso(value: string): string {
  if (!value) return "";
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

export function AddManualRowModal({
  open,
  onClose,
  companyId,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  /** YYYY-MM-DD to prefill. If omitted, uses today HCM. */
  defaultDate?: string;
}) {
  const createManual = useCreateTimetableManual(companyId);
  const { data: agents } = useQuery({
    queryKey: ["agents", "list", companyId],
    queryFn: () => agentsApi.list(companyId),
    enabled: open && Boolean(companyId),
  });

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [agentId, setAgentId] = useState("");
  const [kind, setKind] = useState("manual_task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [createAsIssue, setCreateAsIssue] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form each time the modal opens so prior state doesn't leak.
  useEffect(() => {
    if (!open) return;
    const seedDate = defaultDate;
    if (seedDate) {
      // Prefill 09:00 HCM on the selected date for a sensible default.
      setStartsAt(`${seedDate}T09:00`);
    } else {
      setStartsAt(nowHCMForDatetimeLocal());
    }
    setEndsAt("");
    setAgentId("");
    setKind("manual_task");
    setTitle("");
    setDescription("");
    setNote("");
    setCreateAsIssue(false);
    setSubmitError(null);
  }, [open, defaultDate]);

  // Enable createAsIssue default whenever an agent is selected — making an
  // agent-assigned manual row without an issue loses it from the heartbeat
  // queue, which is almost never what the user wants.
  useEffect(() => {
    if (agentId) setCreateAsIssue((prev) => (prev ? prev : true));
  }, [agentId]);

  const canSubmit = Boolean(startsAt) && title.trim().length > 0 && !createManual.isPending;

  const agentOptions = useMemo(
    () => (agents ?? []).map((a) => ({ id: a.id, name: a.name })),
    [agents],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    createManual.mutate(
      {
        startsAt: datetimeLocalToHCMIso(startsAt),
        endsAt: endsAt ? datetimeLocalToHCMIso(endsAt) : null,
        agentId: agentId || null,
        kind,
        title: title.trim(),
        description: description.trim() || null,
        note: note.trim() || null,
        createAsIssue,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          setSubmitError((err as Error).message || "Tạo dòng thất bại");
        },
      },
    );
  };

  return (
    <SimpleModal
      open={open}
      onClose={createManual.isPending ? () => {} : onClose}
      title="Thêm dòng vào lịch"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Bắt đầu <span className="text-destructive">*</span>
            </span>
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5"
            />
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              Giờ Việt Nam (Asia/Ho_Chi_Minh)
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Kết thúc (tùy chọn)
            </span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Agent</span>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5"
            >
              <option value="">— Không gán —</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Loại</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Tiêu đề <span className="text-destructive">*</span>
          </span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Gọi chị Lan 10h — chốt đơn Tier 2"
            className="w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Mô tả</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Chi tiết ngắn (tùy chọn)"
            className="w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Ghi chú</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ghi chú cá nhân"
            className="w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>

        <label className="flex items-start gap-2 rounded border border-border bg-muted/30 p-2 text-xs">
          <input
            type="checkbox"
            checked={createAsIssue}
            onChange={(e) => setCreateAsIssue(e.target.checked)}
            className="mt-0.5"
            disabled={!agentId}
            title={agentId ? "" : "Phải chọn agent trước"}
          />
          <span className="flex-1 text-muted-foreground">
            Đồng thời tạo dưới dạng <strong>issue</strong> để agent tự pick work
            <br />
            <span className="text-[10px]">
              Khi bật: tạo issue với <code>origin_kind='manual_timetable'</code> gắn agent được
              chọn, link về dòng lịch này qua <code>issue_id</code>. Heartbeat agent sẽ tự pick up.
            </span>
          </span>
        </label>

        {submitError && (
          <p className="text-xs text-destructive">Lỗi: {submitError}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={createManual.isPending}
            className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {createManual.isPending ? "Đang tạo…" : "Thêm dòng"}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}

export default AddManualRowModal;
