import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import {
  agentConfigsApi,
  PROVIDER_LABELS,
  type AgentConfig,
} from "@/api/agentConfigs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STORAGE_KEY = 'agent-card-order';

function loadCardOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCardOrder(order: string[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

export function AgentListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agent-configs"],
    queryFn: agentConfigsApi.fetchAll,
  });

  // Drag-drop order
  const agentSlugs = agents.map((a) => a.slug);
  const [order, setOrder] = useState<string[]>(() => {
    const saved = loadCardOrder();
    if (!saved) return [];
    return saved;
  });

  useEffect(() => {
    if (agentSlugs.length === 0) return;
    setOrder((prev) => {
      const currentSet = new Set(agentSlugs);
      const result: string[] = [];
      for (const s of prev) if (currentSet.has(s)) result.push(s);
      for (const s of agentSlugs) if (!prev.includes(s)) result.push(s);
      return result;
    });
  }, [agentSlugs.join(',')]);

  useEffect(() => {
    if (order.length > 0) saveCardOrder(order);
  }, [order]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIdx = prev.indexOf(String(active.id));
      const newIdx = prev.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const agentMap = new Map(agents.map((a) => [a.slug, a]));
  const sortedAgents = order.map((s) => agentMap.get(s)).filter(Boolean) as AgentConfig[];

  const toggleMut = useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      agentConfigsApi.update(slug, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-configs"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => agentConfigsApi.delete(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-configs"] });
      setDeleteSlug(null);
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Cấu hình Agent LLM
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý các agent AI cho hệ thống tự động trả lời
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/agents-config/new")}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo agent mới
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && agents.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground text-sm">Chưa có agent nào được cấu hình</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => navigate("/agents-config/new")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tạo agent đầu tiên
          </Button>
        </div>
      )}

      {/* Agent Grid (drag-drop reorderable) */}
      {!isLoading && sortedAgents.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedAgents.map((agent) => (
                <SortableAgentCard
                  key={agent.slug}
                  agent={agent}
                  onEdit={() => navigate(`/agents-config/${agent.slug}/edit`)}
                  onTest={() => navigate(`/agents-config/${agent.slug}/test`)}
                  onToggle={() =>
                    toggleMut.mutate({
                      slug: agent.slug,
                      enabled: !agent.enabled,
                    })
                  }
                  onDelete={() => setDeleteSlug(agent.slug)}
                  isToggling={toggleMut.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete confirmation */}
      {deleteSlug && (
        <DeleteConfirm
          slug={deleteSlug}
          isDeleting={deleteMut.isPending}
          error={deleteMut.error instanceof Error ? deleteMut.error.message : null}
          onConfirm={() => deleteMut.mutate(deleteSlug)}
          onCancel={() => {
            setDeleteSlug(null);
            deleteMut.reset();
          }}
        />
      )}
    </div>
  );
}

function SortableAgentCard(props: {
  agent: AgentConfig;
  onEdit: () => void;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.agent.slug });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <AgentCard {...props} />
    </div>
  );
}

function AgentCard({
  agent,
  onEdit,
  onTest,
  onToggle,
  onDelete,
  isToggling,
}: {
  agent: AgentConfig;
  onEdit: () => void;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 bg-card hover:border-foreground/20 transition-colors">
      {/* Top row: avatar + info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-lg">
          {agent.avatar || agent.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{agent.display_name}</span>
            {!agent.enabled && (
              <Badge variant="secondary" className="text-[10px]">Tắt</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{agent.slug}</div>
          {agent.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {agent.description}
            </p>
          )}
        </div>
      </div>

      {/* Provider + Model */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]">
          {PROVIDER_LABELS[agent.provider] || agent.provider}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {agent.model}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          T={agent.temperature}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t">
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" />
          Sửa
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onTest}>
          <FlaskConical className="h-3 w-3 mr-1" />
          Thử
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={onToggle}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : agent.enabled ? (
            <PowerOff className="h-3 w-3 mr-1" />
          ) : (
            <Power className="h-3 w-3 mr-1" />
          )}
          {agent.enabled ? "Tắt" : "Bật"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 text-destructive hover:text-destructive ml-auto"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function DeleteConfirm({
  slug,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: {
  slug: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-semibold">Xác nhận xóa agent</h3>
        <p className="text-sm text-muted-foreground">
          Bạn có chắc muốn xóa agent <span className="font-mono font-medium">{slug}</span>?
          Hành động này không thể hoàn tác.
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isDeleting}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
