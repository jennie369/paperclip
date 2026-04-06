// Entity Detail Panel — Right panel: editable metadata, relations, actions

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Trash2, GitBranch, Plus, ExternalLink } from "lucide-react";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import { ENTITY_TYPES, RELATION_TYPES } from "@/lib/kg-config";
import type { KGEntity, KGRelation } from "@/api/kg-types";

interface EntityDetailPanelProps {
  entityId: string;
  onClose: () => void;
  onEntityClick: (id: string) => void;
  onTraverse: (entityId: string) => void;
}

export default function EntityDetailPanel({
  entityId,
  onClose,
  onEntityClick,
  onTraverse,
}: EntityDetailPanelProps) {
  const queryClient = useQueryClient();
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.entity(entityId),
    queryFn: () => knowledgeGraphApi.getEntity(entityId),
    enabled: !!entityId,
  });

  const entity = data?.entity;
  const relations = data?.relations || [];
  const relatedEntities = data?.related_entities || [];

  const entityLookup = new Map(relatedEntities.map((e) => [e.id, e]));

  const deleteMutation = useMutation({
    mutationFn: () => knowledgeGraphApi.deleteEntity(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<KGEntity>) =>
      knowledgeGraphApi.upsertEntity({
        external_id: entity!.external_id,
        entity_type: entity!.entity_type,
        name: updates.name || entity!.name,
        description: updates.description,
        metadata: updates.metadata || entity!.metadata,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
      setIsEditing(false);
    },
  });

  const startEditing = useCallback(() => {
    if (!entity) return;
    setEditName(entity.name);
    setEditDesc(entity.description || "");
    setIsEditing(true);
  }, [entity]);

  const saveEdits = useCallback(() => {
    updateMutation.mutate({ name: editName, description: editDesc });
  }, [editName, editDesc, updateMutation]);

  if (isLoading || !entity) {
    return (
      <div className="w-80 border-l border-border bg-card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const config = ENTITY_TYPES[entity.entity_type as keyof typeof ENTITY_TYPES];

  // Group relations by type
  const groupedRelations = new Map<string, { relation: KGRelation; target: KGEntity | undefined }[]>();
  for (const r of relations) {
    const otherId = r.source_entity_id === entityId ? r.target_entity_id : r.source_entity_id;
    const target = entityLookup.get(otherId);
    const group = groupedRelations.get(r.relation_type) || [];
    group.push({ relation: r, target });
    groupedRelations.set(r.relation_type, group);
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{config?.icon || "📌"}</span>
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-sm font-semibold bg-input border border-border rounded px-2 py-0.5 w-full"
            />
          ) : (
            <span className="text-sm font-semibold truncate">{entity.name}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: config?.color + "20", color: config?.color }}
            title={config?.tooltip}
          >
            {config?.label || entity.entity_type}
          </span>
          <span className="text-xs text-muted-foreground">
            Tin cậy: {Math.round(entity.confidence * 100)}%
          </span>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Mô tả</label>
          {isEditing ? (
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full text-sm bg-input border border-border rounded p-2 resize-none"
              rows={3}
            />
          ) : (
            <p className="text-sm text-foreground/80">
              {entity.description || "Chưa có mô tả"}
            </p>
          )}
        </div>

        {/* Metadata */}
        {Object.keys(entity.metadata).length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Thuộc tính</label>
            <div className="space-y-1">
              {Object.entries(entity.metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-foreground font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relations grouped by type */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">
            Quan hệ ({relations.length})
          </label>
          {Array.from(groupedRelations.entries()).map(([type, items]) => {
            const relConfig = RELATION_TYPES[type];
            return (
              <div key={type} className="mb-3">
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: relConfig?.color || "#6B7280" }}
                  />
                  {relConfig?.label || type} ({items.length})
                </div>
                <div className="space-y-0.5 pl-3">
                  {items.map(({ relation, target }) => (
                    <button
                      key={relation.id}
                      onClick={() => target && onEntityClick(target.id)}
                      className="text-xs text-foreground/80 hover:text-foreground flex items-center gap-1 w-full text-left py-0.5"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{target?.name || "?"}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Source info */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Nguồn: {entity.source}</p>
          <p>ID: {entity.external_id}</p>
          <p>Tạo: {new Date(entity.created_at).toLocaleDateString("vi-VN")}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border p-3 space-y-2">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={saveEdits}
              disabled={updateMutation.isPending}
              className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
            >
              {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-xs"
            >
              Hủy
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="flex-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80"
            >
              ✏ Sửa
            </button>
            <button
              onClick={() => onTraverse(entityId)}
              className="flex-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80 flex items-center justify-center gap-1"
            >
              <GitBranch className="w-3 h-3" />
              Traverse
            </button>
            <button
              onClick={() => {
                if (confirm("Xóa entity này? Tất cả quan hệ sẽ bị xóa theo.")) {
                  deleteMutation.mutate();
                }
              }}
              className="px-2 py-1.5 bg-destructive/10 text-destructive rounded text-xs hover:bg-destructive/20"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
