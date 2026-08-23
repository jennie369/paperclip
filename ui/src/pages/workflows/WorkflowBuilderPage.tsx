// Workflow Builder — Visual drag & drop workflow editor using ReactFlow

import { useState, useCallback, useRef, useMemo, type DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Play,
  Trash2,
  Loader2,
  ArrowLeft,
  Zap,
  Bot,
  Cog,
  GitBranch,
  Clock,
  CircleStop,
  GripVertical,
} from "lucide-react";
import { useNavigate, useParams } from "@/lib/router";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkflowNodeType = "trigger" | "agent" | "action" | "branch" | "delay" | "end";

interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface WorkflowPayload {
  id?: string;
  name: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Node palette definition ─────────────────────────────────────────────────

const NODE_PALETTE: {
  type: WorkflowNodeType;
  label: string;
  icon: typeof Zap;
  color: string;
  bgClass: string;
  borderClass: string;
}[] = [
  { type: "trigger", label: "Kích hoạt", icon: Zap, color: "text-green-700", bgClass: "bg-green-50 dark:bg-green-950/40", borderClass: "border-green-300 dark:border-green-700" },
  { type: "agent", label: "Agent", icon: Bot, color: "text-blue-700", bgClass: "bg-blue-50 dark:bg-blue-950/40", borderClass: "border-blue-300 dark:border-blue-700" },
  { type: "action", label: "Hành động", icon: Cog, color: "text-purple-700", bgClass: "bg-purple-50 dark:bg-purple-950/40", borderClass: "border-purple-300 dark:border-purple-700" },
  { type: "branch", label: "Điều kiện", icon: GitBranch, color: "text-yellow-700", bgClass: "bg-yellow-50 dark:bg-yellow-950/40", borderClass: "border-yellow-300 dark:border-yellow-700" },
  { type: "delay", label: "Chờ", icon: Clock, color: "text-gray-700", bgClass: "bg-gray-50 dark:bg-gray-950/40", borderClass: "border-gray-300 dark:border-gray-700" },
  { type: "end", label: "Kết thúc", icon: CircleStop, color: "text-red-700", bgClass: "bg-red-50 dark:bg-red-950/40", borderClass: "border-red-300 dark:border-red-700" },
];

const paletteByType = Object.fromEntries(NODE_PALETTE.map((n) => [n.type, n])) as Record<
  WorkflowNodeType,
  (typeof NODE_PALETTE)[number]
>;

// ─── Custom node component ───────────────────────────────────────────────────

function WorkflowNode({ data, selected }: NodeProps<Node<WorkflowNodeData>>) {
  const palette = paletteByType[data.nodeType] ?? paletteByType.action;
  const Icon = palette.icon;
  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 min-w-[160px] shadow-sm transition-shadow ${palette.bgClass} ${palette.borderClass} ${selected ? "ring-2 ring-ring ring-offset-1" : ""}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${palette.color}`} />
        <span className="text-sm font-medium truncate">{data.label}</span>
      </div>
      {Boolean(data.config?.description) && (
        <p className="mt-1 text-xs text-muted-foreground truncate max-w-[200px]">
          {String(data.config!.description)}
        </p>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflow: WorkflowNode,
};

// ─── API helpers ─────────────────────────────────────────────────────────────

const WF_BASE = "/api/ops/workflows";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || `Lỗi ${res.status}`);
  }
  return res.json();
}

function loadWorkflow(id: string) {
  return fetchJSON<WorkflowPayload>(`${WF_BASE}/${id}`);
}

function saveWorkflow(payload: WorkflowPayload) {
  if (payload.id) {
    return fetchJSON<WorkflowPayload>(`${WF_BASE}/${payload.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return fetchJSON<WorkflowPayload>(WF_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function runWorkflow(id: string) {
  return fetchJSON<{ runId: string }>(`${WF_BASE}/${id}/run`, { method: "POST" });
}

// ─── Config panel per node type ──────────────────────────────────────────────

function NodeConfigPanel({
  node,
  onChange,
  onDelete,
}: {
  node: Node<WorkflowNodeData>;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (id: string) => void;
}) {
  const data = node.data;
  const config = (data.config ?? {}) as Record<string, string>;

  const updateConfig = (key: string, value: string) => {
    onChange(node.id, { config: { ...config, [key]: value } });
  };

  return (
    <div className="w-72 border-l bg-card p-4 overflow-y-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cấu hình node</h3>
        <Button variant="ghost" size="icon-xs" onClick={() => onDelete(node.id)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tên hiển thị</Label>
        <Input
          value={data.label}
          onChange={(e) => onChange(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Mô tả</Label>
        <Input
          value={config.description ?? ""}
          onChange={(e) => updateConfig("description", e.target.value)}
          placeholder="Ghi chú ngắn..."
          className="h-8 text-sm"
        />
      </div>

      {/* Type-specific config */}
      {data.nodeType === "trigger" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Loại kích hoạt</Label>
          <select
            className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={config.triggerType ?? "manual"}
            onChange={(e) => updateConfig("triggerType", e.target.value)}
          >
            <option value="manual">Thủ công</option>
            <option value="schedule">Lịch hẹn (Cron)</option>
            <option value="webhook">Webhook</option>
            <option value="event">Sự kiện hệ thống</option>
          </select>
          {config.triggerType === "schedule" && (
            <div className="mt-2 space-y-1.5">
              <Label className="text-xs">Biểu thức Cron</Label>
              <Input
                value={config.cron ?? ""}
                onChange={(e) => updateConfig("cron", e.target.value)}
                placeholder="0 9 * * *"
                className="h-8 text-sm font-mono"
              />
            </div>
          )}
        </div>
      )}

      {data.nodeType === "agent" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Agent slug</Label>
            <Input
              value={config.agentSlug ?? ""}
              onChange={(e) => updateConfig("agentSlug", e.target.value)}
              placeholder="ceo, cto, researcher..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prompt gửi agent</Label>
            <Textarea
              value={config.prompt ?? ""}
              onChange={(e) => updateConfig("prompt", e.target.value)}
              placeholder="Hướng dẫn cho agent..."
              className="min-h-20 text-sm"
            />
          </div>
        </>
      )}

      {data.nodeType === "action" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Loại hành động</Label>
            <select
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={config.actionType ?? "api_call"}
              onChange={(e) => updateConfig("actionType", e.target.value)}
            >
              <option value="api_call">Gọi API</option>
              <option value="send_email">Gửi email</option>
              <option value="send_notification">Gửi thông báo</option>
              <option value="update_db">Cập nhật CSDL</option>
              <option value="run_script">Chạy script</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cấu hình (JSON)</Label>
            <Textarea
              value={config.payload ?? "{}"}
              onChange={(e) => updateConfig("payload", e.target.value)}
              placeholder='{"url": "...", "method": "POST"}'
              className="min-h-20 text-sm font-mono"
            />
          </div>
        </>
      )}

      {data.nodeType === "branch" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Điều kiện (biểu thức)</Label>
          <Textarea
            value={config.condition ?? ""}
            onChange={(e) => updateConfig("condition", e.target.value)}
            placeholder={'result.status === "success"'}
            className="min-h-16 text-sm font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Nhánh True: cổng trên. Nhánh False: cổng dưới.
          </p>
        </div>
      )}

      {data.nodeType === "delay" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Thời gian chờ (giây)</Label>
          <Input
            type="number"
            min={0}
            value={config.delaySeconds ?? "60"}
            onChange={(e) => updateConfig("delaySeconds", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )}

      {data.nodeType === "end" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Trạng thái kết thúc</Label>
          <select
            className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={config.endStatus ?? "success"}
            onChange={(e) => updateConfig("endStatus", e.target.value)}
          >
            <option value="success">Thành công</option>
            <option value="failure">Thất bại</option>
            <option value="cancelled">Đã huỷ</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Inner builder (needs ReactFlow context) ─────────────────────────────────

let nodeIdCounter = 0;
function getNodeId() {
  return `node_${++nodeIdCounter}_${Date.now()}`;
}

function WorkflowBuilderInner() {
  const { id: workflowId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [workflowName, setWorkflowName] = useState("Workflow mới");
  const [savedId, setSavedId] = useState<string | undefined>(workflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // ── Load existing workflow ──
  const { isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => loadWorkflow(workflowId!),
    enabled: !!workflowId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    select: (data) => {
      // Only set state once on initial load
      return data;
    },
  });

  // Apply loaded data via onSuccess-equivalent
  const loadedRef = useRef(false);
  const loadQuery = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => loadWorkflow(workflowId!),
    enabled: !!workflowId && !loadedRef.current,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (loadQuery.data && !loadedRef.current) {
    loadedRef.current = true;
    setWorkflowName(loadQuery.data.name);
    setNodes(loadQuery.data.nodes.map((n) => ({ ...n, type: "workflow" })));
    setEdges(loadQuery.data.edges);
    setSavedId(loadQuery.data.id);
  }

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: () =>
      saveWorkflow({
        id: savedId,
        name: workflowName,
        nodes,
        edges,
      }),
    onSuccess: (data) => {
      setSavedId(data.id);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      if (!workflowId && data.id) {
        navigate(`/workflows/${data.id}`, { replace: true });
      }
    },
  });

  // ── Run mutation ──
  const runMutation = useMutation({
    mutationFn: () => {
      if (!savedId) throw new Error("Phải lưu trước khi chạy");
      return runWorkflow(savedId);
    },
  });

  // ── Edge connect ──
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // ── Node selection ──
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // ── Drag & drop from palette ──
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/workflow-node-type") as WorkflowNodeType;
      if (!nodeType || !reactFlowInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const palette = paletteByType[nodeType];
      const newNode: Node<WorkflowNodeData> = {
        id: getNodeId(),
        type: "workflow",
        position,
        data: {
          label: palette?.label ?? nodeType,
          nodeType,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  // ── Update node data ──
  const handleNodeDataChange = useCallback(
    (id: string, partial: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n)),
      );
    },
    [setNodes],
  );

  // ── Delete node ──
  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes],
  );

  if (isLoading && workflowId) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Đang tải workflow...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 border-b px-4 py-2 bg-card shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={() => navigate("/workflows")}>
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="h-8 max-w-xs text-sm font-medium"
          placeholder="Tên workflow..."
        />
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>Lưu</span>
        </Button>
        <Button
          size="sm"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || !savedId}
        >
          {runMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          <span>Chạy</span>
        </Button>
      </div>

      {/* ── Status messages ── */}
      {saveMutation.isError && (
        <div className="px-4 py-1.5 bg-destructive/10 text-destructive text-xs">
          Lỗi lưu: {saveMutation.error?.message}
        </div>
      )}
      {saveMutation.isSuccess && (
        <div className="px-4 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
          Đã lưu thành công
        </div>
      )}
      {runMutation.isError && (
        <div className="px-4 py-1.5 bg-destructive/10 text-destructive text-xs">
          Lỗi chạy: {runMutation.error?.message}
        </div>
      )}
      {runMutation.isSuccess && (
        <div className="px-4 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
          Workflow đã bắt đầu chạy (Run ID: {runMutation.data?.runId})
        </div>
      )}

      {/* ── Main area: sidebar + canvas + config panel ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left palette */}
        <div className="w-52 border-r bg-card/50 p-3 shrink-0 overflow-y-auto">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Loại node
          </h3>
          <div className="space-y-2">
            {NODE_PALETTE.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing text-sm select-none transition-colors hover:bg-accent/50 ${item.bgClass} ${item.borderClass}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/workflow-node-type", item.type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <GripVertical className="size-3 text-muted-foreground shrink-0" />
                  <Icon className={`size-4 shrink-0 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Kéo thả node vào canvas để xây dựng workflow. Nối các node bằng cách kéo từ cổng ra
              đến cổng vào.
            </p>
          </div>
        </div>

        {/* ReactFlow canvas */}
        <div className="flex-1 min-w-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              className="!bg-card !border"
              maskColor="rgba(0,0,0,0.1)"
              pannable
              zoomable
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 rounded-lg border border-dashed border-muted-foreground/30 bg-card/80 px-8 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Kéo thả node từ bảng bên trái để bắt đầu
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right config panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onChange={handleNodeDataChange}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}

// ─── Exported page (wraps with ReactFlowProvider) ────────────────────────────

/**
 * @archetype form
 */
export function WorkflowBuilderPage() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = true;
  const validate = () => true;


  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
