// SopStepsEditor — reusable 9-field workflow step editor for a single SOP.
//
// All fields are dropdowns sourced from the Registry SSOT (Phase 1.13):
//   Field 1 (Step Name)        — free text (name is user-defined label)
//   Field 2 (Executor Type)    — EXECUTOR_TYPES constant
//   Field 3 (Executor ID)      — paperclip_agents live fetch
//   Field 4 (Pre-Conditions)   — PRECONDITIONS constant (multi-select)
//   Field 5 (Inputs)           — INPUT_SOURCES + DB_TABLES
//   Field 6 (Command/Action)   — type-aware (script/URL/agent instructions)
//   Field 7 (Outputs)          — OUTPUT_DESTINATIONS + DB_TABLES
//   Field 8 (Trigger)          — TRIGGER_TYPES + CRON_EXPRESSIONS + linked cron_registry
//   Field 9 (Hooks)            — HOOKS constant (multi-select)
//
// If the option is not in the registry, user gets "+ Register in Marketplace"
// CTA instead of free-text input.
//
// Auto-save 800ms debounce. Drag-drop reorder. Undo delete with 8s toast.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/context/ToastContext';
import { RegistryCombobox } from './RegistryCombobox';
import {
  EXECUTOR_TYPES,
  PRECONDITIONS,
  HOOKS,
  TRIGGER_TYPES,
  CRON_EXPRESSIONS,
  DB_TABLES,
  INPUT_SOURCES,
  OUTPUT_DESTINATIONS,
  useAgentOptions,
  useCronOptions,
  type DropdownOption,
} from '@/api/registry-options';
import { StepComposer } from './StepComposer';

// ─── Types ────────────────────────────────────────────────────────────────

export type StepType = 'script' | 'approval' | 'api' | 'agent' | 'manual' | 'event';

export interface StepDefinition {
  order: number;
  name: string;
  type: StepType;
  executor?: string;
  agent?: string;
  preconditions?: string[];
  instructions?: string;
  description?: string;
  input?: {
    source?: string;
    tables?: string[];
    params?: Record<string, unknown>;
  };
  script?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body_template?: string;
  output?: {
    destination?: string;
    tables?: string[];
    format?: string;
  };
  trigger?: {
    type?: string;
    schedule?: string;
    event?: string;
    linked_cron_id?: string;
  };
  notification?: { channel?: string; message?: string };
  hooks?: string[];
  approver?: string;
  on_success?: string;
  on_failure?: string;
  cwd?: string;
}

interface SopDetail {
  sop_id: string;
  name: string;
  domain: string;
  status: string;
  steps: StepDefinition[];
}

// ─── API fetchers ────────────────────────────────────────────────────────

async function fetchSop(sopId: string): Promise<SopDetail | null> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}`);
  if (!res.ok) return null;
  const payload = await res.json();
  const sop = payload?.sop || payload;
  if (!sop || !sop.sop_id) return null;
  return {
    sop_id: sop.sop_id,
    name: sop.name,
    domain: sop.domain,
    status: sop.status,
    steps: Array.isArray(sop.steps) ? sop.steps : [],
  };
}

async function patchSopSteps(sopId: string, steps: StepDefinition[]): Promise<void> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Update failed');
  }
}

// ─── Tooltip helper ───────────────────────────────────────────────────────

function Tip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

// ─── Labeled field wrapper ───────────────────────────────────────────────

function Field({
  num,
  label,
  tooltip,
  children,
}: {
  num: number;
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tip text={tooltip}>
      <div>
        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {num} · {label}
        </label>
        {children}
      </div>
    </Tip>
  );
}

// ─── Step card (draggable, 9 fields) ──────────────────────────────────────

function StepCard({
  step,
  index,
  agentOptions,
  cronOptions,
  agentsLoading,
  cronsLoading,
  onUpdate,
  onDelete,
  onCopy,
  onNavigateToRegistry,
}: {
  step: StepDefinition;
  index: number;
  agentOptions: DropdownOption[];
  cronOptions: DropdownOption[];
  agentsLoading: boolean;
  cronsLoading: boolean;
  onUpdate: (patch: Partial<StepDefinition>) => void;
  onDelete: () => void;
  onCopy: () => void;
  onNavigateToRegistry: (target: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `step:${index}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeColors: Record<StepType, string> = {
    script: 'border-blue-500/40 bg-blue-500/5',
    agent: 'border-purple-500/40 bg-purple-500/5',
    api: 'border-green-500/40 bg-green-500/5',
    approval: 'border-amber-500/40 bg-amber-500/5',
    manual: 'border-orange-500/40 bg-orange-500/5',
    event: 'border-pink-500/40 bg-pink-500/5',
  };

  const executorTypeLabel =
    EXECUTOR_TYPES.find((t) => t.value === step.type)?.label || step.type;

  // Input/Output tables dropdown — same DB_TABLES with multi-select
  const inputTables = step.input?.tables || [];
  const outputTables = step.output?.tables || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border ${typeColors[step.type] || 'border-border'} bg-background/50`}
    >
      {/* Step header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <Tip text="Kéo để sắp xếp lại thứ tự bước trong SOP. Order tự cập nhật sau khi thả.">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        </Tip>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tip text="Số thứ tự bước trong SOP — tự động gán theo vị trí drag-drop">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-muted text-foreground">
              Step {index + 1}
            </span>
          </Tip>
          <Tip text={`Loại executor: ${executorTypeLabel}`}>
            <span className="px-2 py-0.5 text-[10px] uppercase rounded border border-border text-muted-foreground">
              {executorTypeLabel}
            </span>
          </Tip>
        </div>
        <div className="flex items-center gap-1">
          <Tip text="Copy JSON của step này vào clipboard">
            <button onClick={onCopy} className="p-1 text-muted-foreground hover:text-foreground">
              <Copy className="size-3.5" />
            </button>
          </Tip>
          <Tip text="Xóa step (có 8 giây để hoàn tác sau khi xóa)">
            <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>

      {/* 9 fields — all dropdown from registry */}
      <div className="p-3 space-y-3 text-xs">
        {/* Row 1: Step Name + Executor Type */}
        <div className="grid grid-cols-2 gap-3">
          <Field num={1} label="Step Name" tooltip="Field 1: Tên bước. Đặt rõ ý nghĩa. Ví dụ: 'Gửi email welcome cho user mới', 'Validate lead score'.">
            <input
              type="text"
              value={step.name || ''}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Tên bước..."
              className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none"
            />
          </Field>
          <Field num={2} label="Executor Type" tooltip="Field 2: Loại executor thực thi bước này — agent/script/api/approval/manual/event. Chọn từ Registry để thống nhất.">
            <RegistryCombobox
              options={EXECUTOR_TYPES}
              value={step.type}
              onChange={(v) => onUpdate({ type: v as StepType })}
              placeholder="Chọn loại executor..."
            />
          </Field>
        </div>

        {/* Row 2: Executor ID (agent slug from SSOT) */}
        <Field
          num={3}
          label="Executor ID / Agent Slug"
          tooltip="Field 3: ID cụ thể. Nếu type=agent → agent slug từ paperclip_agents SSOT. Nếu script → path file. Nếu approval → user slug. KHÔNG nhập tay để tránh duplicate."
        >
          {step.type === 'agent' ? (
            <RegistryCombobox
              options={agentOptions}
              value={step.agent || ''}
              onChange={(v) => onUpdate({ agent: v })}
              placeholder={agentsLoading ? 'Đang tải agents...' : 'Chọn agent từ paperclip_agents...'}
              isLoading={agentsLoading}
              onRegisterNew={() => onNavigateToRegistry('agents')}
              registerHint="Chưa có agent phù hợp? Tạo agent mới trong Registry Marketplace → Agents"
            />
          ) : step.type === 'script' ? (
            <input
              type="text"
              value={step.executor || ''}
              onChange={(e) => onUpdate({ executor: e.target.value })}
              placeholder="Path tới script (vd: scripts/batch_processor.py)"
              className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
            />
          ) : step.type === 'approval' || step.type === 'manual' ? (
            <RegistryCombobox
              options={[
                { value: 'jennie_chu', label: '👑 Jennie Chu', description: 'Owner — approve tất cả cấp' },
                { value: 'any_admin', label: '👤 Any admin', description: 'Bất kỳ admin nào' },
                { value: 'board_majority', label: '🏛️ Board majority', description: 'Cần 2/3 board approve' },
              ]}
              value={step.executor || ''}
              onChange={(v) => onUpdate({ executor: v })}
              placeholder="Chọn người approve..."
            />
          ) : (
            <input
              type="text"
              value={step.executor || ''}
              onChange={(e) => onUpdate({ executor: e.target.value })}
              placeholder="Executor ID / URL / event name"
              className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
            />
          )}
        </Field>

        {/* Row 3: Pre-Conditions (multi-select from registry) */}
        <Field
          num={4}
          label="Pre-Conditions"
          tooltip="Field 4: Điều kiện phải có TRƯỚC khi step chạy. Chọn 1 hoặc nhiều điều kiện chuẩn. Custom → Register vào Marketplace."
        >
          <RegistryCombobox
            multi
            options={PRECONDITIONS}
            value={step.preconditions || []}
            onChange={(v) => onUpdate({ preconditions: v })}
            placeholder="Chọn điều kiện tiên quyết..."
            onRegisterNew={() => onNavigateToRegistry('preconditions')}
            registerHint="Register pre-condition mới trong Registry → Hooks sub-tab"
          />
        </Field>

        {/* Row 4: Inputs — source type + tables (2 dropdowns) */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            num={5}
            label="Input Source"
            tooltip="Field 5a: Loại nguồn input — DB query / file / KB / API response / previous step output"
          >
            <RegistryCombobox
              options={INPUT_SOURCES}
              value={step.input?.source || ''}
              onChange={(v) => onUpdate({ input: { ...step.input, source: v } })}
              placeholder="Chọn nguồn input..."
            />
          </Field>
          <Field
            num={5}
            label="Input DB Tables"
            tooltip="Field 5b: Bảng DB để đọc data (multi-select). Nếu bảng chưa có trong registry → Register vào Marketplace trước."
          >
            <RegistryCombobox
              multi
              options={DB_TABLES}
              value={inputTables}
              onChange={(v) => onUpdate({ input: { ...step.input, tables: v } })}
              placeholder="Chọn DB tables..."
              onRegisterNew={() => onNavigateToRegistry('db-tables')}
              registerHint="Register DB table mới trong Registry → System sub-tab"
            />
          </Field>
        </div>

        {/* Row 5: Command/Action — type-aware */}
        <Field
          num={6}
          label="Command / Action"
          tooltip={
            step.type === 'script'
              ? 'Field 6: Shell command sẽ chạy. Vd: python scripts/batch_processor.py --batch'
              : step.type === 'api'
                ? 'Field 6: URL endpoint cho HTTP request'
                : 'Field 6: Instructions cho agent / mô tả action'
          }
        >
          <textarea
            value={step.script || step.url || step.instructions || ''}
            onChange={(e) => {
              const v = e.target.value;
              if (step.type === 'script') onUpdate({ script: v });
              else if (step.type === 'api') onUpdate({ url: v });
              else onUpdate({ instructions: v });
            }}
            rows={2}
            placeholder={
              step.type === 'script'
                ? 'python scripts/batch_processor.py --batch'
                : step.type === 'api'
                  ? 'https://api.example.com/endpoint'
                  : 'Agent instructions (natural language)...'
            }
            className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono resize-none"
          />
        </Field>

        {/* Row 6: Outputs — destination + tables */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            num={7}
            label="Output Destination"
            tooltip="Field 7a: Loại đầu ra — DB insert/update, file, channel, next step input, event, push, platform..."
          >
            <RegistryCombobox
              options={OUTPUT_DESTINATIONS}
              value={step.output?.destination || ''}
              onChange={(v) => onUpdate({ output: { ...step.output, destination: v } })}
              placeholder="Chọn loại output..."
            />
          </Field>
          <Field
            num={7}
            label="Output DB Tables"
            tooltip="Field 7b: Bảng DB để ghi kết quả (multi-select). Lấy từ Registry SSOT."
          >
            <RegistryCombobox
              multi
              options={DB_TABLES}
              value={outputTables}
              onChange={(v) => onUpdate({ output: { ...step.output, tables: v } })}
              placeholder="Chọn DB tables..."
              onRegisterNew={() => onNavigateToRegistry('db-tables')}
              registerHint="Register DB table mới trong Registry → System sub-tab"
            />
          </Field>
        </div>

        {/* Row 7: Trigger — type + schedule OR linked cron */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            num={8}
            label="Trigger Type"
            tooltip="Field 8a: Loại trigger — manual/cron/event/webhook/after-previous/queue-poll/db-trigger"
          >
            <RegistryCombobox
              options={TRIGGER_TYPES}
              value={step.trigger?.type || ''}
              onChange={(v) => onUpdate({ trigger: { ...step.trigger, type: v } })}
              placeholder="Chọn loại trigger..."
            />
          </Field>
          <Field
            num={8}
            label={step.trigger?.type === 'cron' ? 'Cron Schedule' : 'Trigger Value'}
            tooltip="Field 8b: Nếu type=cron → chọn cron expression pre-built hoặc link vào cron_registry job có sẵn. Nếu event → tên event name."
          >
            {step.trigger?.type === 'cron' ? (
              <RegistryCombobox
                options={[
                  ...CRON_EXPRESSIONS,
                  // Separator group: link to existing registered crons
                  ...cronOptions.map((c) => ({ ...c, category: '⚡ Linked từ cron_registry' })),
                ]}
                value={step.trigger?.schedule || ''}
                onChange={(v) => onUpdate({ trigger: { ...step.trigger, schedule: v } })}
                placeholder={cronsLoading ? 'Đang tải...' : 'Chọn cron expression hoặc job có sẵn...'}
                isLoading={cronsLoading}
                onRegisterNew={() => onNavigateToRegistry('crons')}
                registerHint="Register cron job mới trong Registry → Cron & Heartbeats sub-tab"
              />
            ) : (
              <input
                type="text"
                value={step.trigger?.event || ''}
                onChange={(e) =>
                  onUpdate({ trigger: { ...step.trigger, event: e.target.value } })
                }
                placeholder={
                  step.trigger?.type === 'webhook'
                    ? 'webhook-name'
                    : step.trigger?.type === 'event'
                      ? 'event_name'
                      : 'Trigger value...'
                }
                className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground focus:border-ring outline-none font-mono"
              />
            )}
          </Field>
        </div>

        {/* Row 8: Hooks (multi-select from registry) */}
        <Field
          num={9}
          label="Hooks (sau khi step xong)"
          tooltip="Field 9: Hành động sau khi step complete — notify, retry, escalate, write log, chain next SOP. Multi-select từ Registry."
        >
          <RegistryCombobox
            multi
            options={HOOKS}
            value={step.hooks || []}
            onChange={(v) => onUpdate({ hooks: v })}
            placeholder="Chọn hooks sau khi xong..."
            onRegisterNew={() => onNavigateToRegistry('hooks')}
            registerHint="Register hook mới trong Registry → Hooks sub-tab"
          />
        </Field>

        {/* Phase 10 — inline Composer when executor is an agent.
            Lets Jennie chat with the assigned agent directly from the
            step card without leaving SOP Engine. Stable session key per
            step so multi-turn conversations persist. */}
        {step.type === 'agent' && step.agent && (
          <StepComposer
            agentSlug={step.agent}
            stepId={`${index}`}
            stepLabel={step.name}
            defaultCollapsed={true}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────

export function SopStepsEditor({ sopId }: { sopId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const sopQuery = useQuery({
    queryKey: ['sop-engine', 'sop-detail', sopId],
    queryFn: () => fetchSop(sopId),
    enabled: !!sopId,
  });

  const { data: agentOptions = [], isLoading: agentsLoading } = useAgentOptions();
  const { data: cronOptions = [], isLoading: cronsLoading } = useCronOptions();

  // Debounced auto-save
  const pendingStepsRef = useRef<StepDefinition[] | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);

  const sop = sopQuery.data;
  const steps = sop?.steps || [];

  const scheduleSave = useCallback(
    (nextSteps: StepDefinition[]) => {
      pendingStepsRef.current = nextSteps;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        const payload = pendingStepsRef.current;
        pendingStepsRef.current = null;
        saveTimerRef.current = null;
        if (!payload) return;
        setSaving(true);
        try {
          await patchSopSteps(sopId, payload);
          qc.invalidateQueries({ queryKey: ['sop-engine', 'sop-detail', sopId] });
        } catch (err: any) {
          pushToast({ title: 'Auto-save failed', body: err.message, tone: 'error' });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [sopId, qc, pushToast],
  );

  const updateSteps = useCallback(
    (nextSteps: StepDefinition[]) => {
      qc.setQueryData<SopDetail>(['sop-engine', 'sop-detail', sopId], (prev) =>
        prev ? { ...prev, steps: nextSteps } : prev,
      );
      scheduleSave(nextSteps);
    },
    [qc, sopId, scheduleSave],
  );

  const handleFieldUpdate = (idx: number, patch: Partial<StepDefinition>) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch, order: i + 1 } : s));
    updateSteps(next);
  };

  const handleDelete = (idx: number) => {
    const prev = steps;
    const removed = prev[idx];
    const next = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    updateSteps(next);

    pushToast({
      title: `🗑️ Đã xóa step "${removed.name}"`,
      body: 'Click "Hoàn tác" trong 8 giây',
      tone: 'warn',
      ttlMs: 8000,
      action: { label: 'Hoàn tác', href: `#undo-step-${sopId}-${idx}` },
    });
    const onUndo = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.closest(`a[href="#undo-step-${sopId}-${idx}"]`)) {
        updateSteps(prev);
        document.removeEventListener('click', onUndo, true);
        pushToast({ title: '↩️ Đã hoàn tác', tone: 'success' });
      }
    };
    document.addEventListener('click', onUndo, true);
    setTimeout(() => document.removeEventListener('click', onUndo, true), 9000);
  };

  const handleCopy = async (step: StepDefinition) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(step, null, 2));
      pushToast({ title: '📋 Đã copy step', body: step.name, tone: 'success' });
    } catch {
      pushToast({ title: 'Copy thất bại', tone: 'error' });
    }
  };

  const handleAdd = () => {
    const next: StepDefinition[] = [
      ...steps,
      {
        order: steps.length + 1,
        name: `Step ${steps.length + 1}`,
        type: 'agent',
      },
    ];
    updateSteps(next);
    pushToast({ title: '➕ Đã thêm step mới', tone: 'success' });
  };

  const handleNavigateToRegistry = (target: string) => {
    pushToast({
      title: '🚧 Registry Marketplace',
      body: `Sub-tab "${target}" sẽ được build trong Phase 3. Tạm thời dùng options có sẵn.`,
      tone: 'info',
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = Number(String(active.id).split(':')[1]);
    const overIdx = Number(String(over.id).split(':')[1]);
    if (Number.isNaN(activeIdx) || Number.isNaN(overIdx)) return;
    const next = arrayMove(steps, activeIdx, overIdx).map((s, i) => ({ ...s, order: i + 1 }));
    updateSteps(next);
  };

  if (sopQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Đang tải steps của {sopId}...
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-destructive">
        <AlertCircle className="size-3" />
        Không tìm thấy SOP {sopId} trong gem_sops. Có thể SOP này chưa được seed.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div>
          <span className="font-semibold">{sop.sop_id}</span> · {sop.name} · {steps.length} bước
          {saving && <span className="ml-2 text-primary">• Đang lưu...</span>}
        </div>
        <Tip text="Auto-sync bật — mọi thay đổi tự động lưu sau 800ms. Tất cả dropdown lấy từ Registry SSOT.">
          <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
            ● Auto-sync · SSOT
          </span>
        </Tip>
      </div>

      {steps.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">
          SOP này chưa có step nào. Bấm "+ Thêm step" để tạo.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((_, i) => `step:${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <StepCard
                  key={`step:${idx}`}
                  step={step}
                  index={idx}
                  agentOptions={agentOptions}
                  cronOptions={cronOptions}
                  agentsLoading={agentsLoading}
                  cronsLoading={cronsLoading}
                  onUpdate={(patch) => handleFieldUpdate(idx, patch)}
                  onDelete={() => handleDelete(idx)}
                  onCopy={() => handleCopy(step)}
                  onNavigateToRegistry={handleNavigateToRegistry}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Tip text="Thêm 1 step mới vào cuối SOP với type=agent mặc định. Chỉnh sửa field sau.">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border border-dashed border-border rounded hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="size-3.5" />
          Thêm step mới
        </button>
      </Tip>
    </div>
  );
}
