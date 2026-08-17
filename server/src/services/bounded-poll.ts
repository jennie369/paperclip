import type { Db } from "@paperclipai/db";
import { sql } from "drizzle-orm";

// F2 (plan 2026-08-18 pooler-stall): bound thao tác DB quét-due của scheduler tick bằng
// transaction + SET LOCAL statement_timeout. Trước fix, query poll của tick (vd
// tickScheduledTriggers SELECT routine_triggers) chạy với statement_timeout GLOBAL = 2 phút;
// khi Supabase Micro swap-thrash, query treo ở PARSE tới 2 phút, giữ 1 slot runtime pool
// (max:10) → nhiều tick chồng → pool wedge → /api/health 503 → restart (đo E3: 5/5 stall là
// đúng query này). SET LOCAL chỉ áp TRONG transaction (không đụng query dài hợp lệ ngoài
// scheduler như heartbeat.list/agent execution — đó là lý do KHÔNG set statement_timeout global
// trên cả runtime pool). Cơ chế đã verify chạy trên Supavisor :6543 (transaction pooler) ở
// health.ts từ 16/08 (BUG-082). Timeout 15s < health deadline chuỗi + đủ rộng cho scan bình thường.
export const SCHEDULER_POLL_TIMEOUT_MS = 15_000;

type SchedulerTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function boundedPoll<T>(
  db: Db,
  fn: (tx: SchedulerTx) => Promise<T>,
  timeoutMs: number = SCHEDULER_POLL_TIMEOUT_MS,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${Math.max(1, Math.floor(timeoutMs))}`));
    return fn(tx);
  });
}
