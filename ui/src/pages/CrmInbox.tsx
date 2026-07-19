/**
 * CrmInbox — live Command Center (Phase B read-path wire).
 *
 * Renders <CrmMessagingCommandCenter> against the real unified-inbox API
 * (channelsApi): channel rail (real instances + per-account unread), conversation
 * list, selected thread transcript, Customer 360, working filters, and Bot/Sale
 * handoff (metadata.bot_paused). Full-page, no card padding. Sending hits
 * `/api/channels/send`; mark-read + bot-toggle hit their endpoints and refetch.
 *
 * Additive surface — does NOT touch the existing "Hộp thư"/Unified Inbox. The
 * AI Copilot / sentiment / SLA / review-capture remain showcase defaults until
 * their backends exist (Phase C). Route: /:companyPrefix/crm-inbox.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, AlertTriangle, RotateCw } from "lucide-react";
import { channelsApi } from "@/api/channels";
import type { ChannelSession } from "@/api/channels";
import { CrmMessagingCommandCenter } from "@/components/crm-messaging";
import {
  mapConversation,
  mapHeader,
  mapCrm,
  mapMessages,
  buildChannelGroups,
} from "@/components/crm-messaging/command-center/adapters";

function CenterState({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-3 h-[60vh] text-muted-foreground">{children}</div>;
}

const FILTER_TESTS: Array<(s: ChannelSession) => boolean> = [
  () => true,
  (s) => (s.unread_count ?? 0) > 0,
  (s) => s.label === "vip",
];

export function CrmInbox() {
  const qc = useQueryClient();
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const [filterIdx, setFilterIdx] = useState(0);

  const convQuery = useQuery({
    queryKey: ["crm-inbox", "conversations"],
    queryFn: () => channelsApi.listConversations({ limit: 200 }),
    refetchInterval: 20_000,
  });

  const instQuery = useQuery({
    queryKey: ["crm-inbox", "instances"],
    queryFn: () => channelsApi.listInstances(),
    staleTime: 60_000,
  });

  const conversations = useMemo(() => convQuery.data?.conversations ?? [], [convQuery.data]);
  const effectiveKey = activeKey ?? conversations[0]?.session_key;

  // Transcript: zalo-personal keeps it in session.history (jsonb); others in the
  // pending/sent tables (/messages). The detail endpoint (.single()) is skipped —
  // it 404s on keys with ':'; the list item carries customer + history already.
  const msgQuery = useQuery({
    queryKey: ["crm-inbox", "messages", effectiveKey],
    queryFn: () => channelsApi.getConversationMessages(effectiveKey!),
    enabled: !!effectiveKey,
    refetchInterval: 15_000,
  });

  if (convQuery.isLoading) {
    return (
      <CenterState>
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Đang tải hội thoại…</p>
      </CenterState>
    );
  }

  if (convQuery.isError) {
    return (
      <CenterState>
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm">Không tải được hội thoại.</p>
        <button
          type="button"
          onClick={() => convQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
        >
          <RotateCw className="h-4 w-4" /> Thử lại
        </button>
      </CenterState>
    );
  }

  if (conversations.length === 0) {
    return (
      <CenterState>
        <Inbox className="h-7 w-7" />
        <p className="text-sm">Chưa có hội thoại nào.</p>
      </CenterState>
    );
  }

  // Real per-account unread aggregation + sidebar groups from real channel instances.
  const unreadByChannel: Record<string, number> = {};
  for (const s of conversations) {
    if (s.channel_name) unreadByChannel[s.channel_name] = (unreadByChannel[s.channel_name] ?? 0) + (s.unread_count ?? 0);
  }
  const detail = conversations.find((s) => s.session_key === effectiveKey);
  const channelGroups = buildChannelGroups(instQuery.data ?? [], unreadByChannel, detail?.channel_name);

  // Real filter counts + client-side filtering (filters real data).
  const unreadTotal = conversations.filter((s) => (s.unread_count ?? 0) > 0).length;
  const vipTotal = conversations.filter((s) => s.label === "vip").length;
  const listFilters = ["Tất cả", `Chưa đọc (${unreadTotal})`, `VIP (${vipTotal})`];
  const displayed = conversations.filter(FILTER_TESTS[filterIdx]);

  const mappedConvs = displayed.map(mapConversation);
  const header = detail ? mapHeader(detail) : undefined;
  const crm = detail ? mapCrm(detail) : undefined;
  // Nguồn hiển thị hội thoại = transcript endpoint (channel_pending ∪ channel_sent) —
  // CÙNG nguồn với Unified Inbox nên 2 màn không thể lệch nhau.
  // KHÔNG dùng `detail.history`: đó là BỘ NHỚ của agent (đã trim, không có id gốc) và
  // `router.runAgent` ghi history NGAY sau khi sinh reply, trong khi consumer vẫn có thể
  // HUỶ reply trước lúc gửi nếu owner bấm Dừng Bot giữa chừng ⇒ history có thể chứa câu
  // khách CHƯA TỪNG NHẬN. Hiển thị nó = nói dối người trực. (Chị Jennie duyệt 2026-07-19;
  // plan 2026-07-19-INBOX-TRANSCRIPT-UNIFY-2-DUONG-DOC OD-5.)
  const messages = msgQuery.data ? mapMessages(msgQuery.data.messages) : [];
  const botPaused = (detail?.metadata as { bot_paused?: boolean } | undefined)?.bot_paused === true;

  async function handleSend(text: string) {
    if (!detail?.channel_name || !detail?.chat_id) return;
    try {
      await channelsApi.sendMessage(detail.channel_name, detail.chat_id, text, detail.is_group ? "group" : "dm");
      await qc.invalidateQueries({ queryKey: ["crm-inbox", "messages", effectiveKey] });
    } catch {
      /* the optimistic message is already shown by the component */
    }
  }

  async function handleSelect(id: string) {
    setActiveKey(id);
    channelsApi.markRead(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["crm-inbox", "conversations"] });
  }

  async function handleBotMode(mode: "human" | "bot") {
    if (!effectiveKey) return;
    try {
      await channelsApi.setBotPaused(effectiveKey, mode === "human");
      await qc.invalidateQueries({ queryKey: ["crm-inbox", "conversations"] });
    } catch {
      /* visual state already reflects the toggle */
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <CrmMessagingCommandCenter
        heightClass="h-full"
        workspace={{ name: "Gemral Inbox", online: true }}
        channelGroups={channelGroups}
        allCount={String(convQuery.data?.total ?? conversations.length)}
        conversations={mappedConvs}
        activeConversationId={effectiveKey}
        onSelectConversation={handleSelect}
        listFilters={listFilters}
        activeFilter={listFilters[filterIdx]}
        onSelectFilter={(f) => {
          const i = listFilters.indexOf(f);
          if (i >= 0) setFilterIdx(i);
        }}
        chatHeader={header}
        messages={messages}
        aiSuggestions={[]}
        crm={crm}
        botMode={botPaused ? "human" : "bot"}
        onBotModeChange={handleBotMode}
        onSend={handleSend}
      />
    </div>
  );
}

export default CrmInbox;
