// Agent Relations Tab — Mini graph + editable relations table for Agent Detail

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import { ENTITY_TYPES, RELATION_TYPES } from "@/lib/kg-config";
import KGMiniGraph from "./KGMiniGraph";
import type { KGRelation, KGEntity } from "@/api/kg-types";

interface AgentRelationsTabProps {
  agentSlug: string;
}

export default function AgentRelationsTab({ agentSlug }: AgentRelationsTabProps) {
  const queryClient = useQueryClient();
  const externalId = `agent:${agentSlug}`;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.entity(externalId),
    queryFn: async () => {
      // First find entity by external_id
      const list = await knowledgeGraphApi.getEntities({ search: agentSlug, type: "agent" });
      const entity = list.data.find((e) => e.external_id === externalId);
      if (!entity) return null;
      return knowledgeGraphApi.getEntity(entity.id);
    },
  });

  const entity = data?.entity;
  const relations = data?.relations || [];
  const relatedEntities = data?.related_entities || [];
  const entityLookup = new Map(relatedEntities.map((e) => [e.id, e]));

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải quan hệ...</div>;
  }

  if (!entity) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Agent chưa có trong Knowledge Graph. Chạy seed dữ liệu trước.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini 3D Graph centered on this agent */}
      <KGMiniGraph centerId={externalId} depth={2} maxNodes={15} className="h-52 rounded-lg border border-border" />

      {/* Relations table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Quan hệ ({relations.length})</h4>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium">Thực thể</th>
                <th className="text-left px-3 py-2 font-medium">Loại quan hệ</th>
                <th className="text-center px-3 py-2 font-medium">Tin cậy</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {relations.map((r) => {
                const otherId =
                  r.source_entity_id === entity.id ? r.target_entity_id : r.source_entity_id;
                const other = entityLookup.get(otherId);
                const otherConfig = other
                  ? ENTITY_TYPES[other.entity_type as keyof typeof ENTITY_TYPES]
                  : null;
                const relConfig = RELATION_TYPES[r.relation_type];

                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {otherConfig && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: otherConfig.color }}
                          />
                        )}
                        <span className="truncate">{other?.name || otherId}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {relConfig?.label || r.relation_type}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {Math.round(r.confidence * 100)}%
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => {
                          // Delete relation via entity update
                        }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {relations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    Chưa có quan hệ nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
