import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi, type ChannelInstance } from "@/api/channels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZaloPersonalQRDialog } from "./ZaloPersonalQRDialog";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Play, Square, Trash2, Plus, Pencil, Check, X } from "lucide-react";

export function ZaloPersonalPage() {
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels", "zalo-personal"],
    queryFn: channelsApi.listZaloPersonal,
  });

  const startMut = useMutation({
    mutationFn: (name: string) => channelsApi.startChannel(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  const stopMut = useMutation({
    mutationFn: (name: string) => channelsApi.stopChannel(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (name: string) => channelsApi.deleteChannel(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Zalo Cá Nhân
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý kết nối Zalo Personal</p>
        </div>
        <Button onClick={() => setQrOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Kết nối tài khoản
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-center py-8">Đang tải...</p>}

      {!isLoading && channels.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Chưa có kết nối Zalo nào</p>
          <Button onClick={() => setQrOpen(true)} size="sm" className="mt-3">
            Kết nối ngay
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {channels.map((ch: ChannelInstance) => (
          <div key={ch.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${
                ch.status === "connected" ? "bg-green-500" :
                ch.status === "error" ? "bg-red-500" : "bg-gray-400"
              }`} />
              <div>
                <div className="font-medium flex items-center gap-1.5">
                  {editingName === ch.name ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="text-sm border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editNameValue.trim()) {
                            channelsApi.updateChannelSettings(ch.name, { display_name: editNameValue.trim() } as any)
                              .then(() => { qc.invalidateQueries({ queryKey: ["channels"] }); setEditingName(null); });
                          }
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        autoFocus
                      />
                      <button className="text-green-600 hover:text-green-700" onClick={() => {
                        if (editNameValue.trim()) {
                          channelsApi.updateChannelSettings(ch.name, { display_name: editNameValue.trim() } as any)
                            .then(() => { qc.invalidateQueries({ queryKey: ["channels"] }); setEditingName(null); });
                        }
                      }}><Check className="h-3.5 w-3.5" /></button>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setEditingName(null)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {ch.display_name || ch.name}
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditingName(ch.name); setEditNameValue(ch.display_name || ch.name); }}
                        title="Đổi tên kênh"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ch.zalo_uid && `UID: ${ch.zalo_uid} · `}
                  <Badge variant={ch.status === "connected" ? "default" : "secondary"} className="text-[10px]">
                    {ch.status === "connected" ? "Đang kết nối" : ch.status === "error" ? "Lỗi" : "Đã ngắt"}
                  </Badge>
                  {ch.status_message && <span className="ml-1 text-destructive">{ch.status_message}</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => navigate("../channels/inbox")}>
                <MessageCircle className="h-3 w-3 mr-1" /> Tin nhắn
              </Button>
              {ch.status === "connected" ? (
                <Button variant="outline" size="sm" onClick={() => stopMut.mutate(ch.name)}>
                  <Square className="h-3 w-3 mr-1" /> Dừng
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => startMut.mutate(ch.name)}>
                  <Play className="h-3 w-3 mr-1" /> Bắt đầu
                </Button>
              )}
              {confirmDelete === ch.name ? (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => {
                    deleteMut.mutate(ch.name);
                    setConfirmDelete(null);
                  }}>
                    Xác nhận xóa
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setConfirmDelete(null)}>
                    Hủy
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(ch.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ZaloPersonalQRDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        onSuccess={() => {
          setQrOpen(false);
          qc.invalidateQueries({ queryKey: ["channels"] });
        }}
      />
    </div>
  );
}
