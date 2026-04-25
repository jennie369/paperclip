import { useEffect, useState } from "react";
import {
  Archive,
  Bell,
  Folder,
  Loader2,
  Settings,
  Target,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  warRoomApi,
  type WarRoomChannel,
  type ChannelMemberPresence,
  type WakeMode,
} from "../../api/warRoom";
import { Tooltip } from "./Tooltip";

interface RoomSettingsPanelProps {
  channel: WarRoomChannel;
  members: ChannelMemberPresence[];
  agents: Array<{ id: string; name: string; slug: string }>;
  onMembersChanged: () => void;
  onArchived: () => void;
  onDeleted: () => void;
  onUpdated: (channel: WarRoomChannel) => void;
}

const PRESENCE_DOT: Record<ChannelMemberPresence["presence"], string> = {
  online: "bg-emerald-500 wr-online-dot",
  idle: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};
const PRESENCE_LABEL: Record<ChannelMemberPresence["presence"], string> = {
  online: "online",
  idle: "vừa rời",
  offline: "offline",
};

const WAKE_MODE_DESCRIPTIONS: Record<WakeMode, string> = {
  ceo_only: "Chỉ CEO thức dậy → CEO tự delegate. An toàn cho phòng đông agent.",
  members: "Tất cả agents trong list dưới đây sẽ thức dậy mỗi tin. Cẩn thận khi >5 agents.",
  manual: "Không ai thức tự động. Chị tự gọi qua @mention hoặc giao trực tiếp.",
};

export function RoomSettingsPanel({
  channel,
  members,
  agents,
  onMembersChanged,
  onArchived,
  onDeleted,
  onUpdated,
}: RoomSettingsPanelProps) {
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);

  const settings = (channel.settings ?? {}) as Record<string, unknown>;
  const wakeMode: WakeMode = (settings.wake_mode as WakeMode | undefined) ?? "ceo_only";
  const notifyBrowser = settings.notify_browser !== false; // default true
  const notifySound = settings.notify_sound !== false; // default true
  const notifyOnlyMentions = !!settings.notify_only_mentions;

  const memberSlugs = new Set(members.map((m) => m.agent_slug));
  const availableAgents = agents.filter(
    (a) =>
      !memberSlugs.has(a.slug) &&
      (agentSearch ? `${a.name} ${a.slug}`.toLowerCase().includes(agentSearch.toLowerCase()) : true),
  );

  // Reset add-picker draft when channel changes
  useEffect(() => {
    setShowAddPicker(false);
    setAgentSearch("");
    setShowDeleteConfirm(false);
  }, [channel.id]);

  async function saveSetting(key: string, value: unknown) {
    setSavingSetting(key);
    try {
      const newSettings = { ...settings, [key]: value };
      const updated = await warRoomApi.updateChannel(channel.id, { settings: newSettings });
      onUpdated(updated);
    } finally {
      setSavingSetting(null);
    }
  }

  async function handleAddAgent(slug: string) {
    setAddingSlug(slug);
    try {
      await warRoomApi.addMember(channel.id, slug);
      onMembersChanged();
      setAgentSearch("");
    } finally {
      setAddingSlug(null);
    }
  }

  async function handleRemoveAgent(slug: string) {
    setRemovingSlug(slug);
    try {
      await warRoomApi.removeMember(channel.id, slug);
      onMembersChanged();
    } finally {
      setRemovingSlug(null);
    }
  }

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await warRoomApi.archiveChannel(channel.id);
      onArchived();
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await warRoomApi.deleteChannel(channel.id);
      onDeleted();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const overcrowded = members.length > 10 && wakeMode !== "ceo_only" && wakeMode !== "manual";

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3 max-h-[55vh] overflow-y-auto">
      {/* Info row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-muted-foreground">
          Loại: <span className="text-foreground font-medium">{channel.channel_type ?? "group"}</span>
        </span>
        <span className="text-muted-foreground">
          Tạo bởi: <span className="text-foreground font-medium">{channel.created_by ?? "system"}</span>
        </span>
        {channel.auto_created && <span className="text-amber-500 font-medium">Tự động tạo</span>}
        <span className="text-muted-foreground flex items-center gap-1">
          <Users size={10} />
          {members.length} agents
        </span>
      </div>

      {/* Linked entities */}
      {(channel.project_id || channel.goal_id) && (
        <div className="flex items-center gap-2 flex-wrap">
          {channel.project_id && (
            <span className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-blue-500/10 text-blue-500">
              <Folder size={10} /> Project <ExternalLink size={8} />
            </span>
          )}
          {channel.goal_id && (
            <span className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-green-500/10 text-green-500">
              <Target size={10} /> Goal <ExternalLink size={8} />
            </span>
          )}
        </div>
      )}

      {/* Wake mode (CRITICAL — controls how much CPU a single message in this channel costs) */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <Bell size={10} /> Tự động phản hồi của agents
          {savingSetting === "wake_mode" && <Loader2 size={9} className="animate-spin" />}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["ceo_only", "members", "manual"] as WakeMode[]).map((mode) => {
            const active = wakeMode === mode;
            const labelMap: Record<WakeMode, string> = {
              ceo_only: "CEO triage",
              members: "Tất cả members",
              manual: "Tắt tự động",
            };
            return (
              <button
                key={mode}
                onClick={() => saveSetting("wake_mode", mode)}
                disabled={savingSetting === "wake_mode"}
                className={`h-7 px-2.5 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                }`}
              >
                {labelMap[mode]}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{WAKE_MODE_DESCRIPTIONS[wakeMode]}</p>
        {overcrowded && (
          <div className="mt-1.5 flex items-start gap-2 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px]">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <div>
              Phòng có <strong>{members.length} agents</strong> với chế độ "Tất cả members" → mỗi tin có thể đánh thức {members.length} agents cùng lúc và làm máy lag. Cân nhắc đổi sang <strong>CEO triage</strong> hoặc giảm members xuống nhóm core.
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <Volume2 size={10} /> Thông báo
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input
            type="checkbox"
            checked={notifyBrowser}
            onChange={(e) => saveSetting("notify_browser", e.target.checked)}
            className="rounded border-border accent-primary"
          />
          <span>Thông báo trong trình duyệt</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input
            type="checkbox"
            checked={notifySound}
            onChange={(e) => saveSetting("notify_sound", e.target.checked)}
            className="rounded border-border accent-primary"
          />
          <span>Âm thanh khi có tin mới</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input
            type="checkbox"
            checked={notifyOnlyMentions}
            onChange={(e) => saveSetting("notify_only_mentions", e.target.checked)}
            className="rounded border-border accent-primary"
          />
          <span>Chỉ ping khi có @mention</span>
        </label>
      </div>

      {/* Members */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Users size={10} /> Agents trong phòng ({members.length})
          </div>
          <button
            onClick={() => setShowAddPicker((v) => !v)}
            className="h-6 px-2 text-[10px] font-medium rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors border-none cursor-pointer inline-flex items-center gap-1"
          >
            <UserPlus size={10} />
            {showAddPicker ? "Đóng" : "Thêm"}
          </button>
        </div>

        {showAddPicker && (
          <div className="rounded-md border border-border bg-background p-2 space-y-1">
            <input
              autoFocus
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder="Tìm agent theo tên hoặc slug…"
              className="w-full h-7 px-2 text-[11px] rounded bg-muted/30 border border-border outline-none focus:border-primary"
            />
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {availableAgents.length === 0 ? (
                <div className="text-[10px] text-muted-foreground py-2 text-center">
                  {agentSearch ? "Không tìm thấy agent." : "Tất cả agents đã trong phòng."}
                </div>
              ) : (
                availableAgents.slice(0, 20).map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => handleAddAgent(a.slug)}
                    disabled={addingSlug === a.slug}
                    className="w-full flex items-center gap-2 px-2 py-1 text-[11px] text-left rounded hover:bg-accent text-foreground border-none bg-transparent cursor-pointer disabled:opacity-50"
                  >
                    {addingSlug === a.slug ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <UserPlus size={10} className="text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-[9px] text-muted-foreground">{a.slug}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {members.length === 0 ? (
            <div className="text-[10px] text-muted-foreground py-2 text-center">
              Chưa có agent nào trong phòng. Bấm "Thêm" để mời.
            </div>
          ) : (
            members.map((m) => (
              <div key={m.agent_slug} className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-accent">
                <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[9px] font-bold">
                  {m.agent_name.slice(0, 2).toUpperCase()}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-background ${PRESENCE_DOT[m.presence]}`}
                  />
                </span>
                <span className="flex-1 text-[11px] truncate">{m.agent_name}</span>
                <span className="text-[9px] text-muted-foreground">{PRESENCE_LABEL[m.presence]}</span>
                {m.role && m.role !== "member" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold uppercase">
                    {m.role}
                  </span>
                )}
                <Tooltip label="Xoá agent khỏi phòng">
                  <button
                    onClick={() => handleRemoveAgent(m.agent_slug)}
                    disabled={removingSlug === m.agent_slug}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center border-none bg-transparent cursor-pointer transition-opacity disabled:opacity-100"
                  >
                    {removingSlug === m.agent_slug ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <UserMinus size={10} />
                    )}
                  </button>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toggles for project/goal channels */}
      {(channel.channel_type === "project" || channel.channel_type === "goal") && (
        <div className="space-y-1 pt-1">
          <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Settings size={10} /> Tự động đăng (project/goal)
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={!!settings.auto_post_issue_updates}
              onChange={(e) => saveSetting("auto_post_issue_updates", e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span>Post khi issue cập nhật</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={!!settings.auto_post_goal_progress}
              onChange={(e) => saveSetting("auto_post_goal_progress", e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span>Post tiến độ goal</span>
          </label>
        </div>
      )}

      {/* Danger zone — non-default only */}
      {!channel.is_default && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="h-6 px-2.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors border-none cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
          >
            {archiving ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
            Lưu trữ
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-6 px-2.5 text-[10px] font-medium rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border-none cursor-pointer inline-flex items-center gap-1"
            >
              <Trash2 size={10} /> Xoá
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-destructive font-medium">Xoá vĩnh viễn?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-6 px-2 text-[10px] font-medium rounded bg-destructive text-white hover:bg-destructive/90 transition-colors border-none cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={10} className="animate-spin" /> : "Xoá"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-6 px-2 text-[10px] rounded bg-transparent text-muted-foreground hover:text-foreground border-none cursor-pointer"
              >
                Huỷ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
