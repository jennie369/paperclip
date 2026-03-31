import { Check } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  slug: string;
}

interface RoomMembersSelectProps {
  agents: Agent[];
  selectedAgents: string[];
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
}

export function RoomMembersSelect({ agents, selectedAgents, onToggle, onSelectAll }: RoomMembersSelectProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-muted-foreground">Agents tham gia</label>
        <button
          onClick={onSelectAll}
          className="text-[10px] text-primary hover:underline bg-transparent border-none cursor-pointer"
        >
          Chọn tất cả
        </button>
      </div>
      <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Chưa có agents</div>
        ) : (
          agents.map((agent) => {
            const selected = selectedAgents.includes(agent.slug);
            return (
              <button
                key={agent.slug}
                onClick={() => onToggle(agent.slug)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors cursor-pointer bg-transparent border-none text-left text-foreground ${
                  selected ? "bg-primary/5" : ""
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selected ? "bg-primary border-primary" : "border-border"
                }`}>
                  {selected && <Check size={10} className="text-white" />}
                </div>
                <span>{agent.name}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        Đã chọn: {selectedAgents.length}/{agents.length} agents
      </div>
    </div>
  );
}
