// ContentBoardView — kanban view for the "Nội Dung" tab, reusing GenericKanban (SSOT board, 2026-06-22).
// Columns = cc_scripts statuses. Drag a card to another column → updates cc_scripts.status.
// Card click → CC script detail. Read-only otherwise (editing stays in list/expand view).

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { opsApi } from "@/api/ops";
import { useToast } from "@/context/ToastContext";
import { GenericKanban, type KanbanColumnDef } from "@/components/GenericKanban";

// Order follows the content workflow. Labels/dot colors mirror ContentTab statusLabels/statusColors.
const CONTENT_STATUS: { id: string; label: string; dot: string }[] = [
  { id: "draft", label: "Nháp", dot: "bg-gray-400" },
  { id: "approved", label: "Đã duyệt", dot: "bg-green-500" },
  { id: "scheduled", label: "Đã lên lịch", dot: "bg-yellow-500" },
  { id: "published", label: "Đã đăng", dot: "bg-blue-500" },
  { id: "rejected", label: "Từ chối", dot: "bg-red-500" },
];

function fmtDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" });
}

export function ContentBoardView({ items }: { items: any[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const columns: KanbanColumnDef[] = useMemo(
    () => CONTENT_STATUS.map((s) => ({ id: s.id, label: s.label })),
    [],
  );
  const dotById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of CONTENT_STATUS) m[s.id] = s.dot;
    return m;
  }, []);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => opsApi.updateScript(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops"] }),
    onError: (e: any) => pushToast({ title: e?.message || "Lỗi đổi trạng thái", tone: "error" }),
  });

  return (
    <GenericKanban<any>
      items={items}
      columns={columns}
      getId={(s) => s.id}
      getColumnId={(s) => (CONTENT_STATUS.some((c) => c.id === s.status) ? s.status : "draft")}
      onMove={(id, status) => moveMut.mutate({ id, status })}
      storageKey="contentKanbanColumnOrder"
      renderColumnIcon={(id) => <span className={`inline-block h-2 w-2 rounded-full ${dotById[id] ?? "bg-gray-400"}`} />}
      renderCard={(s, { isOverlay }) => {
        const thumb: string | undefined = (s.image_urls && s.image_urls[0]) || (s.metadata?.images && s.metadata.images[0]);
        return (
          <div
            className={`group/card rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-shadow ${
              isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm"
            }`}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => navigate(`/GEM/cc/scripts/${s.id}`)}
              className="block cursor-pointer"
              title="Mở chi tiết"
            >
              {thumb && (
                <img
                  src={thumb}
                  alt=""
                  loading="lazy"
                  className="mb-2 h-20 w-full rounded object-cover border border-border/60"
                />
              )}
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground font-mono">
                {s.content_type && <span className="bg-muted px-1 rounded">{s.content_type}</span>}
                <span>{fmtDate(s.scheduled_at || s.created_at)}</span>
              </div>
              <p className="text-sm leading-snug line-clamp-2 mb-1.5">{s.title || "Không có tiêu đề"}</p>
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                {s.pillar && <span>{s.pillar}</span>}
                {s.posted_account && <><span className="opacity-40">·</span><span className="text-blue-500">{s.posted_account}</span></>}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
