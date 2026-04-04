import { useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Pencil,
  Clock,
  Terminal,
  Bot,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronDown,
  ChevronRight,
  Play,
  SkipForward,
  ShieldCheck,
  Globe,
  Wrench,
  Zap,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

export interface StepDefinition {
  order: number;
  name: string;
  type: "script" | "approval" | "api" | "agent" | "manual" | "event";
  executor?: string;
  cwd?: string;
  agent?: string;
  input?: { source?: string; params?: Record<string, unknown> };
  output?: { destination?: string; format?: string };
  approval_gate?: boolean;
  on_success?: string;
  on_failure?: string;
  estimated_minutes?: number | null;
}

export interface SopStepCardProps {
  step: StepDefinition;
  stepIndex: number;
  sopId: string;
  executionStatus?: string;
  editable: boolean;
  onUpdate: (stepIndex: number, updates: Partial<StepDefinition>) => void;
  onExecuteSingle: (stepIndex: number) => void;
  onDelete: (stepIndex: number) => void;
  onMoveUp: (stepIndex: number) => void;
  onMoveDown: (stepIndex: number) => void;
}

/* ─── Type config ─── */

const TYPE_CONFIG: Record<
  StepDefinition["type"],
  { label: string; icon: typeof Terminal; colorClass: string }
> = {
  script: {
    label: "Script",
    icon: Terminal,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  approval: {
    label: "Phê duyệt",
    icon: ShieldCheck,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  api: {
    label: "API",
    icon: Globe,
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  manual: {
    label: "Thủ công",
    icon: Wrench,
    colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
  event: {
    label: "Sự kiện",
    icon: Zap,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Chờ", variant: "secondary" },
  running: { label: "Đang chạy", variant: "default" },
  completed: { label: "Xong", variant: "secondary" },
  failed: { label: "Lỗi", variant: "destructive" },
  skipped: { label: "Bỏ qua", variant: "outline" },
  waiting: { label: "Chờ duyệt", variant: "outline" },
};

const ON_RESULT_OPTIONS = [
  { value: "", label: "-- Mặc định --" },
  { value: "continue", label: "Tiếp tục" },
  { value: "stop", label: "Dừng" },
  { value: "retry", label: "Thử lại" },
  { value: "skip", label: "Bỏ qua" },
  { value: "alert", label: "Cảnh báo" },
];

/* ─── Component ─── */

export function SopStepCard({
  step,
  stepIndex,
  sopId,
  executionStatus,
  editable,
  onUpdate,
  onExecuteSingle,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SopStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<StepDefinition>>({});

  const typeCfg = TYPE_CONFIG[step.type] ?? TYPE_CONFIG.script;
  const TypeIcon = typeCfg.icon;
  const statusCfg = executionStatus
    ? STATUS_CONFIG[executionStatus] ?? STATUS_CONFIG.pending
    : null;

  const getVal = useCallback(
    <K extends keyof StepDefinition>(key: K): StepDefinition[K] => {
      return (draft[key] !== undefined ? draft[key] : step[key]) as StepDefinition[K];
    },
    [draft, step],
  );

  const setVal = useCallback(
    <K extends keyof StepDefinition>(key: K, value: StepDefinition[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (Object.keys(draft).length > 0) {
      onUpdate(stepIndex, draft);
    }
    setIsEditing(false);
    setDraft({});
  }, [draft, stepIndex, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft({});
  }, []);

  const toggleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditing) {
        handleCancelEdit();
      } else {
        setIsEditing(true);
        setExpanded(true);
      }
    },
    [isEditing, handleCancelEdit],
  );

  return (
    <Card
      className={cn(
        "py-0 gap-0 border transition-all",
        executionStatus === "running" && "ring-2 ring-blue-500/30",
        executionStatus === "failed" && "ring-2 ring-red-500/30",
        executionStatus === "waiting" && "ring-2 ring-amber-500/30",
      )}
    >
      {/* ─── Header ─── */}
      <button
        className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        <span className="text-xs font-mono text-muted-foreground shrink-0 w-6">
          {String(step.order).padStart(2, "0")}
        </span>

        <span className="text-sm font-medium flex-1 truncate">{step.name}</span>

        {/* Type badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            typeCfg.colorClass,
          )}
        >
          <TypeIcon className="h-2.5 w-2.5" />
          {typeCfg.label}
        </span>

        {/* Status badge */}
        {statusCfg && (
          <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0 gap-1">
            {executionStatus === "running" && (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            )}
            {statusCfg.label}
          </Badge>
        )}

        {/* Header action buttons */}
        <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onMoveUp(stepIndex); }}
            title="Di chuyển lên"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onMoveDown(stepIndex); }}
            title="Di chuyển xuống"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          {editable && (
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn("text-muted-foreground", isEditing && "text-primary")}
              onClick={toggleEdit}
              title="Chỉnh sửa"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(stepIndex); }}
            title="Xoá bước"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </button>

      {/* ─── Expanded content ─── */}
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 space-y-3 border-t border-border/50">
          {/* Estimated time */}
          {step.estimated_minutes != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Ước tính: {step.estimated_minutes} phút
            </div>
          )}

          {/* Type-specific body */}
          <TypeBody
            step={step}
            isEditing={isEditing}
            getVal={getVal}
            setVal={setVal}
            executionStatus={executionStatus}
          />

          {/* Shared: on_success / on_failure (for script/api/agent types) */}
          {(step.type === "script" || step.type === "api" || step.type === "agent") && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Khi thành công
                </div>
                {isEditing ? (
                  <NativeSelect
                    value={(getVal("on_success") as string) ?? ""}
                    onChange={(v) => setVal("on_success", v)}
                    options={ON_RESULT_OPTIONS}
                  />
                ) : (
                  <span className="text-foreground">{step.on_success || "Tiếp tục"}</span>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  Khi thất bại
                </div>
                {isEditing ? (
                  <NativeSelect
                    value={(getVal("on_failure") as string) ?? ""}
                    onChange={(v) => setVal("on_failure", v)}
                    options={ON_RESULT_OPTIONS}
                  />
                ) : (
                  <span className="text-foreground">{step.on_failure || "Dừng"}</span>
                )}
              </div>
            </div>
          )}

          {/* Edit save/cancel */}
          {isEditing && (
            <div className="flex gap-2 pt-1">
              <Button size="xs" onClick={handleSave}>
                Lưu thay đổi
              </Button>
              <Button size="xs" variant="outline" onClick={handleCancelEdit}>
                Huỷ
              </Button>
            </div>
          )}

          {/* Actions footer */}
          <div className="flex gap-2 pt-1 border-t border-border/50">
            <Button
              size="xs"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onExecuteSingle(stepIndex)}
            >
              <Play className="h-3 w-3 mr-1" />
              Chạy step
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onUpdate(stepIndex, { on_success: "skip" })}
            >
              <SkipForward className="h-3 w-3 mr-1" />
              Bỏ qua
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Type-specific body components ─── */

function TypeBody({
  step,
  isEditing,
  getVal,
  setVal,
  executionStatus,
}: {
  step: StepDefinition;
  isEditing: boolean;
  getVal: <K extends keyof StepDefinition>(key: K) => StepDefinition[K];
  setVal: <K extends keyof StepDefinition>(key: K, value: StepDefinition[K]) => void;
  executionStatus?: string;
}) {
  switch (step.type) {
    case "script":
      return <ScriptBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />;
    case "approval":
      return <ApprovalBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} executionStatus={executionStatus} />;
    case "api":
      return <ApiBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />;
    case "agent":
      return <AgentBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />;
    case "manual":
      return <ManualBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} executionStatus={executionStatus} />;
    case "event":
      return <EventBody step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />;
    default:
      return null;
  }
}

/* ─── Script body ─── */

function ScriptBody({
  step,
  isEditing,
  getVal,
  setVal,
}: TypeBodyProps) {
  return (
    <div className="space-y-2 text-xs">
      <FieldRow
        icon={Terminal}
        label="Executor"
        value={(getVal("executor") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("executor", v)}
        mono
      />
      <FieldRow
        icon={FolderOpen}
        label="Thư mục"
        value={(getVal("cwd") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("cwd", v)}
        mono
      />
      {/* Input/Output config */}
      <IOConfig step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />
    </div>
  );
}

/* ─── Approval body ─── */

function ApprovalBody({
  step,
  isEditing,
  getVal,
  setVal,
  executionStatus,
}: TypeBodyProps & { executionStatus?: string }) {
  return (
    <div className="space-y-2 text-xs">
      <FieldRow
        icon={ShieldCheck}
        label="Người duyệt"
        value={(getVal("agent") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("agent", v)}
      />
      {executionStatus === "waiting" && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-2">
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Đang chờ phê duyệt
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── API body ─── */

function ApiBody({
  step,
  isEditing,
  getVal,
  setVal,
}: TypeBodyProps) {
  const input = getVal("input") as StepDefinition["input"];
  const [method, setMethod] = useState(
    (input?.params as Record<string, string>)?.method ?? "GET",
  );
  const [endpoint, setEndpoint] = useState(
    (input?.params as Record<string, string>)?.endpoint ?? "",
  );
  const [requestBody, setRequestBody] = useState(
    (input?.params as Record<string, string>)?.body ?? "",
  );

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2 items-center">
        <div className="w-20">
          {isEditing ? (
            <NativeSelect
              value={method}
              onChange={(v) => {
                setMethod(v);
                setVal("input", { ...input, params: { ...(input?.params ?? {}), method: v } });
              }}
              options={[
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
                { value: "PUT", label: "PUT" },
                { value: "DELETE", label: "DELETE" },
                { value: "PATCH", label: "PATCH" },
              ]}
            />
          ) : (
            <Badge variant="outline" className="font-mono text-[10px]">
              {method}
            </Badge>
          )}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <Input
              className="h-7 text-xs font-mono"
              placeholder="https://api.example.com/path"
              value={endpoint}
              onChange={(e) => {
                setEndpoint(e.target.value);
                setVal("input", { ...input, params: { ...(input?.params ?? {}), endpoint: e.target.value } });
              }}
            />
          ) : (
            <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] truncate">
              {endpoint || "Chưa cấu hình"}
            </code>
          )}
        </div>
      </div>

      {/* Request body */}
      {(isEditing || requestBody) && (
        <div>
          <div className="text-muted-foreground mb-1">Request body</div>
          {isEditing ? (
            <Textarea
              className="min-h-[60px] text-xs font-mono"
              placeholder='{"key": "value"}'
              value={requestBody}
              onChange={(e) => {
                setRequestBody(e.target.value);
                setVal("input", { ...input, params: { ...(input?.params ?? {}), body: e.target.value } });
              }}
            />
          ) : (
            <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
              {requestBody}
            </code>
          )}
        </div>
      )}

      <IOConfig step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />
    </div>
  );
}

/* ─── Agent body ─── */

function AgentBody({
  step,
  isEditing,
  getVal,
  setVal,
}: TypeBodyProps) {
  return (
    <div className="space-y-2 text-xs">
      <FieldRow
        icon={Bot}
        label="Agent"
        value={(getVal("agent") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("agent", v)}
      />
      {/* Task description via executor as description placeholder */}
      <FieldRow
        icon={Terminal}
        label="Tác vụ"
        value={(getVal("executor") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("executor", v)}
      />
      <IOConfig step={step} isEditing={isEditing} getVal={getVal} setVal={setVal} />
    </div>
  );
}

/* ─── Manual body ─── */

function ManualBody({
  step,
  isEditing,
  getVal,
  setVal,
  executionStatus,
}: TypeBodyProps & { executionStatus?: string }) {
  const [instructions, setInstructions] = useState(
    (getVal("executor") as string) ?? "",
  );

  return (
    <div className="space-y-2 text-xs">
      <FieldRow
        icon={Bot}
        label="Người thực hiện"
        value={(getVal("agent") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("agent", v)}
      />
      <div>
        <div className="text-muted-foreground mb-1">Hướng dẫn thực hiện</div>
        {isEditing ? (
          <Textarea
            className="min-h-[60px] text-xs"
            placeholder="Mô tả các bước cần làm..."
            value={instructions}
            onChange={(e) => {
              setInstructions(e.target.value);
              setVal("executor", e.target.value);
            }}
          />
        ) : (
          <div className="bg-muted/50 rounded px-2 py-1 text-[11px] whitespace-pre-wrap">
            {instructions || "Chưa có hướng dẫn"}
          </div>
        )}
      </div>
      {executionStatus === "running" && (
        <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Đánh dấu hoàn thành
        </Button>
      )}
    </div>
  );
}

/* ─── Event body ─── */

function EventBody({
  step,
  isEditing,
  getVal,
  setVal,
}: TypeBodyProps) {
  return (
    <div className="space-y-2 text-xs">
      <FieldRow
        icon={Zap}
        label="Tên sự kiện"
        value={(getVal("executor") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("executor", v)}
      />
      {/* Description */}
      {((getVal("cwd") as string) || isEditing) && (
        <FieldRow
          icon={FolderOpen}
          label="Mô tả"
          value={(getVal("cwd") as string) ?? ""}
          editing={isEditing}
          onChange={(v) => setVal("cwd", v)}
        />
      )}
      <Button size="xs" variant="outline">
        <Zap className="h-3 w-3 mr-1" />
        Kích hoạt thủ công
      </Button>
    </div>
  );
}

/* ─── Shared IO Config ─── */

function IOConfig({
  step,
  isEditing,
  getVal,
  setVal,
}: TypeBodyProps) {
  const input = getVal("input") as StepDefinition["input"];
  const output = getVal("output") as StepDefinition["output"];

  if (!input?.source && !output?.destination && !isEditing) return null;

  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      {(input?.source || isEditing) && (
        <div>
          <div className="text-muted-foreground mb-1">Đầu vào</div>
          {isEditing ? (
            <Input
              className="h-7 text-xs font-mono"
              value={input?.source ?? ""}
              onChange={(e) =>
                setVal("input", { ...input, source: e.target.value })
              }
            />
          ) : (
            <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] break-all">
              {input?.source}
            </code>
          )}
        </div>
      )}
      {(output?.destination || isEditing) && (
        <div>
          <div className="text-muted-foreground mb-1">Đầu ra</div>
          {isEditing ? (
            <Input
              className="h-7 text-xs font-mono"
              value={output?.destination ?? ""}
              onChange={(e) =>
                setVal("output", { ...output, destination: e.target.value })
              }
            />
          ) : (
            <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] break-all">
              {output?.destination}
            </code>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ─── */

interface TypeBodyProps {
  step: StepDefinition;
  isEditing: boolean;
  getVal: <K extends keyof StepDefinition>(key: K) => StepDefinition[K];
  setVal: <K extends keyof StepDefinition>(key: K, value: StepDefinition[K]) => void;
}

function FieldRow({
  icon: Icon,
  label,
  value,
  editing,
  onChange,
  mono = false,
}: {
  icon: typeof Terminal;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      {editing ? (
        <Input
          className={cn("h-6 text-xs flex-1", mono && "font-mono")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span className={cn("text-foreground truncate", mono && "font-mono text-[11px]")}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/50 w-full"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
