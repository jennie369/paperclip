// Tool Audit Log — danh sách mọi tool call (verify_customer, lookup_order,
// create_ticket, send_email, ...) mà các agent đã thực hiện. Cho phép filter
// theo agent / tool / success status để debug, audit và compliance.
//
// Backend endpoint: GET /api/training/audit-log
// Source code: paperclip/server/src/training/training-routes.ts

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";
import { trainingApi, type ToolAuditEntry } from "@/api/training";

const TOOL_OPTIONS = [
  { value: "", label: "Tất cả tools" },
  { value: "verify_customer_identity", label: "verify_customer_identity" },
  { value: "lookup_order_shopify", label: "lookup_order_shopify" },
  { value: "get_customer_info", label: "get_customer_info" },
  { value: "check_course_access", label: "check_course_access" },
  { value: "create_order", label: "create_order" },
  { value: "create_ticket", label: "create_ticket" },
  { value: "send_email", label: "send_email" },
  { value: "search_product", label: "search_product" },
  { value: "search_knowledge", label: "search_knowledge" },
  { value: "recall_memory", label: "recall_memory" },
  { value: "kg_lookup_entity", label: "kg_lookup_entity" },
  { value: "kg_traverse", label: "kg_traverse" },
  { value: "crm_update", label: "crm_update" },
  { value: "link_gemral_account", label: "link_gemral_account" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Thành công" },
  { value: "false", label: "Lỗi" },
];

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return Math.round(ms / 1_000) + "s trước";
  if (ms < 3_600_000) return Math.round(ms / 60_000) + " phút trước";
  if (ms < 86_400_000) return Math.round(ms / 3_600_000) + " giờ trước";
  return Math.round(ms / 86_400_000) + " ngày trước";
}

function formatArgs(args: unknown): string {
  if (!args) return "{}";
  try {
    const json = typeof args === "string" ? args : JSON.stringify(args);
    return json.length > 80 ? json.slice(0, 77) + "..." : json;
  } catch {
    return String(args);
  }
}

export function ToolAuditLogPage() {
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [toolFilter, setToolFilter] = useState<string>("");
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("");

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["training", "audit-log", agentFilter, toolFilter, successFilter],
    queryFn: () =>
      trainingApi.listAuditLog({
        agent: agentFilter || undefined,
        tool: toolFilter || undefined,
        success: successFilter || undefined,
        limit: 200,
      }),
    refetchInterval: 10_000,
  });

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#0A0B1A] p-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-white mb-1">Tool Audit Log</h1>
        <p className="text-[12px] text-white/40">
          Mọi tool call agent thực hiện (verify customer, lookup order, create ticket...).
          Audit + debug + compliance trail cho từng action.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 mb-4 flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-white/40" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/40 uppercase">Agent</span>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              placeholder="sales-closer"
              className="h-8 w-40 pl-7 pr-2.5 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/25 focus:border-[#6A5BFF]/40 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/40 uppercase">Tool</span>
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            className="h-8 px-2.5 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:border-[#6A5BFF]/40 focus:outline-none"
          >
            {TOOL_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/40 uppercase">Trạng thái</span>
          <select
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value as "" | "true" | "false")}
            className="h-8 px-2.5 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:border-[#6A5BFF]/40 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <span className="text-[11px] text-white/30">{entries.length} bản ghi</span>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-[11px] font-semibold rounded-md border border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-[rgba(15,16,48,0.2)]">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                Thời gian
              </th>
              <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                Agent
              </th>
              <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                Tool
              </th>
              <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04]">
                Args
              </th>
              <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04]">
                Result
              </th>
              <th className="text-center p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/30 text-[12px]">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <Wrench size={32} className="mx-auto mb-2 text-white/10" />
                  <div className="text-[14px] text-white/35">Chưa có tool call nào</div>
                  <div className="text-[12px] text-white/20 mt-1">
                    Khi agent gọi tool, nó sẽ xuất hiện ở đây
                  </div>
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AuditRowProps {
  entry: ToolAuditEntry;
}

function AuditRow({ entry }: AuditRowProps) {
  return (
    <tr className="hover:[&>td]:bg-white/[0.02]">
      <td className="p-2.5 text-white/60 border-b border-white/[0.02] align-middle whitespace-nowrap">
        {timeAgo(entry.ts)}
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle whitespace-nowrap">
        <span className="inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded bg-[#6A5BFF]/12 text-[#6A5BFF]">
          {entry.agent_slug}
        </span>
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle whitespace-nowrap">
        <span className="text-[#FFBD59] font-semibold text-[12px]">{entry.tool_name}</span>
      </td>
      <td className="p-2.5 text-white/60 border-b border-white/[0.02] align-middle font-mono text-[11px]">
        {formatArgs(entry.args)}
      </td>
      <td className="p-2.5 text-white/60 border-b border-white/[0.02] align-middle">
        {entry.error ? (
          <span className="text-[#FF6B6B] text-[11px]">{entry.error.slice(0, 80)}</span>
        ) : (
          <span className="text-white/50 text-[11px]">{entry.result_summary || "—"}</span>
        )}
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle text-center">
        {entry.success ? (
          <CheckCircle size={14} className="text-[#3AF7A6] mx-auto" />
        ) : (
          <XCircle size={14} className="text-[#FF6B6B] mx-auto" />
        )}
      </td>
    </tr>
  );
}
