import { useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Pencil,
  Clock,
  Terminal,
  User,
  Bot,
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

export interface SopStep {
  id: string;
  order: number;
  name: string;
  type: "script" | "approval" | "api" | "agent" | "manual" | "cron";
  executor?: string;
  cwd?: string;
  agentSlug?: string;
  cronSchedule?: string;
  inputConfig?: string;
  outputConfig?: string;
  onSuccess?: string;
  onFailure?: string;
  description?: string;
}

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_approval";

interface SopStepCardProps {
  step: SopStep;
  status?: StepStatus;
  onApprove?: (stepId: string) => void;
  onReject?: (stepId: string) => void;
  onStepUpdate?: (stepId: string, updates: Partial<SopStep>) => void;
  editable?: boolean;
}

/* ─── Status config ─── */

const STEP_STATUS: Record<StepStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  pending: { label: "Chờ", variant: "secondary", icon: Clock },
  running: { label: "Đang chạy", variant: "default", icon: Loader2 },
  completed: { label: "Xong", variant: "secondary", icon: CheckCircle },
  failed: { label: "Lỗi", variant: "destructive", icon: XCircle },
  skipped: { label: "Bỏ qua", variant: "outline", icon: ArrowRight },
  waiting_approval: { label: "Chờ duyệt", variant: "outline", icon: AlertTriangle },
};

const TYPE_LABELS: Record<SopStep["type"], string> = {
  script: "Script",
  approval: "Phê duyệt",
  api: "API",
  agent: "Agent",
  manual: "Thủ công",
  cron: "Cron",
};

const TYPE_COLORS: Record<SopStep["type"], string> = {
  script: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  approval: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  api: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  agent: "bg-green-500/10 text-green-600 dark:text-green-400",
  manual: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  cron: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

/* ─── Component ─── */

export function SopStepCard({
  step,
  status = "pending",
  onApprove,
  onReject,
  onStepUpdate,
  editable = false,
}: SopStepCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editData, setEditData] = useState<Partial<SopStep>>({});

  const statusCfg = STEP_STATUS[status];
  const StatusIcon = statusCfg.icon;

  const handleSave = useCallback(() => {
    if (onStepUpdate && Object.keys(editData).length > 0) {
      onStepUpdate(step.id, editData);
    }
    setIsEditing(false);
    setEditData({});
  }, [onStepUpdate, step.id, editData]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditData({});
  }, []);

  const getField = (key: keyof SopStep) => (editData[key] as string) ?? (step[key] as string) ?? "";

  const setField = (key: keyof SopStep, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card
      className={cn(
        "py-0 gap-0 border transition-all",
        status === "running" && "ring-2 ring-primary/30",
        status === "failed" && "ring-2 ring-destructive/30",
        status === "waiting_approval" && "ring-2 ring-amber-500/30",
      )}
    >
      {/* Header */}
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

        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", TYPE_COLORS[step.type])}>
          {TYPE_LABELS[step.type]}
        </span>

        <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0 gap-1">
          <StatusIcon className={cn("h-2.5 w-2.5", status === "running" && "animate-spin")} />
          {statusCfg.label}
        </Badge>

        {editable && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
              setExpanded(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 space-y-3 border-t border-border/50">
          {step.description && (
            <p className="text-xs text-muted-foreground">{step.description}</p>
          )}

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {/* Executor */}
            {(step.executor || isEditing) && (
              <FieldRow
                icon={Terminal}
                label="Executor"
                value={getField("executor")}
                editing={isEditing}
                onChange={(v) => setField("executor", v)}
              />
            )}

            {/* CWD */}
            {(step.cwd || isEditing) && (
              <FieldRow
                icon={FolderOpen}
                label="Thư mục"
                value={getField("cwd")}
                editing={isEditing}
                onChange={(v) => setField("cwd", v)}
              />
            )}

            {/* Agent */}
            {(step.agentSlug || isEditing) && (
              <FieldRow
                icon={Bot}
                label="Agent"
                value={getField("agentSlug")}
                editing={isEditing}
                onChange={(v) => setField("agentSlug", v)}
              />
            )}

            {/* Cron */}
            {(step.cronSchedule || isEditing) && (
              <FieldRow
                icon={Clock}
                label="Lịch chạy"
                value={getField("cronSchedule")}
                editing={isEditing}
                onChange={(v) => setField("cronSchedule", v)}
              />
            )}
          </div>

          {/* Input / Output config */}
          {(step.inputConfig || step.outputConfig || isEditing) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(step.inputConfig || isEditing) && (
                <div>
                  <div className="text-muted-foreground mb-1">Đầu vào</div>
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs font-mono"
                      value={getField("inputConfig")}
                      onChange={(e) => setField("inputConfig", e.target.value)}
                    />
                  ) : (
                    <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] break-all">
                      {step.inputConfig}
                    </code>
                  )}
                </div>
              )}
              {(step.outputConfig || isEditing) && (
                <div>
                  <div className="text-muted-foreground mb-1">Đầu ra</div>
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs font-mono"
                      value={getField("outputConfig")}
                      onChange={(e) => setField("outputConfig", e.target.value)}
                    />
                  ) : (
                    <code className="block bg-muted/50 rounded px-2 py-1 font-mono text-[11px] break-all">
                      {step.outputConfig}
                    </code>
                  )}
                </div>
              )}
            </div>
          )}

          {/* On Success / On Failure */}
          {(step.onSuccess || step.onFailure || isEditing) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(step.onSuccess || isEditing) && (
                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Thành công
                  </div>
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs"
                      value={getField("onSuccess")}
                      onChange={(e) => setField("onSuccess", e.target.value)}
                    />
                  ) : (
                    <span className="text-foreground">{step.onSuccess}</span>
                  )}
                </div>
              )}
              {(step.onFailure || isEditing) && (
                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Thất bại
                  </div>
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs"
                      value={getField("onFailure")}
                      onChange={(e) => setField("onFailure", e.target.value)}
                    />
                  ) : (
                    <span className="text-foreground">{step.onFailure}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit actions */}
          {isEditing && (
            <div className="flex gap-2 pt-1">
              <Button size="xs" onClick={handleSave}>
                Lưu thay đổi
              </Button>
              <Button size="xs" variant="outline" onClick={handleCancel}>
                Huỷ
              </Button>
            </div>
          )}

          {/* Approval gate */}
          {step.type === "approval" && status === "waiting_approval" && (
            <div className="flex gap-2 pt-1 border-t border-border/50">
              <Button
                size="xs"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove?.(step.id)}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Duyệt
              </Button>
              <Button size="xs" variant="destructive" onClick={() => onReject?.(step.id)}>
                <XCircle className="h-3 w-3 mr-1" />
                Từ chối
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Field row helper ─── */

function FieldRow({
  icon: Icon,
  label,
  value,
  editing,
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0 w-16">{label}</span>
      {editing ? (
        <Input
          className="h-6 text-xs flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span className="text-foreground truncate">{value || "—"}</span>
      )}
    </div>
  );
}
