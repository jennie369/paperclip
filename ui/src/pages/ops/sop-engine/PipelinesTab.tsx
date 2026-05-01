// Pipelines Tab — first tab in SOP Engine, default-open.
//
// Feature set (Phase 1 + 1.6-1.10):
//   • @dnd-kit drag-drop for pipelines AND blocks inside each pipeline
//   • Add Pipeline from template dropdown (8 templates, no blank form)
//   • Add Step from 208-SOP searchable combobox (no free-text)
//   • Nested SopStepsEditor — expanding a SOP block shows its 9-field steps
//   • Click anywhere on header row to expand (not just chevron)
//   • Undo delete via 8-second toast with "Hoàn tác" action
//   • Toast feedback on every copy/clone/delete
//   • Tooltips on every interactive element
//   • Semantic theme tokens (respects Paperclip light/dark mode)

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Copy,
  Trash2,
  FileJson,
  Zap,
} from 'lucide-react';
import {
  pipelineApi,
  listSopsForCombobox,
  type Pipeline,
  type PipelineBlock,
  type PipelineTemplateSummary,
  type SopSummary,
} from '@/api/sop-pipelines';
import { useToast } from '@/context/ToastContext';
import { useLiveInvalidate } from '@/hooks/useLiveInvalidate';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SopStepsEditor } from './SopStepsEditor';

// ═══════════════════════════════════════════════════════
// Tooltip wrapper — saves boilerplate at every call site
// ═══════════════════════════════════════════════════════

function Tip({ children, text, side = 'top' }: { children: React.ReactNode; text: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════
// Block chip (draggable inside a pipeline) — SOP blocks also expand
// to show the full 9-field workflow step editor inline.
// ═══════════════════════════════════════════════════════

function BlockChip({
  block,
  pipelineId,
  index,
  isExpanded,
  onToggleExpand,
  onRemove,
  onCopy,
}: {
  block: PipelineBlock;
  pipelineId: string;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const id = `${pipelineId}:${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'block', pipelineId, index },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const borderColor =
    block.type === 'sop'
      ? 'border-cyan-500/40'
      : block.type === 'approval'
        ? 'border-amber-500/40'
        : 'border-purple-500/40';
  const bgColor =
    block.type === 'sop'
      ? 'bg-cyan-500/5'
      : block.type === 'approval'
        ? 'bg-amber-500/5'
        : 'bg-purple-500/5';

  const isSop = block.type === 'sop';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-md border ${borderColor} ${bgColor} overflow-hidden`}
    >
      {/* Header row — clickable anywhere to expand (SOPs only) */}
      <div
        className={`flex items-start gap-2 px-3 py-2 text-xs ${isSop ? 'cursor-pointer hover:bg-foreground/5' : ''}`}
        onClick={isSop ? onToggleExpand : undefined}
      >
        <Tip text="Kéo để sắp xếp lại thứ tự bước trong pipeline">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Kéo để sắp xếp"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-3.5" />
          </button>
        </Tip>

        {isSop && (
          <Tip text={isExpanded ? 'Thu gọn các bước workflow của SOP này' : 'Mở rộng để xem toàn bộ 9-field workflow steps của SOP này'}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="mt-0.5 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          </Tip>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold text-cyan-500 dark:text-cyan-400 uppercase">{block.ref}</span>
            <span className="font-medium text-foreground">{block.label}</span>
          </div>
          {block.note && <div className="text-[11px] text-muted-foreground mt-0.5">{block.note}</div>}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            {block.executor && <span>👤 {block.executor}</span>}
            {block.trigger && <span>⏰ {block.trigger}</span>}
          </div>
        </div>

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Tip text="Copy block JSON vào clipboard">
            <button onClick={onCopy} className="p-1 hover:text-cyan-500 text-muted-foreground">
              <Copy className="size-3.5" />
            </button>
          </Tip>
          <Tip text="Xóa block (có thể hoàn tác trong 8 giây)">
            <button onClick={onRemove} className="p-1 hover:text-red-500 text-muted-foreground">
              <Trash2 className="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>

      {/* Nested SOP steps editor — only when expanded */}
      {isSop && isExpanded && (
        <div className="border-t border-border/50 bg-background/50 p-3">
          <SopStepsEditor sopId={block.ref} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Add Step dialog — dropdown of existing SOPs (no free-text for type=sop)
// ═══════════════════════════════════════════════════════

function AddStepDialog({
  open,
  onClose,
  onAdd,
  sops,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (block: PipelineBlock) => void;
  sops: SopSummary[];
}) {
  const [type, setType] = useState<'sop' | 'approval' | 'action'>('sop');
  const [search, setSearch] = useState('');
  const [selectedSop, setSelectedSop] = useState<SopSummary | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [executor, setExecutor] = useState('');
  const [trigger, setTrigger] = useState('');
  const [manualRef, setManualRef] = useState('');

  useEffect(() => {
    if (open) {
      setType('sop');
      setSearch('');
      setSelectedSop(null);
      setLabel('');
      setNote('');
      setExecutor('');
      setTrigger('');
      setManualRef('');
    }
  }, [open]);

  const filteredSops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sops.slice(0, 50);
    return sops
      .filter(
        (s) =>
          s.sop_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.domain.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [sops, search]);

  if (!open) return null;

  const handleAdd = () => {
    let block: PipelineBlock;
    if (type === 'sop') {
      if (!selectedSop) return;
      block = {
        type: 'sop',
        ref: selectedSop.sop_id,
        label: label || selectedSop.name,
        note: note || undefined,
        executor: executor || undefined,
        trigger: trigger || undefined,
      };
    } else {
      if (!manualRef || !label) return;
      block = {
        type,
        ref: manualRef,
        label,
        note: note || undefined,
        executor: executor || undefined,
        trigger: trigger || undefined,
      };
    }
    onAdd(block);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">➕ Thêm bước mới vào pipeline</h3>
          <Tip text="Đóng dialog">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
          </Tip>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loại bước</label>
            <div className="flex gap-2 mt-2">
              {(['sop', 'approval', 'action'] as const).map((t) => (
                <Tip
                  key={t}
                  text={
                    t === 'sop'
                      ? 'Tham chiếu 1 SOP đã có trong hệ thống (208 SOPs). Không tạo mới để tránh duplicate.'
                      : t === 'approval'
                        ? 'Chờ người phê duyệt (vd Jennie duyệt plan) trước khi pipeline chạy tiếp'
                        : 'Action không chuẩn hóa: webhook, cron trigger, external API call'
                  }
                >
                  <button
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      type === t
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:border-foreground'
                    }`}
                  >
                    {t === 'sop' ? '📋 SOP' : t === 'approval' ? '✋ Approval' : '⚡ Action'}
                  </button>
                </Tip>
              ))}
            </div>
            {type === 'sop' && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Chọn SOP từ danh sách 208 SOPs — không nhập tay để tránh duplicate.
              </p>
            )}
          </div>

          {type === 'sop' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tìm SOP <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Gõ tên hoặc SOP ID (vd: MKT-001, content, email)..."
                className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
                autoFocus
              />
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border bg-background">
                {filteredSops.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground text-center">Không tìm thấy SOP nào</div>
                )}
                {filteredSops.map((s) => (
                  <button
                    key={s.sop_id}
                    onClick={() => {
                      setSelectedSop(s);
                      if (!label) setLabel(s.name);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-muted transition-colors ${
                      selectedSop?.sop_id === s.sop_id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-cyan-500 dark:text-cyan-400">{s.sop_id}</span>
                      <span className="text-foreground">{s.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {s.domain} · {s.status} · {s.priority}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {type !== 'sop' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Reference ID <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder={type === 'approval' ? 'APPROVAL-JENNIE' : 'WEBHOOK-LEAD'}
                className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Label hiển thị <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Vd: Content Calendar Monthly"
              className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mô tả ngắn về bước này"
              rows={2}
              className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Executor</label>
              <input
                type="text"
                value={executor}
                onChange={(e) => setExecutor(e.target.value)}
                placeholder="Content Strategist / Jennie / Cron"
                className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trigger</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="Cron CN 20h / Manual / Sau SOP-XXX"
                className="mt-2 w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:border-ring outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Hủy
          </button>
          <button
            onClick={handleAdd}
            disabled={type === 'sop' ? !selectedSop : !manualRef || !label}
            className="px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-md font-medium transition-colors"
          >
            ➕ Thêm bước
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Pipeline card (draggable outer container)
// ═══════════════════════════════════════════════════════

function PipelineCard({
  pipeline,
  expanded,
  expandedBlocks,
  onToggle,
  onToggleBlock,
  onUpdateBlocks,
  onExecute,
  onClone,
  onDelete,
  onCopyJson,
  onAddStep,
  onCopyBlock,
  onRemoveBlock,
}: {
  pipeline: Pipeline;
  expanded: boolean;
  expandedBlocks: Record<number, boolean>;
  onToggle: () => void;
  onToggleBlock: (idx: number) => void;
  onUpdateBlocks: (id: string, blocks: PipelineBlock[]) => void;
  onExecute: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyJson: (pipeline: Pipeline) => void;
  onAddStep: (pipelineId: string) => void;
  onCopyBlock: (block: PipelineBlock) => void;
  onRemoveBlock: (pipelineId: string, idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pipeline.pipeline_id,
    data: { type: 'pipeline' },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = Number(String(active.id).split(':')[1]);
    const overIdx = Number(String(over.id).split(':')[1]);
    if (Number.isNaN(activeIdx) || Number.isNaN(overIdx)) return;
    const next = arrayMove(pipeline.blocks, activeIdx, overIdx);
    onUpdateBlocks(pipeline.pipeline_id, next);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group border border-border rounded-xl bg-card overflow-hidden"
    >
      {/* Clickable header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        <Tip text="Kéo để sắp xếp lại thứ tự pipeline">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Kéo pipeline"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-5" />
          </button>
        </Tip>

        <Tip text={expanded ? 'Thu gọn pipeline' : 'Mở rộng để xem các bước'}>
          <button
            className="text-muted-foreground hover:text-foreground mt-0.5"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {expanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </Tip>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{pipeline.emoji || '🔗'}</span>
            <h3 className="text-base font-semibold text-foreground truncate">{pipeline.title}</h3>
            {pipeline.is_template && (
              <Tip text="Đây là template có sẵn — không thể xóa, chỉ có thể clone">
                <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-primary/20 text-primary border border-primary/30">
                  Template
                </span>
              </Tip>
            )}
            <Tip text={`Phân loại: ${pipeline.category}`}>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-muted text-muted-foreground">
                {pipeline.category}
              </span>
            </Tip>
          </div>
          {pipeline.schedule && (
            <div className="text-[11px] text-muted-foreground mt-1">⏰ {pipeline.schedule}</div>
          )}
          <div className="text-[11px] text-muted-foreground">📦 {pipeline.blocks.length} bước</div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tip text="Chạy pipeline ngay qua SSE stream. Xem kết quả trong Phiên Agent.">
            <button
              onClick={() => onExecute(pipeline.pipeline_id)}
              className="p-1.5 rounded hover:bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <Play className="size-4" />
            </button>
          </Tip>
          <Tip text="Copy JSON đầy đủ của pipeline vào clipboard">
            <button
              onClick={() => onCopyJson(pipeline)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            >
              <FileJson className="size-4" />
            </button>
          </Tip>
          <Tip text="Clone pipeline này thành bản copy mới có thể chỉnh sửa">
            <button
              onClick={() => onClone(pipeline.pipeline_id)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            >
              <Copy className="size-4" />
            </button>
          </Tip>
          {!pipeline.is_template && (
            <Tip text="Xóa pipeline (có 8s để hoàn tác sau khi xóa)">
              <button
                onClick={() => onDelete(pipeline.pipeline_id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-red-600 dark:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </Tip>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {pipeline.description && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{pipeline.description}</p>
          )}

          <DndContext sensors={blockSensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
            <SortableContext
              items={pipeline.blocks.map((_, i) => `${pipeline.pipeline_id}:${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {pipeline.blocks.map((block, idx) => (
                  <BlockChip
                    key={`${pipeline.pipeline_id}:${idx}`}
                    block={block}
                    pipelineId={pipeline.pipeline_id}
                    index={idx}
                    isExpanded={!!expandedBlocks[idx]}
                    onToggleExpand={() => onToggleBlock(idx)}
                    onRemove={() => onRemoveBlock(pipeline.pipeline_id, idx)}
                    onCopy={() => onCopyBlock(block)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Tip text="Mở dialog chọn SOP từ 208 SOPs có sẵn (không nhập tay để tránh duplicate)">
            <button
              onClick={() => onAddStep(pipeline.pipeline_id)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="size-3.5" />
              Thêm bước mới (chọn từ 208 SOPs)
            </button>
          </Tip>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Pipelines Tab
// ═══════════════════════════════════════════════════════

export default function PipelinesTab() {
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  // Nested expand: pipelineId → { blockIdx → bool }
  const [expandedBlocksMap, setExpandedBlocksMap] = useState<Record<string, Record<number, boolean>>>({});
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [addStepPipelineId, setAddStepPipelineId] = useState<string | null>(null);

  // Undo-delete: keep a short-lived trash with the deleted row
  const undoTimerRef = useRef<number | null>(null);

  const pipelinesQuery = useQuery({
    queryKey: ['sop-engine', 'pipelines'],
    queryFn: () => pipelineApi.list(),
  });
  const templatesQuery = useQuery({
    queryKey: ['sop-engine', 'pipeline-templates'],
    queryFn: () => pipelineApi.listTemplates(),
  });
  const sopsQuery = useQuery({
    queryKey: ['sop-engine', 'sops-combobox'],
    queryFn: () => listSopsForCombobox(),
    staleTime: 60_000,
  });

  // Live: pipelines + executions auto-refresh khi DB thay đổi
  useLiveInvalidate({
    tables: ['gem_pipelines', 'gem_sop_executions'],
    queryKeys: [['sop-engine', 'pipelines'], ['sop-engine', 'pipeline-templates']],
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => pipelineApi.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sop-engine', 'pipelines'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => pipelineApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sop-engine', 'pipelines'] }),
  });
  const createMutation = useMutation({
    mutationFn: (body: { templateId?: string }) => pipelineApi.create(body),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['sop-engine', 'pipelines'] });
      pushToast({ title: '✅ Đã tạo pipeline', body: row.title, tone: 'success' });
    },
    onError: (err: Error) => pushToast({ title: 'Tạo pipeline thất bại', body: err.message, tone: 'error' }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pipelineApi.delete(id),
  });

  const pipelines = pipelinesQuery.data || [];
  const templates = templatesQuery.data || [];
  const sops = sopsQuery.data || [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handlePipelineDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = pipelines.findIndex((p) => p.pipeline_id === active.id);
      const newIdx = pipelines.findIndex((p) => p.pipeline_id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const next = arrayMove(pipelines, oldIdx, newIdx);
      qc.setQueryData(['sop-engine', 'pipelines'], next);
      reorderMutation.mutate(next.map((p) => p.pipeline_id));
    },
    [pipelines, qc, reorderMutation],
  );

  const toggleExpand = (id: string) => setExpandedMap((m) => ({ ...m, [id]: !m[id] }));
  const toggleBlockExpand = (pipelineId: string, idx: number) => {
    setExpandedBlocksMap((m) => ({
      ...m,
      [pipelineId]: { ...(m[pipelineId] || {}), [idx]: !(m[pipelineId]?.[idx]) },
    }));
  };
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const p of pipelines) all[p.pipeline_id] = true;
    setExpandedMap(all);
  };
  const collapseAll = () => setExpandedMap({});

  const handleExecute = (id: string) => {
    fetch(pipelineApi.executeUrl(id), { method: 'POST' }).catch(() => {});
    pushToast({
      title: '⚡ Pipeline started',
      body: `${id} đang chạy. Xem Phiên Agent để track.`,
      tone: 'info',
    });
  };

  const handleClone = (id: string) => {
    const source = pipelines.find((p) => p.pipeline_id === id);
    if (!source) return;
    createMutation.mutate({ templateId: source.parent_template_id || id });
  };

  const handleDelete = (id: string) => {
    const target = pipelines.find((p) => p.pipeline_id === id);
    if (!target) return;

    // Optimistic remove from UI
    const prev = pipelines;
    const next = pipelines.filter((p) => p.pipeline_id !== id);
    qc.setQueryData(['sop-engine', 'pipelines'], next);

    // Cancel any previous undo timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    // Show toast with undo — server delete only fires if undo not pressed
    let undone = false;
    pushToast({
      title: `🗑️ Đã xóa "${target.title}"`,
      body: 'Nhấp "Hoàn tác" trong 8 giây để khôi phục',
      tone: 'warn',
      ttlMs: 8000,
      action: { label: 'Hoàn tác', href: '#undo-' + id },
    });

    const onUndo = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest(`a[href="#undo-${id}"]`)) {
        undone = true;
        qc.setQueryData(['sop-engine', 'pipelines'], prev);
        pushToast({ title: '↩️ Đã hoàn tác', body: 'Pipeline được khôi phục.', tone: 'success' });
        document.removeEventListener('click', onUndo, true);
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
        }
      }
    };
    document.addEventListener('click', onUndo, true);

    undoTimerRef.current = window.setTimeout(async () => {
      document.removeEventListener('click', onUndo, true);
      if (undone) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err: any) {
        // restore
        qc.setQueryData(['sop-engine', 'pipelines'], prev);
        pushToast({ title: 'Xóa thất bại', body: err.message, tone: 'error' });
      }
    }, 8000);
  };

  const handleCopyJson = async (pipeline: Pipeline) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(pipeline, null, 2));
      pushToast({ title: '📋 Đã copy JSON', body: pipeline.title, tone: 'success' });
    } catch {
      pushToast({ title: 'Copy thất bại', body: 'Trình duyệt không cho phép ghi clipboard', tone: 'error' });
    }
  };

  const handleCopyBlock = async (block: PipelineBlock) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(block, null, 2));
      pushToast({ title: '📋 Đã copy block', body: `${block.ref} — ${block.label}`, tone: 'success' });
    } catch {
      pushToast({ title: 'Copy thất bại', tone: 'error' });
    }
  };

  const handleUpdateBlocks = (id: string, blocks: PipelineBlock[]) => {
    qc.setQueryData<Pipeline[]>(['sop-engine', 'pipelines'], (prev) =>
      (prev || []).map((p) => (p.pipeline_id === id ? { ...p, blocks } : p)),
    );
    updateMutation.mutate({ id, patch: { blocks } });
  };

  const handleRemoveBlock = (pipelineId: string, idx: number) => {
    const target = pipelines.find((p) => p.pipeline_id === pipelineId);
    if (!target) return;
    const prev = target.blocks;
    const removed = prev[idx];
    const next = prev.filter((_, i) => i !== idx);
    handleUpdateBlocks(pipelineId, next);

    pushToast({
      title: `🗑️ Đã xóa block "${removed.label}"`,
      body: 'Click "Hoàn tác" trong 8 giây',
      tone: 'warn',
      ttlMs: 8000,
      action: { label: 'Hoàn tác', href: `#undo-block-${pipelineId}-${idx}` },
    });
    const onUndo = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.closest(`a[href="#undo-block-${pipelineId}-${idx}"]`)) {
        handleUpdateBlocks(pipelineId, prev);
        document.removeEventListener('click', onUndo, true);
        pushToast({ title: '↩️ Đã hoàn tác', tone: 'success' });
      }
    };
    document.addEventListener('click', onUndo, true);
    setTimeout(() => document.removeEventListener('click', onUndo, true), 9000);
  };

  const handleAddStep = (pipelineId: string) => setAddStepPipelineId(pipelineId);

  const handleStepAdded = (block: PipelineBlock) => {
    if (!addStepPipelineId) return;
    const target = pipelines.find((p) => p.pipeline_id === addStepPipelineId);
    if (!target) return;
    const next = [...target.blocks, block];
    handleUpdateBlocks(addStepPipelineId, next);
    pushToast({ title: '✅ Đã thêm block', body: `${block.ref} — ${block.label}`, tone: 'success' });
  };

  const handleCreateFromTemplate = (templateId: string) => {
    createMutation.mutate({ templateId });
    setShowTemplateDropdown(false);
  };

  if (pipelinesQuery.isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Đang tải pipelines...</div>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            End-to-End Pipelines
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Kéo <GripVertical className="inline size-3" /> để sắp xếp. Click bất cứ đâu trên dòng để mở rộng.
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Tip text="Mở rộng tất cả pipeline cùng lúc">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 text-xs border border-border rounded hover:border-primary text-foreground hover:text-primary"
              >
                Mở tất cả
              </button>
            </Tip>
            <Tip text="Thu gọn tất cả pipeline">
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 text-xs border border-border rounded hover:border-primary text-foreground hover:text-primary"
              >
                Thu gọn
              </button>
            </Tip>

            <div className="relative">
              <Tip text="Tạo pipeline mới — chọn từ 8 template (Content Biweekly, Email Biweekly, Sales Lead→Close, Short Video, Onboarding, Retention, CTV, Launch)">
                <button
                  onClick={() => setShowTemplateDropdown((v) => !v)}
                  className="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Pipeline Mới
                </button>
              </Tip>
              {showTemplateDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-2xl z-10 max-h-96 overflow-y-auto"
                  onMouseLeave={() => setShowTemplateDropdown(false)}
                >
                  <div className="p-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                    Chọn template để clone
                  </div>
                  {templates.map((t) => (
                    <button
                      key={t.pipeline_id}
                      onClick={() => handleCreateFromTemplate(t.pipeline_id)}
                      className="w-full text-left p-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{t.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{t.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                      <div className="text-[10px] text-primary mt-1">
                        {t.category} · {t.block_count} bước
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      createMutation.mutate({});
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full p-3 text-center text-xs text-muted-foreground hover:bg-accent border-t border-border"
                  >
                    + Pipeline trống (tự build)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {pipelines.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-xl">
            <div className="text-4xl mb-3">🔗</div>
            <div className="text-sm text-foreground font-medium">Chưa có pipeline nào</div>
            <div className="text-xs text-muted-foreground mt-1">
              Bấm "Pipeline Mới" để chọn template (Content Biweekly, Email Biweekly, Sales Lead→Close, ...)
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePipelineDragEnd}>
            <SortableContext items={pipelines.map((p) => p.pipeline_id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {pipelines.map((p) => (
                  <PipelineCard
                    key={p.pipeline_id}
                    pipeline={p}
                    expanded={!!expandedMap[p.pipeline_id]}
                    expandedBlocks={expandedBlocksMap[p.pipeline_id] || {}}
                    onToggle={() => toggleExpand(p.pipeline_id)}
                    onToggleBlock={(idx) => toggleBlockExpand(p.pipeline_id, idx)}
                    onUpdateBlocks={handleUpdateBlocks}
                    onExecute={handleExecute}
                    onClone={handleClone}
                    onDelete={handleDelete}
                    onCopyJson={handleCopyJson}
                    onAddStep={handleAddStep}
                    onCopyBlock={handleCopyBlock}
                    onRemoveBlock={handleRemoveBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <AddStepDialog
          open={addStepPipelineId !== null}
          onClose={() => setAddStepPipelineId(null)}
          onAdd={handleStepAdded}
          sops={sops}
        />
      </div>
    </TooltipProvider>
  );
}
