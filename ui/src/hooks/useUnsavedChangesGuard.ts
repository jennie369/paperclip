import { useEffect } from "react";

/**
 * Dirty-guard cho form: khi `isDirty` = true (người dùng đã nhập mà chưa lưu/gửi),
 * cảnh báo trước khi đóng/reload tab. Paperclip UI dùng <BrowserRouter> (không phải data router)
 * nên không có useBlocker — beforeunload là lớp bảo vệ khả dụng duy nhất.
 *
 * @param isDirty  form có thay đổi chưa lưu — PHẢI suy ra từ state thật
 *                 (so với giá trị ban đầu), KHÔNG hardcode true/false.
 * @param disabled tắt guard (đang gửi / đã gửi thành công).
 */
export function useUnsavedChangesGuard(isDirty: boolean, disabled = false): void {
  useEffect(() => {
    if (!isDirty || disabled) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, disabled]);
}
