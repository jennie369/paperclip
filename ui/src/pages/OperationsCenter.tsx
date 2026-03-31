// Operations Center — Main dashboard replacing default Dashboard
// Phase 7: Channel status + Agent grid + CRM pipeline + Activity feed + Capabilities

import { ChannelStatusCards } from "@/components/ops/ChannelStatusCards";
import { AgentStatusGrid } from "@/components/ops/AgentStatusGrid";
import { CRMPipelineCard } from "@/components/ops/CRMPipelineCard";
import { ActivityFeed } from "@/components/ops/ActivityFeed";
import { CapabilitiesGrid } from "@/components/ops/CapabilitiesGrid";

export function OperationsCenter() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Operations Center</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Tổng quan hệ thống Gemral</p>
      </div>

      {/* Row 1: Channels + Agents */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <ChannelStatusCards />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <AgentStatusGrid />
        </div>
      </div>

      {/* Row 2: CRM Pipeline + Activity Feed */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-xl border bg-card p-4">
          <CRMPipelineCard />
        </div>
        <div className="col-span-2 rounded-xl border bg-card p-4">
          <ActivityFeed />
        </div>
      </div>

      {/* Row 3: Capabilities */}
      <div className="rounded-xl border bg-card p-4">
        <CapabilitiesGrid />
      </div>
    </div>
  );
}
