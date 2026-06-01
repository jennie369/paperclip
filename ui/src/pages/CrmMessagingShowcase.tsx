/**
 * CrmMessagingShowcase — demo gallery for the CrmMessaging* SSOT family.
 *
 * After the 2026-06-01 merge the family is two surfaces: the flagship
 * CrmMessagingCommandCenter (which absorbed Sentiment Matrix, Customer 360, and
 * the Objection / Upsell / Urgency / Script copilots) and the distinct
 * CrmMessagingPipelineKanban. Rendered with realistic sample data + a light/dark
 * toggle (Paperclip ThemeContext) so animations + tokens verify in both themes.
 *
 * Route: /:companyPrefix/crm-messaging  (board route)
 */
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { CrmMessagingCommandCenter, CrmMessagingPipelineKanban } from "@/components/crm-messaging";

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
    blurb:
      "Omnichannel Inbox hợp nhất: rail kênh (avatar sub-account) + danh sách hội thoại (sentiment ring · intent · SLA · typing) + cửa sổ chat (Bot/Sale handoff · AI capture · composer ghost-typing/kéo-thả/magic wand) + Customer 360 & AI Copilot biến hình (Objection / Upsell / Flash Deal · brain activity · win rate · combo).",
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
];

export function CrmMessagingShowcase() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-8 p-6 max-w-[1480px] mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM Messaging — Component Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Surface CRM omnichannel dựng từ mockup Gemral — theme-aware (sáng + tối), nhận data qua props
            (dữ liệu mẫu ở đây chỉ để xem trước). Import từ{" "}
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
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{entry.importName}</code>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl">{entry.blurb}</p>
            <div className={entry.wide ? "" : "max-w-3xl"}>{entry.render()}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default CrmMessagingShowcase;
