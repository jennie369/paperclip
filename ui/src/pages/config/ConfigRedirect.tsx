// ConfigRedirect — banner + redirect for deprecated config pages.
//
// Phase 3.7 cleanup: /GEM/config and /GEM/agents-config have been merged
// into the Registry Marketplace tab inside SOP Engine. These pages now
// show a deprecation banner and auto-redirect to the new location.
//
// Preserve URLs (don't 404), preserve data (untouched), guide users to
// the new central hub.

import { useEffect, useState } from 'react';
import { useNavigate } from '@/lib/router';
import { toCompanyRelativePath } from '@/lib/company-routes';
import { ArrowRight, Info, Clock } from 'lucide-react';

interface ConfigRedirectProps {
  /** Which sub-tab of Registry Marketplace to open by default */
  subTab?: 'agents' | 'channels' | 'system';
  /** Which old page this replaces (for label) */
  source: 'agents-config' | 'config';
}

export function ConfigRedirect({ subTab = 'agents', source }: ConfigRedirectProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const targetPath = `/ops/sop-engine`;
  const prefixedPath = toCompanyRelativePath(targetPath);

  useEffect(() => {
    if (countdown === 0) {
      navigate(prefixedPath);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate, prefixedPath]);

  const sourceLabel = source === 'agents-config' ? 'Cấu hình Agent LLM' : 'Trung tâm Cấu hình';

  return (
    <div className="h-full flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-amber-500">
          <Info className="size-5" />
          <h1 className="text-lg font-semibold text-foreground">Trang này đã được di chuyển</h1>
        </div>

        <div className="space-y-2 text-sm text-foreground">
          <p>
            <span className="font-semibold text-muted-foreground">{sourceLabel}</span> đã được gộp vào{' '}
            <span className="font-semibold text-primary">Registry Marketplace</span> — trung tâm quản lý
            tập trung cho Agents, Skills, Plugins, MCP, Commands, Hooks, Channels, và System.
          </p>
          <p className="text-xs text-muted-foreground">
            Dữ liệu của chị vẫn nguyên vẹn — chỉ UI được merge vào 1 chỗ để dễ quản lý hơn. Tất cả features cũ
            đã có sẵn trong Registry Marketplace + các sub-tabs mới.
          </p>
        </div>

        <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-1 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="size-3" />
            <span>Chuyển hướng đến:</span>
          </div>
          <div className="font-mono text-primary">
            /ops/sop-engine → Tab "📋 Registry Marketplace" → Sub-tab "{subTab}"
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
          <Clock className="size-3 animate-pulse" />
          <span>Tự động chuyển sau {countdown} giây...</span>
          <button
            onClick={() => navigate(prefixedPath)}
            className="ml-auto px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-1"
          >
            Đi ngay <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentsConfigRedirect() {
  return <ConfigRedirect source="agents-config" subTab="agents" />;
}

export function ConfigHubRedirect() {
  return <ConfigRedirect source="config" subTab="system" />;
}
