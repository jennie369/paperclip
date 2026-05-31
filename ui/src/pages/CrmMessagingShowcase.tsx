/**
 * CrmMessagingShowcase — demo gallery for the CrmMessaging* SSOT family.
 *
 * Renders all 8 omnichannel CRM-messaging components with realistic sample
 * data so the design can be reviewed end-to-end. Includes a light/dark toggle
 * (reusing Paperclip's ThemeContext) so animations + tokens can be verified in
 * both themes. Each block shows the component name + import path for copy/reuse.
 *
 * Route: /:companyPrefix/crm-messaging  (board route)
 */
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import {
  CrmMessagingCommandCenter,
  CrmMessagingObjectionCopilot,
  CrmMessagingUpsellMatrix,
  CrmMessagingUrgencyDispatcher,
  CrmMessagingScriptLibrary,
  CrmMessagingPipelineKanban,
  CrmMessagingCustomer360,
  CrmMessagingSentimentMatrix,
} from "@/components/crm-messaging";

interface ShowcaseEntry {
  id: string;
  name: string;
  importName: string;
  blurb: string;
  /** Full-bleed (wide) component → no max-width clamp. */
  wide?: boolean;
  render: () => React.ReactNode;
}

const ENTRIES: ShowcaseEntry[] = [
  {
    id: "command-center",
    name: "CRM Messaging — Command Center",
    importName: "CrmMessagingCommandCenter",
    blurb: "Omnichannel Inbox đầy đủ: rail kênh + danh sách hội thoại + cửa sổ chat + panel CRM 360.",
    wide: true,
    render: () => <CrmMessagingCommandCenter />,
  },
  {
    id: "pipeline-kanban",
    name: "CRM Messaging — Pipeline Kanban",
    importName: "CrmMessagingPipelineKanban",
    blurb: "Quản lý lead theo phễu: New Lead → Đang tư vấn → Follow Up → Won. Card hover nâng + glow.",
    wide: true,
    render: () => <CrmMessagingPipelineKanban />,
  },
  {
    id: "customer-360",
    name: "CRM Messaging — Customer 360",
    importName: "CrmMessagingCustomer360",
    blurb: "Hồ sơ sâu: chat mờ (focus vào profile) + data blocks + tags + timeline đa kênh + action grid.",
    render: () => <CrmMessagingCustomer360 />,
  },
  {
    id: "objection-copilot",
    name: "CRM Messaging — AI Objection Copilot",
    importName: "CrmMessagingObjectionCopilot",
    blurb: "Copilot phân tích lời từ chối, đề xuất câu trả lời theo chiến lược (nhấn giá trị / down-sell).",
    render: () => <CrmMessagingObjectionCopilot />,
  },
  {
    id: "upsell-matrix",
    name: "CRM Messaging — Upsell / Cross-sell Matrix",
    importName: "CrmMessagingUpsellMatrix",
    blurb: "AI đọc từ khóa trong chat → gợi ý sản phẩm upsell (kéo thả) hoặc lead-magnet miễn phí.",
    render: () => <CrmMessagingUpsellMatrix />,
  },
  {
    id: "sentiment-matrix",
    name: "CRM Messaging — Sentiment Matrix (Emotion AI)",
    importName: "CrmMessagingSentimentMatrix",
    blurb: "Inbox lọc theo cảm xúc (giận/trung tính/vui) + AI Empathy Guide + smart replies.",
    render: () => <CrmMessagingSentimentMatrix />,
  },
  {
    id: "urgency-dispatcher",
    name: "CRM Messaging — Urgency / Flash Deal Dispatcher",
    importName: "CrmMessagingUrgencyDispatcher",
    blurb: "Tạo mã giảm giá có đếm ngược + preview thẻ flash-deal gửi cho khách (đếm ngược chạy live).",
    render: () => <CrmMessagingUrgencyDispatcher />,
  },
  {
    id: "script-library",
    name: "CRM Messaging — Script Library & A/B Tester",
    importName: "CrmMessagingScriptLibrary",
    blurb: "Thư viện kịch bản chốt sale kèm tỉ lệ chuyển đổi (A/B). Hover hiện nút copy.",
    render: () => <CrmMessagingScriptLibrary />,
  },
];

export function CrmMessagingShowcase() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM Messaging — Component Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            8 widget omnichannel CRM dựng từ mockup Gemral. Tất cả theme-aware (sáng + tối) và nhận data
            qua props — dữ liệu mẫu ở đây chỉ để xem trước. Import từ{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@/components/crm-messaging</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="shrink-0 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-10">
        {ENTRIES.map((entry) => (
          <section key={entry.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold tracking-tight">{entry.name}</h2>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {entry.importName}
              </code>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">{entry.blurb}</p>
            <div className={entry.wide ? "" : "max-w-3xl"}>{entry.render()}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default CrmMessagingShowcase;
