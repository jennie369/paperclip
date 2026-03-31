import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ZaloPersonalQRDialog({ open, onOpenChange, onSuccess }: Props) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(100);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    startConnect();
    return () => cleanup();
  }, [open]);

  function reset() {
    cleanup();
    setQrImage(null);
    setStatus("idle");
    setError(null);
    setCountdown(100);
  }

  function cleanup() {
    esRef.current?.close();
    esRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startConnect() {
    cleanup();
    const name = `zalo-personal-${Date.now()}`;
    setStatus("generating_qr");
    setError(null);
    setQrImage(null);
    setCountdown(100);

    const es = new EventSource(`/api/channels/zalo-personal/connect?name=${encodeURIComponent(name)}&display_name=Zalo+Personal`);
    esRef.current = es;

    timerRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "qr_code" && data.image) {
          setQrImage(data.image);
          setStatus("waiting_scan");
        } else if (data.event === "waiting_confirm") {
          setStatus("waiting_confirm");
        } else if (data.event === "validating") {
          setStatus("validating");
        } else if (data.event === "qr_done" || data.event === "connected") {
          setStatus("connected");
          cleanup();
          setTimeout(() => onSuccess(), 1500);
        } else if (data.event === "qr_expired") {
          setStatus("expired");
          setError("QR đã hết hạn");
          cleanup();
        } else if (data.event === "error" || data.event === "failed") {
          setStatus("error");
          setError(data.message || "Kết nối thất bại");
          cleanup();
        }
      } catch {}
    };

    es.onerror = () => {
      setStatus("error");
      setError("Mất kết nối server");
      cleanup();
    };
  }

  const labels: Record<string, string> = {
    idle: "Đang khởi tạo...",
    generating_qr: "Đang tạo mã QR...",
    waiting_scan: "Quét mã QR bằng Zalo app",
    waiting_confirm: "Xác nhận trên Zalo...",
    validating: "Đang xác thực...",
    connected: "Kết nối thành công!",
    expired: "QR đã hết hạn",
    error: error || "Lỗi",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kết nối Zalo Cá Nhân</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-amber-500 font-medium">
          ⚠️ Dùng tài khoản PHỤ, KHÔNG dùng tài khoản chính
        </p>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "connected" && (
            <p className="text-sm text-green-500 font-medium">Kết nối thành công!</p>
          )}

          {qrImage && status === "waiting_scan" && (
            <>
              <div className="bg-white p-2 rounded">
                <img
                  src={qrImage.startsWith("data:") ? qrImage : `data:image/png;base64,${qrImage}`}
                  alt="Zalo QR"
                  className="w-48 h-48"
                />
              </div>
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{labels[status]}</span>
                  <span>{countdown}s</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(countdown / 100) * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {!qrImage && !["connected", "error", "expired"].includes(status) && (
            <p className="text-sm text-muted-foreground py-8">{labels[status]}</p>
          )}

          {(status === "error" || status === "expired") && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {status === "connected" ? "Đóng" : "Hủy"}
          </Button>
          {(status === "error" || status === "expired") && (
            <Button onClick={startConnect}>Tạo lại QR</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
