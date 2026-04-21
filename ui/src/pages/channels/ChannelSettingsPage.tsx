import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  ArrowLeft,
  Trash2,
  CheckCircle,
  Clock,
  Shield,
  Plus,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  channelsApi,
  type ChannelInstance,
  type PairingCode,
} from "@/api/channels";
import {
  agentConfigsApi,
  PROVIDER_LABELS,
  type AgentConfig,
} from "@/api/agentConfigs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DmPolicy = "open" | "allowlist" | "pairing" | "disabled";
type GroupPolicy = "open" | "allowlist" | "pairing" | "disabled";

const POLICY_OPTIONS: { value: DmPolicy; label: string }[] = [
  { value: "open", label: "Mở (bất kỳ ai)" },
  { value: "allowlist", label: "Danh sách (chỉ UID cho phép)" },
  { value: "pairing", label: "Ghép nối (cần duyệt mã)" },
  { value: "disabled", label: "Tắt" },
];

export function ChannelSettingsPage() {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Form state
  const [agentSlug, setAgentSlug] = useState("");
  const [dmPolicy, setDmPolicy] = useState<DmPolicy>("open");
  const [groupPolicy, setGroupPolicy] = useState<GroupPolicy>("disabled");
  const [requireMention, setRequireMention] = useState(false);
  const [quotaHour, setQuotaHour] = useState(60);
  const [quotaDay, setQuotaDay] = useState(500);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [allowFrom, setAllowFrom] = useState<string[]>([]);
  const [saveContactsToCrm, setSaveContactsToCrm] = useState(true);
  const [newUid, setNewUid] = useState("");
  const [saved, setSaved] = useState(false);

  // Load channel settings
  const { data: channel, isLoading } = useQuery({
    queryKey: ["channels", "settings", channelName],
    queryFn: () => channelsApi.getChannelSettings(channelName!),
    enabled: !!channelName,
  });

  // Load pairing codes
  const { data: pairingCodes = [] } = useQuery({
    queryKey: ["channels", "pairing", channelName],
    queryFn: () => channelsApi.listPairingCodes(channelName!),
    enabled: !!channelName,
    refetchInterval: 10_000,
  });

  // Populate form when data loads
  useEffect(() => {
    if (channel) {
      setAgentSlug(channel.agent_slug || "");
      setDmPolicy((channel.dm_policy as DmPolicy) || "open");
      setGroupPolicy((channel.group_policy as GroupPolicy) || "disabled");
      setRequireMention(channel.require_mention ?? false);
      setQuotaHour(channel.quota_hour ?? 60);
      setQuotaDay(channel.quota_day ?? 500);
      setHistoryLimit(channel.history_limit ?? 50);
      setAllowFrom(channel.allow_from || []);
      setSaveContactsToCrm(channel.save_contacts_to_crm ?? true);
    }
  }, [channel]);

  // Save settings
  const saveMut = useMutation({
    mutationFn: () =>
      channelsApi.updateChannelSettings(channelName!, {
        agent_slug: agentSlug || null,
        dm_policy: dmPolicy,
        group_policy: groupPolicy,
        require_mention: requireMention,
        quota_hour: quotaHour,
        quota_day: quotaDay,
        history_limit: historyLimit,
        allow_from: allowFrom,
        save_contacts_to_crm: saveContactsToCrm,
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels", "settings", channelName] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Approve pairing code
  const approveMut = useMutation({
    mutationFn: (code: string) => channelsApi.approvePairingCode(channelName!, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels", "pairing", channelName] });
      qc.invalidateQueries({ queryKey: ["channels", "settings", channelName] });
    },
  });

  function addUid() {
    const uid = newUid.trim();
    if (uid && !allowFrom.includes(uid)) {
      setAllowFrom([...allowFrom, uid]);
      setNewUid("");
    }
  }

  function removeUid(uid: string) {
    setAllowFrom(allowFrom.filter((u) => u !== uid));
  }

  if (!channelName) {
    // No specific channel — show list of channels to configure
    return <ChannelSettingsList />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("../channels/settings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cài đặt kênh: {channel?.display_name || channelName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Loại: {channel?.channel_type || "N/A"} · Trạng thái:{" "}
            <Badge
              variant={channel?.status === "connected" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {channel?.status || "N/A"}
            </Badge>
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && channel && (
        <>
          {/* Agent */}
          <AgentPickerSection agentSlug={agentSlug} onChange={setAgentSlug} />

          {/* DM Policy */}
          <Section title="Chính sách DM">
            <div className="grid grid-cols-2 gap-2">
              {POLICY_OPTIONS.map((opt) => (
                <PolicyButton
                  key={opt.value}
                  label={opt.label}
                  active={dmPolicy === opt.value}
                  onClick={() => setDmPolicy(opt.value)}
                />
              ))}
            </div>
          </Section>

          {/* Group Policy */}
          <Section title="Chính sách nhóm">
            <div className="grid grid-cols-2 gap-2">
              {POLICY_OPTIONS.map((opt) => (
                <PolicyButton
                  key={opt.value}
                  label={opt.label}
                  active={groupPolicy === opt.value}
                  onClick={() => setGroupPolicy(opt.value)}
                />
              ))}
            </div>
          </Section>

          {/* Require @mention */}
          <Section title="Yêu cầu @mention trong nhóm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={requireMention}
                onChange={(e) => setRequireMention(e.target.checked)}
              />
              <span className="text-sm">Chỉ trả lời khi được @mention trong nhóm</span>
            </label>
          </Section>

          {/* Save contacts to CRM */}
          <Section title="CRM — Lưu liên hệ">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={saveContactsToCrm}
                onChange={(e) => setSaveContactsToCrm(e.target.checked)}
              />
              <span className="text-sm">Tự động lưu liên hệ vào CRM khi có tin nhắn mới</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Tắt cho kênh cá nhân (bạn bè, gia đình) — tin nhắn vẫn hiện trong Inbox nhưng không tạo khách hàng CRM
            </p>
          </Section>

          {/* Quota */}
          <Section title="Hạn mức (Quota)">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Tin nhắn / giờ</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={quotaHour}
                  onChange={(e) => setQuotaHour(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tin nhắn / ngày</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={quotaDay}
                  onChange={(e) => setQuotaDay(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </Section>

          {/* History limit */}
          <Section title="Giới hạn lịch sử hội thoại">
            <input
              type="number"
              className="w-32 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={historyLimit}
              onChange={(e) => setHistoryLimit(Number(e.target.value))}
              min={1}
              max={500}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Số tin nhắn lưu trữ cho ngữ cảnh của agent
            </p>
          </Section>

          {/* Allowlist */}
          <Section title="Danh sách cho phép (UIDs)">
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Nhập UID..."
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUid();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addUid}>
                <Plus className="h-3 w-3 mr-1" /> Thêm
              </Button>
            </div>
            {allowFrom.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có UID nào trong danh sách</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {allowFrom.map((uid) => (
                <Badge key={uid} variant="secondary" className="text-xs gap-1 pr-1">
                  {uid}
                  <button
                    className="ml-0.5 hover:text-destructive"
                    onClick={() => removeUid(uid)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </Section>

          {/* Pending pairing codes */}
          {pairingCodes.length > 0 && (
            <Section title="Mã ghép nối chờ duyệt">
              <div className="space-y-2">
                {pairingCodes.map((pc: PairingCode) => (
                  <div
                    key={pc.id}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div>
                      <div className="text-sm font-mono font-medium">{pc.code}</div>
                      <div className="text-xs text-muted-foreground">
                        {pc.sender_name} ({pc.sender_id})
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Hết hạn: {new Date(pc.expires_at).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMut.mutate(pc.code)}
                      disabled={approveMut.isPending}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Duyệt
                    </Button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              {saveMut.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Đã lưu
              </span>
            )}
            {saveMut.isError && (
              <span className="text-sm text-destructive">
                Lỗi: {saveMut.error instanceof Error ? saveMut.error.message : "Không thể lưu"}
              </span>
            )}
          </div>
        </>
      )}

      {!isLoading && !channel && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground">Không tìm thấy kênh: {channelName}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate("../channels")}
          >
            Quay lại
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Channel settings list (no specific channel selected)
 */
function ChannelSettingsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showQR, setShowQR] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const renameMut = useMutation({
    mutationFn: async ({ name, displayName }: { name: string; displayName: string }) => {
      const r = await fetch(`/api/channels/settings/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!r.ok) throw new Error("Lỗi đổi tên");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); setEditingName(null); },
  });

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["channels", "instances"],
    queryFn: channelsApi.listInstances,
  });

  const startMut = useMutation({
    mutationFn: (name: string) => channelsApi.startChannel(name),
    onSettled: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
  const stopMut = useMutation({
    mutationFn: (name: string) => channelsApi.stopChannel(name),
    onSettled: () => { qc.invalidateQueries({ queryKey: ["channels"] }); qc.invalidateQueries({ queryKey: ["config-channels"] }); },
  });
  const deleteMut = useMutation({
    mutationFn: (name: string) => channelsApi.deleteChannel(name),
    onSettled: () => { qc.invalidateQueries({ queryKey: ["channels"] }); qc.invalidateQueries({ queryKey: ["config-channels"] }); },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cài đặt kênh
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý kết nối · Cấu hình chính sách · Gán agent
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("../channels/zalo-personal")}>
          <Plus className="h-3 w-3 mr-1" /> Kết nối tài khoản
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && instances.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground text-sm">Chưa có kênh nào được cấu hình</p>
        </div>
      )}

      <div className="space-y-2">
        {instances.map((inst: any) => (
          <div
            key={inst.id}
            className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/30 transition-colors"
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`../channels/settings/${encodeURIComponent(inst.name)}`)}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  inst.status === "connected"
                    ? "bg-green-500"
                    : inst.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
                }`}
              />
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-1.5">
                  {editingName === inst.name ? (
                    <input
                      autoFocus
                      className="border rounded px-1.5 py-0.5 text-sm w-48"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editValue.trim()) renameMut.mutate({ name: inst.name, displayName: editValue.trim() });
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      onBlur={() => { if (editValue.trim() && editValue !== inst.display_name) renameMut.mutate({ name: inst.name, displayName: editValue.trim() }); else setEditingName(null); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      {inst.display_name || inst.name}
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); setEditingName(inst.name); setEditValue(inst.display_name || inst.name); }}
                        title="Đổi tên kênh"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {inst.channel_type}
                  {inst.status === "error" && inst.status_message && (
                    <span className="text-red-500 ml-1">{inst.status_message}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px]">
                {inst.agent_slug || "không có agent"}
              </Badge>
              {inst.channel_type === "zalo_personal" && (
                <>
                  {inst.status === "connected" ? (
                    <Button size="sm" variant="outline" onClick={async (e) => {
                      e.stopPropagation();
                      await channelsApi.stopChannel(inst.name);
                      await fetch(`/api/channels/settings/${inst.name}`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ enabled: false }) });
                      qc.invalidateQueries({ queryKey: ["channels"] });
                      qc.invalidateQueries({ queryKey: ["config-channels"] });
                    }}>
                      Dừng
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={async (e) => {
                      e.stopPropagation();
                      await fetch(`/api/channels/settings/${inst.name}`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ enabled: true }) });
                      await channelsApi.startChannel(inst.name);
                      qc.invalidateQueries({ queryKey: ["channels"] });
                      qc.invalidateQueries({ queryKey: ["config-channels"] });
                    }}>
                      Bắt đầu
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await fetch(`/api/channels/zalo-personal/${encodeURIComponent(inst.name)}/refresh-key`, { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        alert(`Đã refresh key thành công!\n${data.message}`);
                      } else {
                        const retry = confirm(`Refresh key thất bại: ${data.message}\n\nBạn có muốn đăng nhập lại bằng QR?`);
                        if (retry) {
                          await channelsApi.stopChannel(inst.name);
                          navigate(`../channels/zalo-personal?relogin=${encodeURIComponent(inst.name)}`);
                        }
                      }
                    } catch (err: any) {
                      alert(`Lỗi: ${err.message}`);
                    }
                    qc.invalidateQueries({ queryKey: ["channels"] });
                  }} title="Refresh encryption key (thử trước) hoặc đăng nhập lại QR">
                    <RefreshCw className="h-3 w-3 mr-1" /> Đăng nhập lại
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(inst.name);
                  }} disabled={deleteMut.isPending} title="Xóa kênh">
                    {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

function AgentPickerSection({
  agentSlug,
  onChange,
}: {
  agentSlug: string;
  onChange: (slug: string) => void;
}) {
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["agent-configs"],
    queryFn: agentConfigsApi.fetchAll,
  });

  const selectedAgent = agents.find((a) => a.slug === agentSlug) || null;

  return (
    <Section title="Agent mặc định">
      <select
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={agentSlug}
        onChange={(e) => onChange(e.target.value)}
        disabled={agentsLoading}
      >
        <option value="">-- Không có agent --</option>
        {agents.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.display_name} ({a.slug})
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground mt-1">
        Agent sẽ xử lý tin nhắn tự động cho kênh này
      </p>

      {/* Agent preview card */}
      {selectedAgent && (
        <div className="mt-3 border rounded-md p-3 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
              {selectedAgent.avatar || selectedAgent.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{selectedAgent.display_name}</div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {PROVIDER_LABELS[selectedAgent.provider] || selectedAgent.provider}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {selectedAgent.model}
                </Badge>
                {!selectedAgent.enabled && (
                  <Badge variant="destructive" className="text-[10px]">Tắt</Badge>
                )}
              </div>
            </div>
          </div>
          {selectedAgent.system_prompt && (
            <div className="mt-2 text-[11px] text-muted-foreground border-t pt-2">
              <span className="font-medium">System prompt:</span>{" "}
              <span className="line-clamp-2">{selectedAgent.system_prompt}</span>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function PolicyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-2 text-xs text-left transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground font-medium"
          : "border-border text-muted-foreground hover:border-foreground/30"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
