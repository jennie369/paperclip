// Đọc JSON từ fetch Response, ném Error (kèm `error` của server) khi !res.ok.
// Dùng cho useMutation: mutationFn ném lỗi → onSuccess KHÔNG chạy → modal/form giữ nguyên, hiện lỗi.
async function throwHttpError(res: Response, fallbackMessage: string): Promise<never> {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as any).error || `${fallbackMessage} (${res.status})`);
}

export async function readJsonOrThrow<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) await throwHttpError(res, fallbackMessage);
  return res.json();
}

/**
 * fetch() ghi dữ liệu (POST/PUT/PATCH/DELETE) mà ném Error khi !res.ok — thay cho `await fetch(...)` trần
 * (4xx/5xx im lặng → code phía sau refetch/đóng modal như thành công). Dùng kèm `useGuardedAction` để hiện toast lỗi.
 */
export async function fetchOk(input: RequestInfo | URL, init?: RequestInit, fallbackMessage = "Thao tác thất bại"): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok) await throwHttpError(res, fallbackMessage);
  return res;
}
