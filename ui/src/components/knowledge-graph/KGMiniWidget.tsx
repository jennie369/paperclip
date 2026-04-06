// KG Mini Widget — Dashboard card: auto-rotate preview + recent entities

import { useQuery } from "@tanstack/react-query";
import { Network, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import { ENTITY_TYPES } from "@/lib/kg-config";
import KGMiniGraph from "./KGMiniGraph";

export default function KGMiniWidget() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.knowledgeGraph.stats,
    queryFn: () => knowledgeGraphApi.getStats(),
  });

  const { data: recentData } = useQuery({
    queryKey: queryKeys.knowledgeGraph.entities(undefined, undefined),
    queryFn: () => knowledgeGraphApi.getEntities({ limit: 5 }),
  });

  const recentEntities = recentData?.data || [];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Mắt Thần CEO</span>
        </div>
        <Link
          to="/GEM/ops/knowledge-graph"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Mở đầy đủ <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Mini 3D Graph (auto-rotate) */}
      <KGMiniGraph maxNodes={20} className="h-40" />

      {/* Stats row */}
      {stats && (
        <div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-t border-border">
          <span>{stats.total_entities} thực thể</span>
          <span>{stats.total_relations} quan hệ</span>
        </div>
      )}

      {/* Recent entities */}
      <div className="px-4 py-2 space-y-1.5">
        {recentEntities.map((e) => {
          const config = ENTITY_TYPES[e.entity_type as keyof typeof ENTITY_TYPES];
          return (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: config?.color || "#6B7280" }}
              />
              <span className="truncate text-foreground/80">{e.name}</span>
              <span className="text-muted-foreground ml-auto flex-shrink-0">
                {config?.label || e.entity_type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
