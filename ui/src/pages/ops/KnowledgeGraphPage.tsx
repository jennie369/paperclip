// Knowledge Graph Page — "Mắt Thần CEO"
// Main page: 3D graph + controls + entity detail panel + dedup tab

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, Layers } from "lucide-react";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import ForceGraph3D from "@/components/knowledge-graph/ForceGraph3D";
import EntityDetailPanel from "@/components/knowledge-graph/EntityDetailPanel";
import GraphControls from "@/components/knowledge-graph/GraphControls";
import DedupTab from "@/components/knowledge-graph/DedupTab";
import { useGraphStore } from "@/components/knowledge-graph/useGraphStore";
import type { KGEntity, KGRelation } from "@/api/kg-types";

type Tab = "graph" | "dedup";

export default function KnowledgeGraphPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("graph");
  const [detailEntityId, setDetailEntityId] = useState<string | null>(null);

  const {
    selectedEntityId,
    selectEntity,
    setHighlights,
    activeFilters,
    searchQuery,
    maxDepth,
    isFullscreen,
  } = useGraphStore();

  // Fetch graph data
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: queryKeys.knowledgeGraph.graph(
      activeFilters.size > 0 ? Array.from(activeFilters).join(",") : undefined,
      50,
    ),
    queryFn: () =>
      knowledgeGraphApi.getGraph({
        limit: 50,
        types: activeFilters.size > 0 ? Array.from(activeFilters).join(",") : undefined,
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: queryKeys.knowledgeGraph.stats,
    queryFn: () => knowledgeGraphApi.getStats(),
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: () => knowledgeGraphApi.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kg"] });
    },
  });

  const entities = graphData?.entities || [];
  const relations = graphData?.relations || [];

  // Filter entities by search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    const q = searchQuery.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.external_id.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)),
    );
  }, [entities, searchQuery]);

  // Build adjacency for highlight computation
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const r of relations) {
      if (!adj.has(r.source_entity_id)) adj.set(r.source_entity_id, new Set());
      if (!adj.has(r.target_entity_id)) adj.set(r.target_entity_id, new Set());
      adj.get(r.source_entity_id)!.add(r.target_entity_id);
      adj.get(r.target_entity_id)!.add(r.source_entity_id);
    }
    return adj;
  }, [relations]);

  // ⑩ Compute depth-based highlights via BFS
  const computeHighlights = useCallback(
    (entityId: string) => {
      const highlights = new Map<string, number>();
      highlights.set(entityId, 0);

      const queue: [string, number][] = [[entityId, 0]];
      while (queue.length > 0) {
        const [current, depth] = queue.shift()!;
        if (depth >= maxDepth) continue;

        const neighbors = adjacency.get(current);
        if (!neighbors) continue;

        for (const n of neighbors) {
          if (!highlights.has(n)) {
            highlights.set(n, depth + 1);
            queue.push([n, depth + 1]);
          }
        }
      }

      return highlights;
    },
    [adjacency, maxDepth],
  );

  const handleEntityClick = useCallback(
    (entity: KGEntity) => {
      selectEntity(entity.id);
      const highlights = computeHighlights(entity.id);
      setHighlights(highlights);
    },
    [selectEntity, computeHighlights, setHighlights],
  );

  const handleEntityDoubleClick = useCallback(
    (entity: KGEntity) => {
      setDetailEntityId(entity.id);
    },
    [],
  );

  const handleTraverse = useCallback(
    (entityId: string) => {
      selectEntity(entityId);
      const highlights = computeHighlights(entityId);
      setHighlights(highlights);
    },
    [selectEntity, computeHighlights, setHighlights],
  );

  return (
    <div
      className={`flex flex-col h-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-background" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Mắt Thần CEO</h1>
          <span className="text-sm text-muted-foreground">Knowledge Graph</span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              activeTab === "graph"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Network className="w-3.5 h-3.5 inline mr-1" />
            Đồ thị
          </button>
          <button
            onClick={() => setActiveTab("dedup")}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              activeTab === "dedup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5 inline mr-1" />
            Bản sao
          </button>
        </div>
      </div>

      {activeTab === "graph" ? (
        <>
          {/* Controls */}
          <div className="px-6 py-3 border-b border-border">
            <GraphControls
              stats={stats}
              visibleCount={filteredEntities.length}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["kg"] })}
              onSeed={() => seedMutation.mutate()}
              seeding={seedMutation.isPending}
            />
          </div>

          {/* Main content: Graph + Detail Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Graph area */}
            <div className="flex-1 relative">
              {graphLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">Đang tải đồ thị...</div>
                </div>
              ) : filteredEntities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Network className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có dữ liệu. Nhấn "Seed dữ liệu" để bắt đầu.
                  </p>
                </div>
              ) : (
                <ForceGraph3D
                  entities={filteredEntities}
                  relations={relations}
                  selectedEntityId={selectedEntityId ?? undefined}
                  onEntityClick={handleEntityClick}
                  onEntityDoubleClick={handleEntityDoubleClick}
                  maxNodes={50}
                />
              )}
            </div>

            {/* Detail panel */}
            {detailEntityId && (
              <EntityDetailPanel
                entityId={detailEntityId}
                onClose={() => setDetailEntityId(null)}
                onEntityClick={(id) => {
                  setDetailEntityId(id);
                  selectEntity(id);
                  setHighlights(computeHighlights(id));
                }}
                onTraverse={handleTraverse}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <DedupTab />
        </div>
      )}
    </div>
  );
}
