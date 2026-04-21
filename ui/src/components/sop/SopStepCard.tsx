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
  Bell,
  Send,
  FileText,
  Calendar,
  MessageSquare,
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
  instructions?: string;        // Agent/manual step instruction
  description?: string;         // Human-readable description
  script?: string;              // Script step: shell command
  url?: string;                 // API step: endpoint URL
  method?: string;              // API step: HTTP method
  headers?: Record<string, string>;  // API step: request headers
  body_template?: string;       // API step: request body template
  input?: { source?: string; params?: Record<string, unknown> };
  output?: { destination?: string; format?: string };
  approval_gate?: boolean;
  on_success?: string;
  on_failure?: string;
  estimated_minutes?: number | null;
  trigger?: { type?: string; schedule?: string; event?: string };
  notification?: { channel?: string; message?: string };
  approver?: string;
  on_approve?: string;
  on_reject?: string;
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

/* ─── Helpers ─── */

function parseCron(cron?: string): string {
  if (!cron) return "";
  const map: Record<string, string> = {
    "0 20 * * 0": "Chủ Nhật 20:00",
    "0 6 * * 1": "Thứ 2 06:00",
    "0 7 * * *": "Hàng ngày 07:00",
    "0 8 * * *": "Hàng ngày 08:00",
    "*/15 * * * *": "Mỗi 15 phút",
    "0 14 * * 4": "Thứ 5 14:00",
    "0 */6 * * *": "Mỗi 6 giờ",
    "0 0 * * *": "Hàng ngày 00:00",
    "0 12 * * *": "Hàng ngày 12:00",
    "0 9 * * 1-5": "Ngày làm việc 09:00",
    "0 0 1 * *": "Đầu tháng 00:00",
  };
  return map[cron] || cron;
}

/* ─── Type config ─── */

const TYPE_CONFIG: Record<
  StepDefinition["type"],
  { label: string; icon: typeof Terminal; colorClass: string; tooltip: string }
> = {
  script: {
    label: "Script",
    icon: Terminal,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    tooltip: "Chạy script tự động",
  },
  approval: {
    label: "Phê duyệt",
    icon: ShieldCheck,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    tooltip: "Cần phê duyệt thủ công",
  },
  api: {
    label: "API",
    icon: Globe,
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    tooltip: "Gọi API bên ngoài",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    tooltip: "Agent AI thực hiện",
  },
  manual: {
    label: "Thủ công",
    icon: Wrench,
    colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    tooltip: "Thực hiện thủ công bởi người",
  },
  event: {
    label: "Sự kiện",
    icon: Zap,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    tooltip: "Kích hoạt bởi sự kiện",
  },
};

const TYPE_OPTIONS: { value: StepDefinition["type"]; label: string }[] = [
  { value: "script", label: "Script" },
  { value: "approval", label: "Phê duyệt" },
  { value: "api", label: "API" },
  { value: "agent", label: "Agent" },
  { value: "manual", label: "Thủ công" },
  { value: "event", label: "Sự kiện" },
];

const AGENT_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "ceo", label: "CEO" },
  { value: "sales-closer", label: "Sales Closer" },
  { value: "customer-success", label: "Customer Success" },
  { value: "content-strategist", label: "Content Strategist" },
  { value: "community-engagement", label: "Community Engagement" },
  { value: "board", label: "Board" },
  { value: "any", label: "Bất kỳ" },
];

const NOTIFICATION_OPTIONS = [
  { value: "", label: "Không thông báo" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
];

const TRIGGER_TYPE_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "event", label: "Sự kiện" },
  { value: "webhook", label: "Webhook" },
  { value: "db_trigger", label: "Database trigger" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Chờ", variant: "secondary" },
  running: { label: "Đang chạy", variant: "default" },
  completed: { label: "Xong", variant: "secondary" },
  failed: { label: "Lỗi", variant: "destructive" },
  skipped: { label: "Bỏ qua", variant: "outline" },
  waiting: { label: "Chờ duyệt", variant: "outline" },
};

const ON_SUCCESS_OPTIONS = [
  { value: "", label: "-- Mặc định --" },
  { value: "next", label: "Tiếp bước kế" },
  { value: "end", label: "Kết thúc" },
  { value: "goto:1", label: "Nhảy đến bước 1" },
  { value: "goto:2", label: "Nhảy đến bước 2" },
  { value: "goto:3", label: "Nhảy đến bước 3" },
  { value: "goto:4", label: "Nhảy đến bước 4" },
  { value: "goto:5", label: "Nhảy đến bước 5" },
];

const ON_FAILURE_OPTIONS = [
  { value: "", label: "-- Mặc định --" },
  { value: "retry:1", label: "Thử lại 1 lần" },
  { value: "retry:2", label: "Thử lại 2 lần" },
  { value: "retry:3", label: "Thử lại 3 lần" },
  { value: "skip", label: "Bỏ qua" },
  { value: "abort", label: "Dừng toàn bộ" },
  { value: "notify:telegram", label: "Thông báo Telegram" },
  { value: "goto:1", label: "Nhảy đến bước 1" },
  { value: "goto:2", label: "Nhảy đến bước 2" },
  { value: "goto:3", label: "Nhảy đến bước 3" },
];

const ON_APPROVE_OPTIONS = [
  { value: "", label: "-- Mặc định --" },
  { value: "next", label: "Tiếp bước kế" },
  { value: "end", label: "Kết thúc" },
  { value: "goto:1", label: "Nhảy đến bước 1" },
  { value: "goto:2", label: "Nhảy đến bước 2" },
  { value: "goto:3", label: "Nhảy đến bước 3" },
];

const ON_REJECT_OPTIONS = [
  { value: "", label: "-- Mặc định --" },
  { value: "abort", label: "Dừng toàn bộ" },
  { value: "skip", label: "Bỏ qua" },
  { value: "retry:1", label: "Quay lại bước trước" },
  { value: "goto:1", label: "Nhảy đến bước 1" },
  { value: "goto:2", label: "Nhảy đến bước 2" },
  { value: "goto:3", label: "Nhảy đến bước 3" },
  { value: "notify:telegram", label: "Thông báo Telegram" },
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
        {isEditing ? (
          <span onClick={(e) => e.stopPropagation()}>
            <select
              value={getVal("type") as string}
              onChange={(e) =>
                setVal("type", e.target.value as StepDefinition["type"])
              }
              className="h-5 rounded border border-input bg-background px-1 text-[10px] text-foreground outline-none focus:ring-1 focus:ring-ring/50"
              title="Loại bước"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              typeCfg.colorClass,
            )}
            title={typeCfg.tooltip}
          >
            <TypeIcon className="h-2.5 w-2.5" />
            {typeCfg.label}
          </span>
        )}

        {/* Status badge */}
        {statusCfg && (
          <Badge
            variant={statusCfg.variant}
            className="text-[10px] px-1.5 py-0 gap-1"
          >
            {executionStatus === "running" && (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            )}
            {statusCfg.label}
          </Badge>
        )}

        {/* Header action buttons */}
        <div
          className="flex gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(stepIndex);
            }}
            title="Di chuyển lên"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(stepIndex);
            }}
            title="Di chuyển xuống"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          {editable && (
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(
                "text-muted-foreground",
                isEditing && "text-primary",
              )}
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
            onClick={(e) => {
              e.stopPropagation();
              onDelete(stepIndex);
            }}
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
            onExecuteSingle={onExecuteSingle}
            onUpdate={onUpdate}
            stepIndex={stepIndex}
          />

          {/* Shared: on_success / on_failure (for script/api/agent types) */}
          {(step.type === "script" ||
            step.type === "api" ||
            step.type === "agent") && (
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
                    options={ON_SUCCESS_OPTIONS}
                  />
                ) : (
                  <span className="text-foreground">
                    {step.on_success || "next"}
                  </span>
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
                    options={ON_FAILURE_OPTIONS}
                  />
                ) : (
                  <span className="text-foreground">
                    {step.on_failure || "abort"}
                  </span>
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

interface TypeBodyProps {
  step: StepDefinition;
  isEditing: boolean;
  getVal: <K extends keyof StepDefinition>(key: K) => StepDefinition[K];
  setVal: <K extends keyof StepDefinition>(
    key: K,
    value: StepDefinition[K],
  ) => void;
  onExecuteSingle?: (stepIndex: number) => void;
  onUpdate?: (stepIndex: number, updates: Partial<StepDefinition>) => void;
  stepIndex?: number;
  executionStatus?: string;
}

function TypeBody(props: TypeBodyProps) {
  const { step } = props;
  switch (step.type) {
    case "script":
      return <ScriptBody {...props} />;
    case "approval":
      return <ApprovalBody {...props} />;
    case "api":
      return <ApiBody {...props} />;
    case "agent":
      return <AgentBody {...props} />;
    case "manual":
      return <ManualBody {...props} />;
    case "event":
      return <EventBody {...props} />;
    default:
      return null;
  }
}

/* ─── Script body ─── */

function ScriptBody({ step, isEditing, getVal, setVal }: TypeBodyProps) {
  const trigger = (getVal("trigger") as StepDefinition["trigger"]) ?? {};
  const notification =
    (getVal("notification") as StepDefinition["notification"]) ?? {};
  const cronHuman = parseCron(trigger.schedule);

  return (
    <div className="space-y-3 text-xs">
      {/* Executor + CWD */}
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

      {/* Cron schedule + Estimated minutes — 2-column layout */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Lịch chạy (cron)
          </div>
          {isEditing ? (
            <div className="space-y-1">
              <Input
                className="h-7 text-xs font-mono"
                placeholder="0 7 * * *"
                value={trigger.schedule ?? ""}
                onChange={(e) =>
                  setVal("trigger", {
                    ...trigger,
                    schedule: e.target.value,
                  })
                }
              />
              {trigger.schedule && (
                <div className="text-[10px] text-muted-foreground">
                  {parseCron(trigger.schedule) || "Cú pháp cron tùy chỉnh"}
                </div>
              )}
            </div>
          ) : (
            <span className="font-mono text-[11px] text-foreground">
              {trigger.schedule ? (
                <>
                  <code className="bg-muted/50 rounded px-1.5 py-0.5">
                    {trigger.schedule}
                  </code>
                  {cronHuman && (
                    <span className="ml-1.5 text-muted-foreground font-sans">
                      ({cronHuman})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground font-sans">
                  Không có lịch
                </span>
              )}
            </span>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Thời gian ước tính
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                className="h-7 text-xs w-20"
                type="number"
                min={0}
                placeholder="0"
                value={
                  (getVal("estimated_minutes") as number | null) ?? ""
                }
                onChange={(e) =>
                  setVal(
                    "estimated_minutes",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
              <span className="text-muted-foreground">phút</span>
            </div>
          ) : (
            <span className="text-foreground">
              {(getVal("estimated_minutes") as number | null) != null
                ? `${getVal("estimated_minutes")} phút`
                : "—"}
            </span>
          )}
        </div>
      </div>

      {/* Notification config */}
      <NotificationConfig
        notification={notification}
        isEditing={isEditing}
        onChange={(n) => setVal("notification", n)}
        label="Thông báo khi lỗi"
      />

      {/* Input/Output config */}
      <IOConfig
        step={step}
        isEditing={isEditing}
        getVal={getVal}
        setVal={setVal}
      />
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
  onExecuteSingle,
  onUpdate,
  stepIndex,
}: TypeBodyProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const notification =
    (getVal("notification") as StepDefinition["notification"]) ?? {};

  return (
    <div className="space-y-3 text-xs">
      {/* Approver */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground shrink-0 w-24">
          Người duyệt
        </span>
        {isEditing ? (
          <NativeSelect
            value={(getVal("approver") as string) ?? (getVal("agent") as string) ?? ""}
            onChange={(v) => {
              setVal("approver", v);
              setVal("agent", v);
            }}
            options={AGENT_OPTIONS}
          />
        ) : (
          <span className="text-foreground truncate">
            {(getVal("approver") as string) ||
              (getVal("agent") as string) ||
              "—"}
          </span>
        )}
      </div>

      {/* Notification when waiting approval */}
      <NotificationConfig
        notification={notification}
        isEditing={isEditing}
        onChange={(n) => setVal("notification", n)}
        label="Thông báo khi chờ duyệt"
      />

      {/* on_approve / on_reject */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Khi được duyệt
          </div>
          {isEditing ? (
            <NativeSelect
              value={(getVal("on_approve") as string) ?? ""}
              onChange={(v) => setVal("on_approve", v)}
              options={ON_APPROVE_OPTIONS}
            />
          ) : (
            <span className="text-foreground">
              {(getVal("on_approve") as string) || "next"}
            </span>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            Khi bị từ chối
          </div>
          {isEditing ? (
            <NativeSelect
              value={(getVal("on_reject") as string) ?? ""}
              onChange={(v) => setVal("on_reject", v)}
              options={ON_REJECT_OPTIONS}
            />
          ) : (
            <span className="text-foreground">
              {(getVal("on_reject") as string) || "abort"}
            </span>
          )}
        </div>
      </div>

      {/* Waiting for approval — action panel */}
      {executionStatus === "waiting" && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 space-y-2">
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Đang chờ phê duyệt
          </div>

          {!showRejectForm ? (
            <div className="flex gap-2">
              <Button
                size="xs"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onExecuteSingle?.(stepIndex ?? 0)}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Phê duyệt
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Từ chối
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                className="min-h-[50px] text-xs"
                placeholder="Lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => {
                    onUpdate?.(stepIndex ?? 0, {
                      on_reject: `reject:${rejectReason}`,
                    });
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                >
                  Xác nhận từ chối
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                >
                  Huỷ
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── API body ─── */

function ApiBody({ step, isEditing, getVal, setVal }: TypeBodyProps) {
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
                setVal("input", {
                  ...input,
                  params: { ...(input?.params ?? {}), method: v },
                });
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
                setVal("input", {
                  ...input,
                  params: {
                    ...(input?.params ?? {}),
                    endpoint: e.target.value,
                  },
                });
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
                setVal("input", {
                  ...input,
                  params: {
                    ...(input?.params ?? {}),
                    body: e.target.value,
                  },
                });
              }}
            />
          ) : (
            <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
              {requestBody}
            </code>
          )}
        </div>
      )}

      <IOConfig
        step={step}
        isEditing={isEditing}
        getVal={getVal}
        setVal={setVal}
      />
    </div>
  );
}

/* ─── Agent body ─── */

function AgentBody({ step, isEditing, getVal, setVal }: TypeBodyProps) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground shrink-0 w-24">Agent</span>
        {isEditing ? (
          <NativeSelect
            value={(getVal("agent") as string) ?? ""}
            onChange={(v) => setVal("agent", v)}
            options={AGENT_OPTIONS}
          />
        ) : (
          <span className="text-foreground truncate">
            {(getVal("agent") as string) || "—"}
          </span>
        )}
      </div>
      {/* Task description via executor as description placeholder */}
      <FieldRow
        icon={Terminal}
        label="Tác vụ"
        value={(getVal("executor") as string) ?? ""}
        editing={isEditing}
        onChange={(v) => setVal("executor", v)}
      />
      <IOConfig
        step={step}
        isEditing={isEditing}
        getVal={getVal}
        setVal={setVal}
      />
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
  onExecuteSingle,
  onUpdate,
  stepIndex,
}: TypeBodyProps) {
  const [instructions, setInstructions] = useState(
    (getVal("executor") as string) ?? "",
  );
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3 text-xs">
      {/* Assignee */}
      <div className="flex items-center gap-2">
        <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground shrink-0 w-24">
          Người thực hiện
        </span>
        {isEditing ? (
          <NativeSelect
            value={(getVal("agent") as string) ?? ""}
            onChange={(v) => setVal("agent", v)}
            options={AGENT_OPTIONS}
          />
        ) : (
          <span className="text-foreground truncate">
            {(getVal("agent") as string) || "—"}
          </span>
        )}
      </div>

      {/* Instructions */}
      <div>
        <div className="text-muted-foreground mb-1">Hướng dẫn thực hiện</div>
        {isEditing ? (
          <Textarea
            className="min-h-[60px] text-xs"
            placeholder="Mô tả các bước cần làm..."
            rows={3}
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

      {/* Notes textarea — for recording results/output */}
      <div>
        <div className="text-muted-foreground mb-1 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Ghi chú kết quả
        </div>
        <Textarea
          className="min-h-[50px] text-xs"
          placeholder="Ghi lại kết quả thực hiện, output, hoặc ghi chú..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Mark complete — only when step is running */}
        {executionStatus === "running" && (
          <Button
            size="xs"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onExecuteSingle?.(stepIndex ?? 0)}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Đánh dấu hoàn thành
          </Button>
        )}

        {/* Skip button */}
        <Button
          size="xs"
          variant="outline"
          onClick={() => onUpdate?.(stepIndex ?? 0, { on_success: "skip" })}
        >
          <SkipForward className="h-3 w-3 mr-1" />
          Bỏ qua bước này
        </Button>

        {/* Telegram reminder */}
        <Button
          size="xs"
          variant="outline"
          onClick={() => onExecuteSingle?.(stepIndex ?? 0)}
        >
          <Send className="h-3 w-3 mr-1" />
          Nhắc qua Telegram
        </Button>
      </div>
    </div>
  );
}

/* ─── Event body ─── */

function EventBody({
  step,
  isEditing,
  getVal,
  setVal,
  onExecuteSingle,
  stepIndex,
}: TypeBodyProps) {
  const trigger = (getVal("trigger") as StepDefinition["trigger"]) ?? {};

  return (
    <div className="space-y-3 text-xs">
      {/* Event name */}
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

      {/* Trigger type dropdown */}
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground shrink-0 w-24">Loại trigger</span>
        {isEditing ? (
          <NativeSelect
            value={trigger.type ?? ""}
            onChange={(v) =>
              setVal("trigger", { ...trigger, type: v })
            }
            options={TRIGGER_TYPE_OPTIONS}
          />
        ) : (
          <span className="text-foreground">
            {trigger.type
              ? TRIGGER_TYPE_OPTIONS.find((o) => o.value === trigger.type)
                  ?.label ?? trigger.type
              : "—"}
          </span>
        )}
      </div>

      {/* Event log section */}
      <div>
        <div className="text-muted-foreground mb-1 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Lịch sử sự kiện
        </div>
        <div className="bg-muted/50 rounded px-2 py-2 text-[11px] text-muted-foreground italic">
          Chưa có lịch sử sự kiện
        </div>
      </div>

      {/* Manual trigger button */}
      <Button
        size="xs"
        variant="outline"
        onClick={() => onExecuteSingle?.(stepIndex ?? 0)}
      >
        <Zap className="h-3 w-3 mr-1" />
        Kích hoạt thủ công
      </Button>
    </div>
  );
}

/* ─── Notification Config (shared) ─── */

function NotificationConfig({
  notification,
  isEditing,
  onChange,
  label,
}: {
  notification: NonNullable<StepDefinition["notification"]>;
  isEditing: boolean;
  onChange: (n: StepDefinition["notification"]) => void;
  label: string;
}) {
  const channel = notification.channel ?? "";
  const message = notification.message ?? "";

  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Bell className="h-3 w-3" />
        {label}
      </div>
      {isEditing ? (
        <div className="space-y-1.5">
          <NativeSelect
            value={channel}
            onChange={(v) => onChange({ ...notification, channel: v })}
            options={NOTIFICATION_OPTIONS}
          />
          {channel && (
            <Input
              className="h-7 text-xs"
              placeholder="Nội dung thông báo..."
              value={message}
              onChange={(e) =>
                onChange({ ...notification, message: e.target.value })
              }
            />
          )}
        </div>
      ) : (
        <span className="text-xs text-foreground">
          {channel ? (
            <>
              <Badge variant="outline" className="text-[10px] mr-1.5">
                {NOTIFICATION_OPTIONS.find((o) => o.value === channel)?.label ??
                  channel}
              </Badge>
              {message && (
                <span className="text-muted-foreground">{message}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Không thông báo</span>
          )}
        </span>
      )}
    </div>
  );
}

/* ─── Shared IO Config ─── */

function IOConfig({ step, isEditing, getVal, setVal }: TypeBodyProps) {
  const input = getVal("input") as StepDefinition["input"];
  const output = getVal("output") as StepDefinition["output"];

  if (!input?.source && !output?.destination && !isEditing) return null;

  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      {(input?.source || isEditing) && (
        <div>
          <div className="text-muted-foreground mb-1">Đầu vào (source)</div>
          {isEditing ? (
            <Input
              className="h-7 text-xs font-mono"
              placeholder="VD: step.1.output"
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
          <div className="text-muted-foreground mb-1">Đầu ra (destination)</div>
          {isEditing ? (
            <Input
              className="h-7 text-xs font-mono"
              placeholder="VD: memory/reports/output.json"
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
        <span
          className={cn(
            "text-foreground truncate",
            mono && "font-mono text-[11px]",
          )}
        >
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
