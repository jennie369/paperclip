// Đọc JSON từ fetch Response, ném Error (kèm `error` của server) khi !res.ok.
// Dùng cho useMutation: mutationFn ném lỗi → onSuccess KHÔNG chạy → modal/form giữ nguyên, hiện lỗi.
export async function readJsonOrThrow<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `${fallbackMessage} (${res.status})`);
  }
  return res.json();
}
