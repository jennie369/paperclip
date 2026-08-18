/**
 * CrmMessagingCommandCenter — Omnichannel Inbox (Command Center)
 * ──────────────────────────────────────────────────────────────
 * The flagship 4-column messaging cockpit, upgraded to absorb the standalone
 * CRM widgets:
 *   1. Channels rail        — workspace + platform groups w/ square sub-account
 *                             avatars + collapse + unread/notification dots.
 *   2. Conversations        — sentiment rings (from Sentiment Matrix), target-
 *                             account overlay + receiving pill, AI intent chips,
 *                             SLA breach badges, live typing.
 *   3. Chat window          — Bot/Human handoff, AI-reply markers, per-message
 *                             hover menu, AI Capture Review, smart composer
 *                             (ghost-typing + drag-drop dropzone + Magic Wand).
 *   4. Customer 360 + AI Copilot — deep profile + journey timeline (from
 *                             Customer 360) and a mode-switching copilot that
 *                             absorbs Objection / Upsell / Urgency (brain
 *                             activity, win rate, tone slider, draggable
 *                             arsenal, 1-click combo).
 *
 * Theme-aware via gem-* tokens (light + dark). All data flows through props
 * (shaped for real CRM data — see crm-command-center-contract.md); every action
 * surfaces via a callback. Interactive flourishes (copilot transforms, ghost
 * typing, drag-drop, brain activity) are client-side UX with callback seams for
 * the backend wiring (Phase B).
 *
 * @param {CommandWorkspace} [workspace] - Top-left identity.
 * @param {CommandChannelGroup[]} [channelGroups] - Platform-grouped accounts.
 * @param {string} [allCount="24"] - "All messages" badge.
 * @param {CommandConversation[]} [conversations] - Conversation list.
 * @param {string} [activeConversationId] - Focused conversation (controlled).
 * @param {(id: string) => void} [onSelectConversation]
 * @param {(id: string) => void} [onSelectAccount]
 * @param {string[]} [listFilters] - Filter chips.
 * @param {CommandChatHeader} [chatHeader] - Active chat header.
 * @param {CommandBotMode} [botMode] - Bot/Human handoff (controlled if onBotModeChange given).
 * @param {(mode: CommandBotMode) => void} [onBotModeChange]
 * @param {CommandMessage[]} [messages] - Active chat transcript.
 * @param {string[]} [aiSuggestions] - One-tap AI reply chips.
 * @param {(text: string, i: number) => void} [onAiSuggestion]
 * @param {(text: string) => void} [onSend]
 * @param {(i: number) => void} [onCaptureReview]
 * @param {(payload: { text: string; destinationIds: string[] }) => void} [onPublishReview]
 * @param {CommandCrmProfile} [crm] - Customer 360 data.
 * @param {(stage: string) => void} [onDealStageChange]
 * @param {(action: CommandQuickAction, i: number) => void} [onQuickAction]
 * @param {CommandCopilotData} [copilot] - AI Copilot data.
 * @param {(mode) => void} [onCopilotTool]
 * @param {string} [className]
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CommandSidebar } from "./command-center/CommandSidebar";
import { CommandConversationList } from "./command-center/CommandConversationList";
import { CommandChatWindow } from "./command-center/CommandChatWindow";
import { CommandCustomer360 } from "./command-center/CommandCustomer360";
import { CommandAiCopilot } from "./command-center/CommandAiCopilot";
import { CommandReviewCaptureModal } from "./command-center/CommandReviewCaptureModal";
import type {
  CommandBotMode,
  CommandCopilotData,
  CommandCopilotMode,
  CommandCrmProfile,
  CommandChannelGroup,
  CommandChatHeader,
  CommandConversation,
  CommandDropPayload,
  CommandMessage,
  CommandMessageCard,
  CommandQuickAction,
  CommandReviewCapture,
  CommandWorkspace,
} from "./command-center/types";

// Re-export the public type surface (keeps `index.ts` exports stable).
export type {
  CommandWorkspace,
  CommandAccount,
  CommandChannelGroup,
  CommandConversation,
  CommandChatHeader,
  CommandMessage,
  CommandCrmProfile,
  CommandBotMode,
  CommandCopilotData,
  CommandQuickAction,
  CommandJourneyPoint,
  CommandReviewCapture,
} from "./command-center/types";

/* ── Sample data (mirrors the mockup; replaced by real props) ─────────── */

const SAMPLE_WORKSPACE: CommandWorkspace = { name: "Gemral Admin", online: true };

const SAMPLE_GROUPS: CommandChannelGroup[] = [
  {
    label: "Zalo (3)",
    channel: "zalo",
    accounts: [
      { id: "zalo-oa", label: "Zalo OA Tổng", channel: "zalo", count: 12 },
      { id: "zalo-sale", label: "Zalo Cá Nhân (Sale)", channel: "zalo", count: 2 },
    ],
  },
  {
    label: "Facebook (2)",
    channel: "messenger",
    accounts: [
      { id: "fb-main", label: "Fanpage Chính", channel: "messenger", count: 5, urgent: true, active: true },
      { id: "fb-support", label: "Page Support", channel: "messenger" },
    ],
  },
  {
    label: "Telegram (1)",
    channel: "telegram",
    accounts: [{ id: "tele-vip", label: "Support Bot VIP", channel: "telegram", count: 5 }],
  },
];

const SAMPLE_CONVERSATIONS: CommandConversation[] = [
  {
    id: "c1",
    name: "Trần Văn A",
    channel: "messenger",
    preview: "Dạ cho mình hỏi gói Ngọc Bích còn slot không shop?",
    time: "10:42",
    vip: true,
    sentiment: "active",
    targetAccount: { label: "Fanpage Chính", channel: "messenger" },
    intentTag: { label: "Ý định mua", tone: "primary" },
    typing: true,
  },
  {
    id: "c2",
    name: "Lê Ngọc 😠",
    channel: "zalo",
    preview: "Mình đã chuyển khoản rồi nha shop check giúp mình lẹ nha.",
    time: "09:15",
    unread: true,
    sentiment: "angry",
    targetAccount: { label: "Zalo OA Tổng", channel: "zalo" },
    intentTag: { label: "Hối thúc CK", tone: "warning" },
    sla: { label: "⏳ QUÁ HẠN 5P", blink: true },
  },
  {
    id: "c3",
    name: "Mai Hoa 😍",
    channel: "zalo",
    preview: "Tuyệt vời, cho mình xin thông tin chi tiết với ạ.",
    time: "15:30",
    sentiment: "happy",
    targetAccount: { label: "Zalo Cá Nhân (Sale)", channel: "zalo" },
    intentTag: { label: "Hài lòng", tone: "success" },
  },
  {
    id: "c4",
    name: "Pham Minh",
    channel: "telegram",
    preview: "Cảm ơn shop nhiều ạ.",
    time: "T3",
    muted: true,
    sentiment: "neutral",
    targetAccount: { label: "Support Bot VIP", channel: "telegram" },
  },
];

const SAMPLE_HEADER: CommandChatHeader = {
  name: "Trần Văn A",
  channel: "messenger",
  context: "Fanpage Chính",
  contextDetail: "Tương tác qua Bài Quảng Cáo",
};

const SAMPLE_MESSAGES: CommandMessage[] = [
  { from: "them", text: "Chào shop, mình quan tâm đến khóa học phong thủy bên mình.", time: "10:40" },
  {
    from: "me",
    text: "Chào bạn Trần Văn A! Cảm ơn bạn đã quan tâm. Bạn đang muốn tìm hiểu về khóa học cơ bản hay chuyên sâu ạ?",
    aiReply: true,
  },
  { from: "me", text: "Hiện tại bên mình đang có chương trình giảm 20% cho người mới đăng ký trong tháng này.", time: "10:41", read: true, aiReply: true },
  { from: "them", text: "Dạ cho mình hỏi gói Ngọc Bích còn slot không shop?", time: "10:42" },
  {
    from: "them",
    text: "Mình vừa chốt đơn xong nhé. Dịch vụ bên shop tư vấn nhiệt tình quá, app dùng mượt mà thật sự, rất ưng ý! Cảm ơn shop nha. ❤️",
    time: "10:55",
    sentiment: "positive",
    sentimentLabel: "Positive Sentiment",
  },
];

const SAMPLE_AI = ["Dạ còn 3 slot cuối cùng ạ", "Gửi link thanh toán Ngọc Bích"];

const SAMPLE_CRM: CommandCrmProfile = {
  company: "TechNova JSC",
  phone: "0987.654.321",
  email: "tranvana.vip@gmail.com",
  ltv: "125.000.000₫",
  ltvDeltaLabel: "+15% YoY",
  dealStages: ["Đang Tư Vấn (In Progress)", "Chốt Đơn (Won)", "Từ Chối (Lost)"],
  tags: [
    { label: "VIP_Tier1", tone: "gold" },
    { label: "Tech_Industry", tone: "neutral" },
    { label: "High_Churn_Risk", tone: "danger" },
  ],
  quickActions: [
    { label: "Báo Giá", icon: "file-text", tone: "primary" },
    { label: "Lịch Hẹn", icon: "calendar", tone: "primary" },
    { label: "Gọi Ngay", icon: "phone", tone: "success" },
    { label: "Thêm", icon: "more-horizontal", tone: "neutral" },
  ],
  journey: [
    { when: "Hôm nay, 10:45 AM via", channelLabel: "Zalo", channelColor: "#0068ff", title: "Yêu cầu gia hạn hợp đồng", latest: true },
    { when: "3 ngày trước via", channelLabel: "Email", channelColor: "rgb(var(--gem-gold-rgb))", title: "Mở email Newsletter Tháng 6" },
    { when: "Tháng trước via", channelLabel: "Facebook", channelColor: "#0866FF", title: "Đăng ký tham gia Webinar" },
  ],
};

const SAMPLE_COPILOT: CommandCopilotData = {
  brainStages: [
    "Trích xuất Entity & Sentiment...",
    "Quét DB: Khách hàng VIP hạng Gold",
    "Phân tích ngữ cảnh hội thoại",
    "Tính toán xác suất chốt: 85%",
  ],
  winRatePct: 85,
  winRateLabel: "85% Cao",
  nextBestActionText: "Khách có nhu cầu cấp bách. Tặng Voucher Freeship 50K sẽ lập tức chốt deal.",
  nextBestActionCta: "⚡ Gửi Voucher 50K (1-CLICK)",
  tools: [
    { mode: "objection", label: "Objection Handling", hint: "Xử lý từ chối giá", icon: "shield-alert", tone: "danger" },
    { mode: "upsell", label: "Upsell Matrix", hint: "Gợi ý Combo VIP", icon: "trending-up", tone: "gold" },
    { mode: "urgency", label: "Flash Deal", hint: "Cứu đơn đang do dự", icon: "timer", tone: "warning" },
  ],
  objection: {
    objection: "Em ơi giá bộ Ngọc này cao quá, bên kia bán loại tương tự rẻ hơn 300k.",
    winRateLabel: "Tỉ lệ chốt: 85%",
    toneVariants: [
      "Dạ Ngọc em xin lỗi vì làm chị lăn tăn về giá ạ. Đá bên em là hàng kiểm định thật 100%, đeo rất vượng khí chị nha. Chị cân nhắc thêm giúp em nhé!",
      "Dạ chị Ngọc, Ngọc bên em là hàng kiểm định AAA+ có giấy phép và năng lượng đã qua thanh tẩy. Hàng rẻ hơn thường là đá bột ép, đeo không có lộc chị ạ.",
      "Chị ơi tiền nào của nấy ạ. Đá rẻ hơn trên thị trường 100% là đá nhân tạo không có năng lượng phong thủy. Chị mua đồ phong thủy quan trọng nhất là hàng chuẩn ạ.",
    ],
  },
  upsell: {
    trigger: "Bộ cơ bản này cũng đẹp, nhưng chị muốn loại nào sang trọng hơn để đi tiệc cơ.",
    productName: "Set Hoàng Gia VIP",
    price: "1.450.000₫",
    ghostDraft: "Dạ Ngọc có set Hoàng Gia VIP cực kỳ sang trọng cho các buổi tiệc đây ạ...",
  },
  urgency: {
    code: "GIAM5",
    countdownLabel: "15:00",
    ghostDraft: "Dạ chị Ngọc ơi, Shop đang có mã Flash Deal 15 phút, chị dùng mã này nhé...",
  },
};

const SAMPLE_REVIEW: CommandReviewCapture = {
  text: "Mình vừa chốt đơn xong nhé. Dịch vụ bên shop tư vấn nhiệt tình quá, app dùng mượt mà thật sự, rất ưng ý! Cảm ơn shop nha. ❤️",
  customerName: "Trần Thị Ngọc",
  customerMeta: "Customer • VIP_Tier1",
  destinations: [
    { id: "landing", label: "Landing Page", sublabel: "Testimonial Widget", icon: "layout-template", active: true },
    { id: "shopify", label: "Shopify Store", sublabel: "Product Reviews", color: "#96bf48", icon: "shopping-bag", active: true },
  ],
};

const STAGE_MS = 350;

export function CrmMessagingCommandCenter({
  workspace = SAMPLE_WORKSPACE,
  channelGroups = SAMPLE_GROUPS,
  allCount = "24",
  conversations = SAMPLE_CONVERSATIONS,
  activeConversationId = "c1",
  onSelectConversation,
  onSelectAccount,
  listFilters = ["Chưa đọc (24)", "Đang xử lý", "VIP"],
  activeFilter,
  onSelectFilter,
  chatHeader = SAMPLE_HEADER,
  botMode: botModeProp,
  onBotModeChange,
  messages = SAMPLE_MESSAGES,
  aiSuggestions = SAMPLE_AI,
  onAiSuggestion,
  onSend,
  onCaptureReview,
  onPublishReview,
  crm = SAMPLE_CRM,
  onDealStageChange,
  onQuickAction,
  copilot = SAMPLE_COPILOT,
  onCopilotTool,
  reviewCapture = SAMPLE_REVIEW,
  heightClass = "h-[800px]",
  className,
}: {
  workspace?: CommandWorkspace;
  channelGroups?: CommandChannelGroup[];
  allCount?: string;
  conversations?: CommandConversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onSelectAccount?: (id: string) => void;
  listFilters?: string[];
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
  chatHeader?: CommandChatHeader;
  botMode?: CommandBotMode;
  onBotModeChange?: (mode: CommandBotMode) => void;
  messages?: CommandMessage[];
  aiSuggestions?: string[];
  onAiSuggestion?: (text: string, i: number) => void;
  onSend?: (text: string) => void;
  onCaptureReview?: (i: number) => void;
  onPublishReview?: (payload: { text: string; destinationIds: string[] }) => void;
  crm?: CommandCrmProfile;
  onDealStageChange?: (stage: string) => void;
  onQuickAction?: (action: CommandQuickAction, i: number) => void;
  copilot?: CommandCopilotData;
  onCopilotTool?: (mode: Exclude<CommandCopilotMode, "default">) => void;
  reviewCapture?: CommandReviewCapture;
  heightClass?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [botMode, setBotMode] = useState<CommandBotMode>(botModeProp ?? "bot");
  const [copilotMode, setCopilotMode] = useState<CommandCopilotMode>("default");
  const [loading, setLoading] = useState(false);
  const [brainStageText, setBrainStageText] = useState("");
  const [brainProgress, setBrainProgress] = useState(0);
  const [ghost, setGhost] = useState("");
  const [tone, setTone] = useState(2);
  const [appended, setAppended] = useState<CommandMessage[]>([]);
  const [magicSpinning, setMagicSpinning] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [runId, setRunId] = useState(0);
  const [ghostRun, setGhostRun] = useState(0);

  const ghostTargetRef = useRef("");

  useEffect(() => {
    if (botModeProp) setBotMode(botModeProp);
  }, [botModeProp]);

  function ghostTargetFor(mode: CommandCopilotMode, t: number): string {
    if (mode === "objection") return copilot.objection.toneVariants[t - 1] ?? copilot.objection.toneVariants[0] ?? "";
    if (mode === "upsell") return copilot.upsell.ghostDraft;
    if (mode === "urgency") return copilot.urgency.ghostDraft;
    return "";
  }

  // Mode-run sequence: brain-activity stages → reveal mode → kick ghost typing.
  useEffect(() => {
    if (runId === 0 || copilotMode === "default") return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stages = copilot.brainStages ?? [];
    setLoading(true);
    setBrainProgress(0);
    setGhost("");
    stages.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setBrainStageText(s);
          setBrainProgress(((i + 1) / stages.length) * 100);
        }, STAGE_MS * (i + 1)),
      );
    });
    timers.push(
      setTimeout(
        () => {
          if (cancelled) return;
          setLoading(false);
          ghostTargetRef.current = ghostTargetFor(copilotMode, tone);
          setGhostRun((r) => r + 1);
        },
        STAGE_MS * (stages.length + 1) + 200,
      ),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Ghost-typing typewriter (drives the composer overlay).
  useEffect(() => {
    if (ghostRun === 0) return;
    let cancelled = false;
    const target = ghostTargetRef.current;
    let i = 0;
    setGhost("");
    const iv = setInterval(() => {
      if (cancelled) return;
      i++;
      setGhost(target.slice(0, i));
      if (i >= target.length) clearInterval(iv);
    }, 22);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [ghostRun]);

  function selectTool(mode: Exclude<CommandCopilotMode, "default">) {
    setCopilotMode(mode);
    setRunId((r) => r + 1);
    onCopilotTool?.(mode);
  }

  function closeCopilot() {
    setCopilotMode("default");
    setLoading(false);
    setGhost("");
    ghostTargetRef.current = "";
  }

  function changeTone(t: number) {
    setTone(t);
    if (copilotMode === "objection" && !loading) {
      ghostTargetRef.current = ghostTargetFor("objection", t);
      setGhostRun((r) => r + 1);
    }
  }

  function appendMe(text: string) {
    setAppended((a) => [...a, { from: "me", text }]);
  }

  function appendCard(card: CommandMessageCard) {
    setAppended((a) => [...a, { from: "me", text: "", card }]);
  }

  function doSend() {
    const text = draft.trim();
    if (!text) return;
    appendMe(text);
    onSend?.(text);
    setDraft("");
    setGhost("");
  }

  function acceptGhost() {
    const text = ghostTargetRef.current;
    if (!text) return;
    appendMe(text);
    onSend?.(text);
    setGhost("");
    setDraft("");
  }

  function magicRewrite() {
    if (!draft.trim()) return;
    setMagicSpinning(true);
    setTimeout(() => {
      setMagicSpinning(false);
      setDraft(
        "Dạ Ngọc cảm ơn chị đã quan tâm. Em tư vấn thêm cho chị dòng sản phẩm này để phù hợp nhất với nhu cầu nhé ạ.",
      );
    }, 600);
  }

  function handleDrop(payload: CommandDropPayload) {
    if (payload.kind === "text") appendMe(payload.text);
    else if (payload.kind === "product") appendCard({ kind: "product", name: payload.name, price: payload.price });
    else appendCard({ kind: "voucher", code: payload.code, countdownLabel: payload.countdownLabel });
    setGhost("");
  }

  function executeCombo() {
    appendMe("Dạ chị Ngọc ơi, Shop đang có mã Flash Deal 15 phút, chị chốt để em lên đơn hỏa tốc luôn nhé?");
    appendCard({ kind: "voucher", code: copilot.urgency.code, countdownLabel: copilot.urgency.countdownLabel });
    closeCopilot();
  }

  function handleBotMode(mode: CommandBotMode) {
    setBotMode(mode);
    onBotModeChange?.(mode);
  }

  function handleCapture(i: number) {
    setCaptureOpen(true);
    onCaptureReview?.(i);
  }

  const allMessages = appended.length ? [...messages, ...appended] : messages;

  return (
    <div className={cn("crm-scope", className)}>
      <div className={cn("pcard pcard-static w-full p-0", heightClass)}>
        <div className="aura" style={{ background: "rgb(var(--gem-primary-rgb))", width: 400, height: 400, top: -100, left: -100, opacity: "var(--gem-aura-strength)" }} />
        <div className="aura" style={{ background: "rgb(var(--gem-cyan-rgb))", width: 300, height: 300, bottom: -50, right: "20%", opacity: "calc(var(--gem-aura-strength) * 0.7)" }} />

        <div className="flex flex-col md:flex-row h-full relative z-10 min-h-0">
          <CommandSidebar
            workspace={workspace}
            allCount={allCount}
            channelGroups={channelGroups}
            onSelectAccount={onSelectAccount}
          />

          <CommandConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
            listFilters={listFilters}
            activeFilter={activeFilter}
            onSelectFilter={onSelectFilter}
          />

          <CommandChatWindow
            chatHeader={chatHeader}
            botMode={botMode}
            onBotModeChange={handleBotMode}
            messages={allMessages}
            onCaptureReview={handleCapture}
            aiSuggestions={aiSuggestions}
            onAiSuggestion={(t, i) => {
              setDraft(t);
              onAiSuggestion?.(t, i);
            }}
            draft={draft}
            onDraftChange={setDraft}
            ghostText={ghost}
            onAcceptGhost={acceptGhost}
            onSend={doSend}
            magicSpinning={magicSpinning}
            onMagicRewrite={magicRewrite}
            onDropPayload={handleDrop}
          />

          {/* Column 4 — Customer 360 + AI Copilot (one scroll container) */}
          <div className="hidden xl:flex w-72 2xl:w-80 border-l border-gem-border/10 bg-gem-surface-overlay/40 p-5 overflow-y-auto custom-scrollbar shrink-0 flex-col">
            <CommandCustomer360
              crm={crm}
              onDealStageChange={onDealStageChange}
              onQuickAction={onQuickAction}
            />
            <CommandAiCopilot
              mode={copilotMode}
              loading={loading}
              brainStageText={brainStageText}
              brainProgress={brainProgress}
              data={copilot}
              tone={tone}
              onToneChange={changeTone}
              onSelectTool={selectTool}
              onClose={closeCopilot}
              onNextBestAction={() => appendCard({ kind: "voucher", code: copilot.urgency.code, countdownLabel: "Freeship 50K" })}
              onExecuteCombo={executeCombo}
            />
          </div>
        </div>
      </div>

      <CommandReviewCaptureModal
        open={captureOpen}
        capture={reviewCapture}
        onClose={() => setCaptureOpen(false)}
        onPublish={(payload) => onPublishReview?.(payload)}
      />
    </div>
  );
}

export default CrmMessagingCommandCenter;
