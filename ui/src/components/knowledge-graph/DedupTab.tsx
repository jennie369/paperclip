// Dedup Tab — List pending dedup candidates with merge/reject buttons

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Merge, X } from "lucide-react";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import { ENTITY_TYPES } from "@/lib/kg-config";

export default function DedupTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.dedup,
    queryFn: () => knowledgeGraphApi.getDedup("pending"),
  });

  const mergeMutation = useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: string; sourceId: string }) =>
      knowledgeGraphApi.merge(targetId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
    },
  });

  const candidates = data?.data || [];

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>;
  }

  if (candidates.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Không có bản sao nào cần xử lý
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <div className="text-sm font-medium mb-3">
        Bản sao cần xử lý ({candidates.length})
      </div>
      {candidates.map((c) => {
        const entityA = c.entity_a;
        const entityB = c.entity_b;
        const configA = entityA
          ? ENTITY_TYPES[entityA.entity_type as keyof typeof ENTITY_TYPES]
          : null;

        return (
          <div
            key={c.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                {configA && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: configA.color }}
                  />
                )}
                <span className="font-medium truncate">{entityA?.name || "?"}</span>
                <span className="text-muted-foreground">↔</span>
                <span className="font-medium truncate">{entityB?.name || "?"}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Tương đồng tên: {c.name_similarity != null ? Math.round(c.name_similarity * 100) : "?"}%
                {c.vector_similarity != null && (
                  <> · Vector: {Math.round(c.vector_similarity * 100)}%</>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  entityA &&
                  entityB &&
                  mergeMutation.mutate({ targetId: entityA.id, sourceId: entityB.id })
                }
                disabled={mergeMutation.isPending}
                className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
                title="Gộp"
              >
                <Merge className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  // Reject: update status to 'rejected'
                  // For now, just invalidate
                  queryClient.invalidateQueries({ queryKey: ["kg"] });
                }}
                className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                title="Bỏ qua"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
