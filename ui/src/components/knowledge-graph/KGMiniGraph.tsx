// KG Mini Graph — Reusable compact 3D graph for CRM/Agent/SOP contexts

import { useQuery } from "@tanstack/react-query";
import { knowledgeGraphApi } from "@/api/knowledge-graph";
import { queryKeys } from "@/lib/queryKeys";
import ForceGraph3D from "./ForceGraph3D";
import type { KGEntity } from "@/api/kg-types";

interface KGMiniGraphProps {
  centerId?: string;
  centerType?: string;
  filterTypes?: string[];
  depth?: number;
  maxNodes?: number;
  className?: string;
  onEntityClick?: (entity: KGEntity) => void;
}

export default function KGMiniGraph({
  centerId,
  centerType,
  filterTypes,
  depth = 2,
  maxNodes = 20,
  className = "",
  onEntityClick,
}: KGMiniGraphProps) {
  // If centerId provided, use traverse; otherwise use graph endpoint
  const traverseQuery = useQuery({
    queryKey: queryKeys.knowledgeGraph.subgraph(centerId || "", depth),
    queryFn: () =>
      knowledgeGraphApi.traverse({
        external_id: centerId,
        max_depth: depth,
      }),
    enabled: !!centerId,
  });

  const graphQuery = useQuery({
    queryKey: queryKeys.knowledgeGraph.graph(filterTypes?.join(","), maxNodes),
    queryFn: () =>
      knowledgeGraphApi.getGraph({
        limit: maxNodes,
        types: filterTypes?.join(","),
      }),
    enabled: !centerId,
  });

  const data = centerId ? traverseQuery.data : graphQuery.data;
  const isLoading = centerId ? traverseQuery.isLoading : graphQuery.isLoading;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-48 ${className}`}>
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  const entities = data?.entities || [];
  const relations = data?.relations || [];

  if (entities.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 ${className}`}>
        <div className="text-sm text-muted-foreground">Chưa có dữ liệu</div>
      </div>
    );
  }

  return (
    <div className={`h-48 ${className}`}>
      <ForceGraph3D
        entities={entities}
        relations={relations}
        maxNodes={maxNodes}
        compact
        onEntityClick={onEntityClick || (() => {})}
        onEntityDoubleClick={() => {}}
      />
    </div>
  );
}
