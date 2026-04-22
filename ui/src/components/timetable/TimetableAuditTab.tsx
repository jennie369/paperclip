// Audit tab for /timetable: lists activity_log entries scoped to timetable
// (entityType = timetable_note | timetable_manual_row). Reuses ActivityRow
// so the row layout matches the global /activity page.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import type { Agent } from "@paperclipai/shared";
import { activityApi } from "@/api/activity";
import { agentsApi } from "@/api/agents";
import { issuesApi } from "@/api/issues";
import { projectsApi } from "@/api/projects";
import { goalsApi } from "@/api/goals";
import { ActivityRow } from "@/components/ActivityRow";
import { EmptyState } from "@/components/EmptyState";

export function TimetableAuditTab({ companyId }: { companyId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity", companyId, "scope:timetable"],
    queryFn: () => activityApi.list(companyId, { scope: "timetable" }),
    enabled: Boolean(companyId),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents", "list", companyId],
    queryFn: () => agentsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const { data: issues } = useQuery({
    queryKey: ["issues", "list", companyId],
    queryFn: () => issuesApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const { data: projects } = useQuery({
    queryKey: ["projects", "list", companyId],
    queryFn: () => projectsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const { data: goals } = useQuery({
    queryKey: ["goals", "list", companyId],
    queryFn: () => goalsApi.list(companyId),
    enabled: Boolean(companyId),
  });

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.identifier ?? i.id.slice(0, 8));
    for (const a of agents ?? []) map.set(`agent:${a.id}`, a.name);
    for (const p of projects ?? []) map.set(`project:${p.id}`, p.name);
    for (const g of goals ?? []) map.set(`goal:${g.id}`, g.title);
    return map;
  }, [issues, agents, projects, goals]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.title);
    return map;
  }, [issues]);

  if (isLoading) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        Đang tải audit log…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-16 text-center text-sm text-destructive">
        Lỗi tải audit log: {(error as Error).message || "unknown"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-4 py-16">
        <EmptyState icon={History} message="Chưa có thay đổi nào. Mỗi lần chị sửa ghi chú / kết quả, hoặc thêm dòng thủ công, sẽ ghi vào đây." />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.map((event) => (
        <ActivityRow
          key={event.id}
          event={event}
          agentMap={agentMap}
          entityNameMap={entityNameMap}
          entityTitleMap={entityTitleMap}
        />
      ))}
    </div>
  );
}

export default TimetableAuditTab;
