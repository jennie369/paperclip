// Agent Status Grid — top 6 agents with stats + sparkline activity

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Bot } from "lucide-react";
import { PulseDot } from "./PulseDot";
import { Sparkline } from "./Sparkline";

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  idle: "bg-blue-400",
  paused: "bg-yellow-500",
  inactive: "bg-gray-400",
  error: "bg-red-500",
};

// Generate a deterministic sparkline from agent slug as seed (fallback when no real data)
function generateSparkData(slug: string, status: string): number[] {
  let seed = 0;
  for (let i = 0; i < slug.length; i++) seed += slug.charCodeAt(i);
  const base = status === "active" ? 8 : status === "idle" ? 2 : 0;
  return Array.from({ length: 24 }, (_, i) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return Math.max(0, base + (seed % 12) - 3);
  });
}

const sparkColors: Record<string, string> = {
  active: "#22C55E",
  idle: "#60A5FA",
  paused: "#EAB308",
  inactive: "#9CA3AF",
  error: "#EF4444",
};

export function AgentStatusGrid() {
  const navigate = useNavigate();
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const res = await fetch("/api/channels/agent-configs");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  // Fetch per-agent activity sparkline data (24h, hourly buckets)
  const { data: activityMap = {} } = useQuery<Record<string, number[]>>({
    queryKey: ["agents-activity-spark"],
    queryFn: async () => {
      const res = await fetch("/api/channels/agent-activity-spark");
      if (!res.ok) return {};
      const data = await res.json();
      return typeof data === "object" && data !== null ? data : {};
    },
    staleTime: 60_000,
    retry: false,
  });

  const topAgents = agents.slice(0, 6);
  const totalAgents = agents.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Agents</h3>
        {totalAgents > 6 && (
          <button onClick={() => navigate("/agents-config")} className="text-xs text-primary hover:underline">
            Xem tất cả ({totalAgents})
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {topAgents.map((agent: any) => (
          <button
            key={agent.slug}
            onClick={() => navigate(`/agents-config/${agent.slug}/edit`)}
            className="p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <span className="text-xs font-medium truncate">{agent.display_name || agent.slug}</span>
            </div>
            <div className="flex items-center justify-between gap-1 mt-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <PulseDot color={statusColors[agent.status] || "bg-gray-400"} />
                <span>{agent.status || "idle"}</span>
              </div>
              <Sparkline
                data={activityMap[agent.slug] ?? generateSparkData(agent.slug, agent.status || "idle")}
                color={sparkColors[agent.status] || "#9CA3AF"}
                width={56}
                height={18}
              />
            </div>
            {agent.provider && (
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {agent.provider} · {agent.model || "default"}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
