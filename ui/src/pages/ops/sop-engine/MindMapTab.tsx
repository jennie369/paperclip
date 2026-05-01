// Mind Map Tab — embeds ForceGraph3D with SOP Engine graph data.
//
// Fetches /api/ops/sop-engine/graph which returns pipelines + SOPs + agents
// as KGEntity/KGRelation format, then renders the existing ForceGraph3D
// component from Mắt Thần CEO. Click node → detail panel; toggle filter;
// category color coding.
//
// This is the same ForceGraph3D used in /ops/knowledge-graph — reuse, not
// duplicate. Single source of truth for 3D graph rendering.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ForceGraph3D from '@/components/knowledge-graph/ForceGraph3D';
import { GRAPH_PRESETS } from '@/components/knowledge-graph/GraphStylePanel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Network,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Info,
  Boxes,
  Filter,
} from 'lucide-react';

interface SopEngineGraph {
  entities: any[];
  relations: any[];
  stats: {
    pipelines: number;
    sops: number;
    agents: number;
    total_entities: number;
    total_relations: number;
  };
}

async function fetchSopGraph(): Promise<SopEngineGraph> {
  const res = await fetch('/api/ops/sop-engine/graph');
  if (!res.ok) throw new Error('Failed to fetch SOP graph');
  return res.json();
}

function Tip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function MindMapTab() {
  const [fullscreen, setFullscreen] = useState(false);
  const [filter, setFilter] = useState<{ pipelines: boolean; sops: boolean; agents: boolean }>({
    pipelines: true,
    sops: true,
    agents: true,
  });
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ['sop-engine', 'graph'],
    queryFn: fetchSopGraph,
    refetchInterval: 30_000,
  });

  const data = query.data;
  const entities = data?.entities || [];
  const relations = data?.relations || [];

  // Apply filter — hide entity kinds the user toggled off
  const filteredEntities = entities.filter((e) => {
    const kind = e.metadata?.kind;
    if (kind === 'pipeline' && !filter.pipelines) return false;
    if (kind === 'sop' && !filter.sops) return false;
    if (kind === 'agent' && !filter.agents) return false;
    return true;
  });
  const filteredIds = new Set(filteredEntities.map((e) => e.id));
  const filteredRelations = relations.filter(
    (r) => filteredIds.has(r.source_entity_id) && filteredIds.has(r.target_entity_id),
  );

  const handleEntityClick = (entity: any) => {
    setSelectedEntityId(entity.id);
  };

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-260px)] min-h-[600px]'}`}>
        {/* Header + controls */}
        <div className="p-3 border-b border-border flex items-center gap-3 flex-wrap bg-card">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Mind Map — Mắt Thần CEO (SOP Engine view)</h2>
            <Tip text="3D knowledge graph của Pipelines + SOPs + Agents. Dùng chung component ForceGraph3D với trang /ops/knowledge-graph.">
              <Info className="size-3 text-muted-foreground" />
            </Tip>
          </div>

          {data && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>📦 {data.stats.pipelines} pipelines</span>
              <span>📋 {data.stats.sops} SOPs</span>
              <span>🤖 {data.stats.agents} agents</span>
              <span className="text-primary">·</span>
              <span>{data.stats.total_entities} entities</span>
              <span>{data.stats.total_relations} relations</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Filter toggles */}
            <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
              <Tip text="Toggle pipelines visibility">
                <button
                  onClick={() => setFilter((f) => ({ ...f, pipelines: !f.pipelines }))}
                  className={`px-2 py-1 text-[10px] ${filter.pipelines ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  📦 Pipelines
                </button>
              </Tip>
              <Tip text="Toggle SOPs visibility">
                <button
                  onClick={() => setFilter((f) => ({ ...f, sops: !f.sops }))}
                  className={`px-2 py-1 text-[10px] ${filter.sops ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  📋 SOPs
                </button>
              </Tip>
              <Tip text="Toggle agents visibility">
                <button
                  onClick={() => setFilter((f) => ({ ...f, agents: !f.agents }))}
                  className={`px-2 py-1 text-[10px] ${filter.agents ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  🤖 Agents
                </button>
              </Tip>
            </div>

            <Tip text="Refresh graph data">
              <button
                onClick={() => query.refetch()}
                className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded"
              >
                <RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
              </button>
            </Tip>

            <Tip text={fullscreen ? 'Thoát fullscreen' : 'Fullscreen (toàn màn hình)'}>
              <button
                onClick={() => setFullscreen((v) => !v)}
                className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded"
              >
                {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
            </Tip>

            <Tip text="Mở trang Mắt Thần CEO đầy đủ với tất cả controls + style panels">
              <a
                href="/GEM/ops/knowledge-graph"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-[10px] border border-primary text-primary rounded hover:bg-primary/10"
              >
                Mở Mắt Thần CEO →
              </a>
            </Tip>
          </div>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 relative bg-background">
          {query.isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading graph...</span>
            </div>
          ) : query.isError ? (
            <div className="absolute inset-0 flex items-center justify-center text-destructive">
              Error loading graph data
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Boxes className="size-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">Không có entity nào</p>
                <p className="text-xs">Bật lại filter hoặc tạo pipeline/SOP trước.</p>
              </div>
            </div>
          ) : (
            <ForceGraph3D
              entities={filteredEntities}
              relations={filteredRelations}
              selectedEntityId={selectedEntityId}
              onEntityClick={handleEntityClick}
              onEntityDoubleClick={handleEntityClick}
              maxNodes={500}
              graphStyle={GRAPH_PRESETS.gem_gold}
            />
          )}

          {/* Selected entity detail (floating panel, bottom-left) */}
          {selectedEntity && (
            <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 max-w-sm shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{selectedEntity.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{selectedEntity.description}</div>
                  {selectedEntity.metadata?.kind === 'pipeline' && (
                    <div className="text-[10px] text-primary mt-1">
                      📦 {selectedEntity.metadata.block_count} blocks · {selectedEntity.metadata.category}
                    </div>
                  )}
                  {selectedEntity.metadata?.kind === 'sop' && (
                    <div className="text-[10px] text-primary mt-1">
                      📋 {selectedEntity.metadata.domain} · {selectedEntity.metadata.priority}
                    </div>
                  )}
                  {selectedEntity.metadata?.kind === 'agent' && (
                    <div className="text-[10px] text-primary mt-1">
                      🤖 {selectedEntity.metadata.provider}/{selectedEntity.metadata.model}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEntityId(undefined)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Legend (top-right corner) */}
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur border border-border rounded-lg p-2 text-[10px] space-y-1">
            <div className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Filter className="size-3" /> Legend
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-indigo-500" /> <span className="text-foreground">Pipeline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> <span className="text-foreground">SOP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-violet-500" /> <span className="text-foreground">Agent</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
