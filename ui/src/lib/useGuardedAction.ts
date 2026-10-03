import { useCallback } from "react";
import { useToast } from "@/context/ToastContext";

/**
 * Bọc handler async (onClick/submit) gọi `fetchOk`: lỗi → toast đỏ kèm thông điệp server, trả `undefined`;
 * thành công → trả giá trị của `fn`. Đặt refetch/đóng modal SAU `fetchOk` trong `fn` để lỗi thì bỏ qua.
 */
export function useGuardedAction() {
  const { pushToast } = useToast();
  return useCallback(
    async <T,>(fn: () => Promise<T>, errorTitle = "Thao tác thất bại"): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        pushToast({ title: errorTitle, body: e instanceof Error ? e.message : String(e), tone: "error" });
        return undefined;
      }
    },
    [pushToast],
  );
}
