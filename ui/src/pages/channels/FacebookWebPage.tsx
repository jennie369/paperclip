// FacebookWebPage — list + manage Facebook Web Login channels.
// Ported from ZaloPersonalPage pattern.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi, type ChannelInstance } from "@/api/channels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FacebookWebSetupDialog } from "./FacebookWebSetupDialog";
import { useNavigate } from "react-router-dom";
import { Facebook, MessageCircle, RotateCw, Trash2, Plus, ShieldAlert } from "lucide-react";

export function FacebookWebPage() {
  const [setupOpen, setSetupOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels", "facebook-web"],
    queryFn: channelsApi.listFacebookWeb,
    refetchInterval: 10_000,
  });

  const restartMut = useMutation({
    mutationFn: (name: string) => channelsApi.restartFacebookWeb(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (name: string) => channelsApi.deleteFacebookWeb(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Facebook Web (Reverse Protocol)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bypass Graph API webhook — nhận tin nhắn Page bằng browser session admin
          </p>
        </div>
        <Button onClick={() => setSetupOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Kết nối Page
        </Button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 mb-4 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <p className="font-medium">Cảnh báo rủi ro</p>
          <p className="mt-0.5">
            Web Login không phải official method. Tuân thủ rate limit 50 send/giờ, dùng IP cố định, không spam.
            Nếu account bị checkpoint, kết nối sẽ tự dừng và alert qua Telegram.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-center py-8">Đang tải...</p>}

      {!isLoading && channels.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Facebook className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Chưa có Page nào kết nối qua Web Login</p>
          <Button onClick={() => setSetupOpen(true)} size="sm" className="mt-3">
            Kết nối Page đầu tiên
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {channels.map((ch: ChannelInstance) => (
          <div key={ch.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  ch.status === "connected"
                    ? "bg-green-500"
                    : ch.status === "error" || ch.status === "banned"
                    ? "bg-red-500"
                    : "bg-gray-400"
                }`}
              />
              <div>
                <div className="font-medium">{ch.display_name || ch.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Badge variant={ch.status === "connected" ? "default" : "secondary"} className="text-[10px]">
                    {ch.status === "connected"
                      ? "Đang kết nối"
                      : ch.status === "error"
                      ? "Lỗi"
                      : ch.status === "banned"
                      ? "Bị chặn"
                      : ch.status === "connecting"
                      ? "Đang kết nối..."
                      : "Đã ngắt"}
                  </Badge>
                  {ch.status_message && (
                    <span className="text-destructive truncate max-w-xs" title={ch.status_message}>
                      {ch.status_message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => navigate("../channels/inbox")}>
                <MessageCircle className="h-3 w-3 mr-1" /> Tin nhắn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => restartMut.mutate(ch.name)}
                disabled={restartMut.isPending}
                title="Restart MQTT connection"
              >
                <RotateCw className={`h-3 w-3 mr-1 ${restartMut.isPending ? "animate-spin" : ""}`} /> Restart
              </Button>
              {confirmDelete === ch.name ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    onClick={() => {
                      deleteMut.mutate(ch.name);
                      setConfirmDelete(null);
                    }}
                  >
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

      <FacebookWebSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={() => {
          setSetupOpen(false);
          qc.invalidateQueries({ queryKey: ["channels"] });
        }}
      />
    </div>
  );
}
