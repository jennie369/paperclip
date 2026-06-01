/**
 * CommandSidebar — Command Center · column 1 (channels & accounts)
 * ─────────────────────────────────────────────────────────────────
 * Workspace identity + "all messages" + platform groups. Each group has a
 * channel-icon header with a chevron (collapsible) and a list of sub-accounts
 * rendered with a SQUARE avatar (per mockup), an unread count, and an optional
 * danger notification dot on the active account.
 *
 * Internal to the CrmMessaging family — not exported from the package index.
 * Presentational; selection/collapse surface via callbacks.
 */
import { Inbox, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials } from "../_shared";
import type { CommandAccount, CommandChannelGroup, CommandWorkspace } from "./types";

function SubAccountRow({ account, onSelect }: { account: CommandAccount; onSelect?: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(account.id)}
      className={cn(
        "w-full flex items-center justify-between p-2 rounded-lg transition-colors text-sm group",
        account.active
          ? "bg-gem-surface-raised border border-gem-border/10"
          : "hover:bg-gem-surface-raised border border-transparent",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          {account.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.label}
              className={cn(
                "w-6 h-6 rounded-md object-cover transition-opacity",
                account.active ? "ring-1 ring-gem-border/20" : "opacity-80 group-hover:opacity-100",
              )}
            />
          ) : (
            <div className="w-6 h-6 rounded-md bg-gem-surface-overlay flex items-center justify-center">
              <ChannelIcon channel={account.channel} className="w-6 h-6 !rounded-md" iconClassName="w-3 h-3" />
            </div>
          )}
          {account.active && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gem-danger rounded-full border border-gem-surface-raised" />
          )}
        </div>
        <span
          className={cn(
            "truncate text-xs font-medium",
            account.active ? "text-gem-text" : "text-gem-text-muted group-hover:text-gem-text",
          )}
        >
          {account.label}
        </span>
      </div>
      {account.count != null &&
        (account.urgent ? (
          <span className="bg-gem-danger text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold shadow-[0_0_8px_rgb(var(--gem-danger-rgb))] shrink-0">
            {account.count}
          </span>
        ) : (
          <span className="bg-gem-surface-raised border border-gem-border/10 text-gem-text-muted text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
            {account.count}
          </span>
        ))}
    </button>
  );
}

export function CommandSidebar({
  workspace,
  allCount,
  channelGroups,
  onSelectAccount,
  onToggleGroup,
  onConnectChannel,
}: {
  workspace: CommandWorkspace;
  allCount: string;
  channelGroups: CommandChannelGroup[];
  onSelectAccount?: (id: string) => void;
  onToggleGroup?: (channel: string) => void;
  onConnectChannel?: () => void;
}) {
  return (
    <div className="hidden lg:flex w-[260px] border-r border-gem-border/10 bg-gem-surface-overlay/40 flex-col shrink-0">
      {/* Profile / Settings */}
      <div className="flex items-center gap-3 p-4 border-b border-gem-border/10 bg-gem-surface/30">
        {workspace.avatarUrl ? (
          <img
            src={workspace.avatarUrl}
            alt={workspace.name}
            className="w-10 h-10 rounded-full border-2 border-gem-primary object-cover shadow-[0_0_10px_rgb(var(--gem-primary-rgb)/0.5)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-gem-primary bg-gem-primary/15 flex items-center justify-center text-gem-primary font-bold text-sm shadow-[0_0_10px_rgb(var(--gem-primary-rgb)/0.5)]">
            {initials(workspace.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-gem-text truncate">{workspace.name}</div>
          {workspace.online && (
            <div className="text-[10px] text-gem-success flex items-center gap-1 font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-gem-success shadow-[0_0_8px_rgb(var(--gem-success-rgb))] animate-pulse" />
              Trực tuyến
            </div>
          )}
        </div>
      </div>

      {/* Channels */}
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-3 gap-1">
        <div className="text-[10px] font-black text-gem-text-faint uppercase tracking-widest mb-1 pl-2">Omnichannel</div>

        <button
          type="button"
          className="flex items-center justify-between p-2.5 rounded-xl bg-gem-primary/15 border border-gem-primary/30 shadow-[0_0_15px_rgb(var(--gem-primary-rgb)/0.15)] text-gem-primary transition-colors"
        >
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <Inbox className="w-4 h-4" /> Tất cả tin nhắn
          </div>
          <span className="bg-gem-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-[0_0_8px_rgb(var(--gem-primary-rgb))]">
            {allCount}
          </span>
        </button>

        {channelGroups.map((group) => (
          <div key={group.label} className="mt-2 first:mt-4">
            <button
              type="button"
              onClick={() => onToggleGroup?.(group.channel)}
              className="w-full flex items-center justify-between pl-2 pr-1 py-1 mb-1 group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ChannelIcon channel={group.channel} className="w-4 h-4 !rounded text-[8px]" iconClassName="w-2.5 h-2.5" />
                <span className="text-[10px] font-black text-gem-text-muted uppercase tracking-widest group-hover:text-gem-text transition-colors truncate">
                  {group.label}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-gem-text-faint transition-transform shrink-0",
                  group.collapsed && "-rotate-90",
                )}
              />
            </button>
            {!group.collapsed && (
              <div className="flex flex-col gap-0.5">
                {group.accounts.map((acc) => (
                  <SubAccountRow key={acc.id} account={acc} onSelect={onSelectAccount} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gem-border/10">
        <button
          type="button"
          onClick={onConnectChannel}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-gem-border/20 text-gem-text-muted hover:text-gem-text hover:border-gem-border/40 hover:bg-gem-surface-raised transition-all text-xs font-semibold"
        >
          <Plus className="w-3 h-3" /> Kết nối kênh mới
        </button>
      </div>
    </div>
  );
}
