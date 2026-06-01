/**
 * CrmInbox — live Command Center (Phase B read-path wire).
 *
 * Renders <CrmMessagingCommandCenter> against the real unified-inbox API
 * (channelsApi): conversation list, selected thread messages, chat header, and
 * the Customer 360 panel all come from `/api/channels/conversations*`. Sending
 * a message hits `/api/channels/send` and refetches.
 *
 * Additive surface — does NOT touch the existing "Hộp thư"/Unified Inbox. The
 * AI Copilot / sentiment / SLA / review-capture remain showcase defaults until
 * their backends exist (Phase C). Route: /:companyPrefix/crm-inbox.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, AlertTriangle, RotateCw } from "lucide-react";
import { channelsApi } from "@/api/channels";
import { CrmMessagingCommandCenter } from "@/components/crm-messaging";
import { mapConversation, mapHeader, mapCrm, mapMessages, mapHistory } from "@/components/crm-messaging/command-center/adapters";

function CenterState({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-3 h-[60vh] text-muted-foreground">{children}</div>;
}

export function CrmInbox() {
  const qc = useQueryClient();
  const [activeKey, setActiveKey] = useState<string | undefined>();

  const convQuery = useQuery({
    queryKey: ["crm-inbox", "conversations"],
    queryFn: () => channelsApi.listConversations({ limit: 30 }),
    refetchInterval: 20_000,
  });

  const conversations = convQuery.data?.conversations ?? [];
  const effectiveKey = activeKey ?? conversations[0]?.session_key;

  // The detail endpoint (.single() on session_key) 404s for some keys, and
  // zalo-personal keeps its transcript in `session.history` (jsonb), not the
  // pending/sent tables — so derive header/crm/messages from the list item and
  // only fall back to /messages when history is empty (other channels).
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

  const mappedConvs = conversations.map(mapConversation);
  const detail = conversations.find((s) => s.session_key === effectiveKey);
  const header = detail ? mapHeader(detail) : undefined;
  const crm = detail ? mapCrm(detail) : undefined;
  const messages = detail?.history?.length
    ? mapHistory(detail.history)
    : msgQuery.data
      ? mapMessages(msgQuery.data.messages)
      : [];

  async function handleSend(text: string) {
    if (!detail?.channel_name || !detail?.chat_id) return;
    try {
      await channelsApi.sendMessage(detail.channel_name, detail.chat_id, text, detail.is_group ? "group" : "dm");
      await qc.invalidateQueries({ queryKey: ["crm-inbox", "messages", effectiveKey] });
    } catch {
      /* surfaced by the optimistic message already appended in the component */
    }
  }

  async function handleSelect(id: string) {
    setActiveKey(id);
    if (id) {
      channelsApi.markRead(id).catch(() => {});
      qc.invalidateQueries({ queryKey: ["crm-inbox", "conversations"] });
    }
  }

  return (
    <div className="p-4">
      <CrmMessagingCommandCenter
        workspace={{ name: "Gemral Inbox", online: true }}
        conversations={mappedConvs}
        activeConversationId={effectiveKey}
        onSelectConversation={handleSelect}
        chatHeader={header}
        messages={messages}
        aiSuggestions={[]}
        crm={crm}
        botMode={detail?.agent_slug ? "bot" : "human"}
        onSend={handleSend}
      />
    </div>
  );
}

export default CrmInbox;
