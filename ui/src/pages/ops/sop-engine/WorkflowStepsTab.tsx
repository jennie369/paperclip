// Workflow Steps Tab — SOP picker v2 + standalone step editor.
//
// Picker (SopPicker.tsx) replaces the flat dropdown with a rich browser:
//   - Current selection card with "Đổi SOP"
//   - AI Smart Suggest (client-side keyword scoring)
//   - Quick Access grid (P0 SOPs for common flows)
//   - Accordion groups by domain with per-row preview (description, agents, related)
// Editor (SopStepsEditor.tsx) is unchanged — still loads steps for the selected SOP.

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Sparkles } from 'lucide-react';
import { SopPicker } from './SopPicker';
import { SopStepsEditor } from './SopStepsEditor';

export default function WorkflowStepsTab() {
  const [selectedSopId, setSelectedSopId] = useState<string>('');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 space-y-4">
        {/* Picker */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Workflow Steps Editor</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground cursor-help">ℹ️</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-md">
                Editor đầy đủ 9-field cho workflow steps của bất kỳ SOP nào. Dùng AI Smart Suggest
                hoặc chọn từ thư viện grouped → editor load bên dưới với drag-drop reorder + auto-save
                800ms debounce. Mọi field đều dropdown từ Registry SSOT.
              </TooltipContent>
            </Tooltip>
          </div>

          <SopPicker value={selectedSopId} onChange={setSelectedSopId} />

          {selectedSopId && (
            <div className="mt-3 text-[10px] text-muted-foreground">
              💡 Mẹo: Component cùng source với editor khi expand 1 SOP block trong tab Pipelines.
              Auto-save 800ms. Mọi thay đổi ghi vào gem_sops.steps JSONB.
            </div>
          )}
        </div>

        {/* Editor body */}
        {!selectedSopId ? (
          <div className="p-12 text-center border border-dashed border-border rounded-xl">
            <Sparkles className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-foreground font-medium">Chưa chọn SOP nào</div>
            <div className="text-xs text-muted-foreground mt-1">
              Dùng AI Smart Suggest hoặc chọn 1 SOP từ thư viện phía trên
            </div>
            <div className="text-[10px] text-muted-foreground mt-3 max-w-md mx-auto">
              161+ published SOPs — từ Content (CNT-*), Distribution (DST-*), Customer Service (CS-*),
              Sales (SAL-*), Operations (OPS-*), AI (AI-*), Analytics (ANA-*), v.v.
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <SopStepsEditor sopId={selectedSopId} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
