import { useState } from "react";
import { Archive, Loader2, Trash2, Users, Settings, Folder, Target, ExternalLink } from "lucide-react";
import { warRoomApi, type WarRoomChannel } from "../../api/warRoom";

interface RoomSettingsPanelProps {
  channel: WarRoomChannel;
  onArchived: () => void;
  onDeleted: () => void;
  onUpdated: (channel: WarRoomChannel) => void;
}

export function RoomSettingsPanel({ channel, onArchived, onDeleted, onUpdated }: RoomSettingsPanelProps) {
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Load member count on mount
  useState(() => {
    setLoadingMembers(true);
    warRoomApi.getChannelMembers(channel.id).then((members) => {
      setMemberCount(members.length);
      setLoadingMembers(false);
    });
  });

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

  const toggleSetting = async (key: string, value: boolean) => {
    const newSettings = { ...(channel.settings as Record<string, unknown> ?? {}), [key]: value };
    const updated = await warRoomApi.updateChannel(channel.id, { settings: newSettings });
    onUpdated(updated);
  };

  const settings = (channel.settings ?? {}) as Record<string, unknown>;

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3">
      {/* Info row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-muted-foreground">
          Loại: <span className="text-foreground font-medium">{channel.channel_type ?? "group"}</span>
        </span>
        <span className="text-muted-foreground">
          Tạo bởi: <span className="text-foreground font-medium">{channel.created_by ?? "system"}</span>
        </span>
        {channel.auto_created && (
          <span className="text-amber-500 font-medium">Tự động tạo</span>
        )}
        <span className="text-muted-foreground flex items-center gap-1">
          <Users size={10} />
          {loadingMembers ? "..." : `${memberCount ?? 0} agents`}
        </span>
      </div>

      {/* Links */}
      {(channel.project_id || channel.goal_id) && (
        <div className="flex items-center gap-2 flex-wrap">
          {channel.project_id && (
            <span className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-blue-500/10 text-blue-500 cursor-pointer hover:bg-blue-500/20 transition-colors">
              <Folder size={10} /> Project <ExternalLink size={8} />
            </span>
          )}
          {channel.goal_id && (
            <span className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20 transition-colors">
              <Target size={10} /> Goal <ExternalLink size={8} />
            </span>
          )}
        </div>
      )}

      {/* Settings toggles */}
      {(channel.channel_type === "project" || channel.channel_type === "goal") && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Settings size={10} /> Cài đặt tự động
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.auto_post_issue_updates}
              onChange={(e) => toggleSetting("auto_post_issue_updates", e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-[11px]">Tự động post khi issue cập nhật</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.auto_post_goal_progress}
              onChange={(e) => toggleSetting("auto_post_goal_progress", e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-[11px]">Tự động post tiến độ goal</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="h-6 px-2.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors border-none cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
          title="Lưu trữ — ẩn khỏi sidebar, giữ dữ liệu"
        >
          {archiving ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
          Lưu trữ
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="h-6 px-2.5 text-[10px] font-medium rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border-none cursor-pointer inline-flex items-center gap-1"
            title="Xóa vĩnh viễn phòng này và toàn bộ tin nhắn"
          >
            <Trash2 size={10} />
            Xóa
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-destructive font-medium">Xóa vĩnh viễn?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-6 px-2 text-[10px] font-medium rounded bg-destructive text-white hover:bg-destructive/90 transition-colors border-none cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={10} className="animate-spin" /> : "Xóa"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="h-6 px-2 text-[10px] rounded bg-transparent text-muted-foreground hover:text-foreground border-none cursor-pointer"
            >
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
