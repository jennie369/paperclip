// Agent Roster — grid view of all agents with status, model, last active
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Bot,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "@/lib/router";

export function AgentRosterPage() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agent-configs"],
    queryFn: async () => {
      const res = await fetch("/api/channels/agent-configs");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.agents || [];
    },
    staleTime: 30_000,
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Agent Roster
        </h1>
        <span className="text-sm text-muted-foreground">
          {(agents || []).length} agents
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(agents || []).map((agent: any) => (
            <Card
              key={agent.id || agent.slug}
              className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
              onClick={() =>
                navigate(`/agents-config/${agent.slug || agent.id}/edit`)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {agent.display_name || agent.name || agent.slug}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {agent.role || agent.slug}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-green-500" : "bg-zinc-400"}`}
                  />
                  {agent.status || "active"}
                </div>
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {agent.model_name || agent.adapter_type || "claude"}
                </div>
                {agent.last_active_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(agent.last_active_at).toLocaleDateString("vi")}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (agents || []).length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Bot className="h-10 w-10 opacity-40" />
          <p className="text-sm">Chưa có agent nào.</p>
        </div>
      )}
    </div>
  );
}
