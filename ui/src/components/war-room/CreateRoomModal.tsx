import { useState, useEffect, useRef } from "react";
import {
  Hash, Folder, Target, Lock, X, Plus,
  Megaphone, AlertTriangle, BookOpen, Users, Zap,
  Check, ChevronDown, Loader2, Settings,
} from "lucide-react";
import { warRoomApi, type CreateChannelParams } from "../../api/warRoom";

// ─── Icon options ───────────────────────────────────────────

const ICON_OPTIONS = [
  { value: "hash", icon: Hash, label: "Mặc định" },
  { value: "folder", icon: Folder, label: "Dự án" },
  { value: "target", icon: Target, label: "Mục tiêu" },
  { value: "zap", icon: Zap, label: "Nhanh" },
  { value: "megaphone", icon: Megaphone, label: "Thông báo" },
  { value: "alert-triangle", icon: AlertTriangle, label: "Cảnh báo" },
  { value: "book-open", icon: BookOpen, label: "Nghiên cứu" },
  { value: "users", icon: Users, label: "Nhóm" },
  { value: "settings", icon: Settings, label: "Cài đặt" },
];

const COLOR_OPTIONS = [
  { value: "amber", label: "Vàng", cls: "bg-amber-500" },
  { value: "blue", label: "Xanh dương", cls: "bg-blue-500" },
  { value: "green", label: "Xanh lá", cls: "bg-green-500" },
  { value: "red", label: "Đỏ", cls: "bg-red-500" },
  { value: "purple", label: "Tím", cls: "bg-purple-500" },
  { value: "cyan", label: "Cyan", cls: "bg-cyan-500" },
  { value: "orange", label: "Cam", cls: "bg-orange-500" },
  { value: "pink", label: "Hồng", cls: "bg-pink-500" },
];

const CHANNEL_TYPES = [
  { value: "group", label: "Chung", desc: "Phòng chat chung cho team" },
  { value: "project", label: "Dự án", desc: "Gắn với 1 Paperclip project" },
  { value: "goal", label: "Mục tiêu", desc: "Gắn với 1 Paperclip goal" },
  { value: "training", label: "Đào tạo", desc: "Phòng training cho agents" },
];

// ─── Props ──────────────────────────────────────────────────

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
  agents: Array<{ id: string; name: string; slug: string }>;
  projects: Array<{ id: string; name: string }>;
  goals: Array<{ id: string; title: string }>;
}

// ─── Component ──────────────────────────────────────────────

export function CreateRoomModal({
  isOpen, onClose, onCreated, agents, projects, goals,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("hash");
  const [color, setColor] = useState("amber");
  const [channelType, setChannelType] = useState("group");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [autoPostIssues, setAutoPostIssues] = useState(true);
  const [autoPostGoals, setAutoPostGoals] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const iconRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "new-room";

  // Auto-fill from project
  useEffect(() => {
    if (selectedProject && channelType === "project") {
      const project = projects.find((p) => p.id === selectedProject);
      if (project && !name) {
        setName(project.name);
        setIcon("folder");
        setColor("blue");
      }
    }
  }, [selectedProject, channelType]);

  // Auto-fill from goal
  useEffect(() => {
    if (selectedGoal && channelType === "goal") {
      const goal = goals.find((g) => g.id === selectedGoal);
      if (goal && !name) {
        setName(goal.title);
        setIcon("target");
        setColor("green");
      }
    }
  }, [selectedGoal, channelType]);

  // Close pickers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) setShowIconPicker(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleAgent = (s: string) => {
    setSelectedAgents((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const resetForm = () => {
    setName(""); setDescription(""); setIcon("hash"); setColor("amber");
    setChannelType("group"); setIsPrivate(false); setSelectedAgents([]);
    setSelectedProject(""); setSelectedGoal(""); setAutoPostIssues(true);
    setAutoPostGoals(true); setError("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Vui lòng nhập tên phòng"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await warRoomApi.createChannel({
        name: slug,
        display_name: `#${slug}`,
        description: description || `Phòng chat: ${name}`,
        channel_type: channelType,
        icon,
        color,
        is_private: isPrivate,
        is_default: false,
        project_id: selectedProject || null,
        goal_id: selectedGoal || null,
        created_by: "owner",
        settings: {
          auto_post_issue_updates: autoPostIssues,
          auto_post_goal_progress: autoPostGoals,
          mute_system_messages: false,
          max_messages: 200,
        },
        members: selectedAgents,
      });
      onCreated(result.id);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tạo phòng";
      if (message.includes("duplicate") || message.includes("unique")) {
        setError("Tên phòng đã tồn tại, vui lòng chọn tên khác");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const IconComp = ICON_OPTIONS.find((i) => i.value === icon)?.icon ?? Hash;
  const colorCls = COLOR_OPTIONS.find((c) => c.value === color)?.cls ?? "bg-amber-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-sm font-semibold">Tạo phòng chat mới</h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1 rounded-md hover:bg-accent transition-colors border-none bg-transparent cursor-pointer text-muted-foreground"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Channel Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Loại phòng</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setChannelType(t.value)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    channelType === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent bg-transparent"
                  }`}
                >
                  <div className="text-xs font-medium">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Icon + Color */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tên phòng</label>
            <div className="flex items-center gap-2">
              {/* Icon picker */}
              <div className="relative" ref={iconRef}>
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors cursor-pointer bg-transparent"
                  title="Chọn icon"
                >
                  <IconComp size={14} />
                </button>
                {showIconPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg p-2 grid grid-cols-3 gap-1 z-20 shadow-lg w-[140px]">
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setIcon(opt.value); setShowIconPicker(false); }}
                        className={`p-2 rounded-md hover:bg-accent cursor-pointer bg-transparent border-none flex items-center justify-center ${icon === opt.value ? "bg-primary/10" : ""}`}
                        title={opt.label}
                      >
                        <opt.icon size={14} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ví dụ: content-pipeline-v3"
                className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-muted/30 text-foreground focus:border-primary/40 focus:outline-none transition-colors"
              />

              {/* Color picker */}
              <div className="relative" ref={colorRef}>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent cursor-pointer bg-transparent"
                  title="Chọn màu"
                >
                  <div className={`w-4 h-4 rounded-full ${colorCls}`} />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg p-2 grid grid-cols-4 gap-1 z-20 shadow-lg">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setColor(opt.value); setShowColorPicker(false); }}
                        className={`p-2 rounded-md hover:bg-accent flex items-center justify-center cursor-pointer bg-transparent border-none ${color === opt.value ? "ring-2 ring-primary" : ""}`}
                        title={opt.label}
                      >
                        <div className={`w-4 h-4 rounded-full ${opt.cls}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Slug: <span className="font-mono">#{slug}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mô tả</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn về phòng này"
              className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-muted/30 text-foreground focus:border-primary/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Project selection */}
          {channelType === "project" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Liên kết Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-muted/30 text-foreground focus:border-primary/40 focus:outline-none"
              >
                <option value="">-- Chọn project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Goal selection */}
          {channelType === "goal" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Liên kết Goal</label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-muted/30 text-foreground focus:border-primary/40 focus:outline-none"
              >
                <option value="">-- Chọn goal --</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Agent members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Agents tham gia</label>
              <button
                onClick={() => setSelectedAgents(agents.map((a) => a.slug))}
                className="text-[10px] text-primary hover:underline bg-transparent border-none cursor-pointer"
              >
                Chọn tất cả
              </button>
            </div>
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Chưa có agents</div>
              ) : (
                agents.map((agent) => (
                  <button
                    key={agent.slug}
                    onClick={() => toggleAgent(agent.slug)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors cursor-pointer bg-transparent border-none text-left text-foreground ${
                      selectedAgents.includes(agent.slug) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedAgents.includes(agent.slug)
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}>
                      {selectedAgents.includes(agent.slug) && <Check size={10} className="text-white" />}
                    </div>
                    <span>{agent.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Đã chọn: {selectedAgents.length}/{agents.length} agents
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">Cài đặt</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              <Lock size={12} className="text-muted-foreground" />
              <span className="text-xs">Phòng riêng tư (chỉ members xem được)</span>
            </label>

            {(channelType === "project" || channelType === "goal") && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPostIssues}
                    onChange={(e) => setAutoPostIssues(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-xs">Tự động post khi issue cập nhật</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPostGoals}
                    onChange={(e) => setAutoPostGoals(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-xs">Tự động post tiến độ goal</span>
                </label>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border sticky bottom-0 bg-background">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="h-8 px-4 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 border-none cursor-pointer"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Tạo phòng
          </button>
        </div>
      </div>
    </div>
  );
}
