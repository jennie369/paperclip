// FacebookWebSetupDialog — paste cookies JSON + page metadata to onboard a FB Web channel.
// Uses SimpleModal (Radix Dialog crashes in this build).

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { channelsApi } from "@/api/channels";
import { SimpleModal } from "@/pages/crm/components/SimpleModal";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  expirationDate?: number;
}

/**
 * Parse two pasted Cookie-Editor JSON exports (facebook.com + messenger.com)
 * into a merged FbCookie[] array compatible with backend setup endpoint.
 */
function parseAndMergeCookies(fbJson: string, mcJson: string): { cookies: CookieEntry[]; error?: string } {
  let fb: CookieEntry[] = [];
  let mc: CookieEntry[] = [];

  if (fbJson.trim()) {
    try {
      const parsed = JSON.parse(fbJson);
      if (!Array.isArray(parsed)) return { cookies: [], error: "Cookies facebook.com phải là mảng JSON từ Cookie-Editor" };
      fb = parsed.filter((c) => c.domain?.includes("facebook.com"));
    } catch (e: any) {
      return { cookies: [], error: `Cookies facebook.com không phải JSON hợp lệ: ${e.message}` };
    }
  }
  if (mcJson.trim()) {
    try {
      const parsed = JSON.parse(mcJson);
      if (!Array.isArray(parsed)) return { cookies: [], error: "Cookies messenger.com phải là mảng JSON từ Cookie-Editor" };
      mc = parsed.filter((c) => c.domain?.includes("messenger.com"));
    } catch (e: any) {
      return { cookies: [], error: `Cookies messenger.com không phải JSON hợp lệ: ${e.message}` };
    }
  }

  if (fb.length === 0 && mc.length === 0) {
    return { cookies: [], error: "Cần ít nhất 1 cookie từ facebook.com hoặc messenger.com" };
  }

  // Verify critical cookies are present in fb-domain set
  const fbNames = new Set(fb.map((c) => c.name));
  const required = ["c_user", "xs", "datr"];
  const missing = required.filter((n) => !fbNames.has(n));
  if (missing.length > 0 && fb.length > 0) {
    return { cookies: [], error: `Thiếu cookies bắt buộc (.facebook.com): ${missing.join(", ")}` };
  }

  // Dedupe by name+domain (last wins — messenger cookies come after fb if both set)
  const merged = new Map<string, CookieEntry>();
  for (const c of [...fb, ...mc]) merged.set(`${c.name}|${c.domain}`, c);
  return { cookies: Array.from(merged.values()) };
}

export function FacebookWebSetupDialog({ open, onOpenChange, onSuccess }: Props) {
  const [channelName, setChannelName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [fbCookiesJson, setFbCookiesJson] = useState("");
  const [mcCookiesJson, setMcCookiesJson] = useState("");
  const [parseStatus, setParseStatus] = useState<{ count: number; error?: string } | null>(null);

  const setupMut = useMutation({
    mutationFn: (payload: Parameters<typeof channelsApi.setupFacebookWeb>[0]) =>
      channelsApi.setupFacebookWeb(payload),
    onSuccess: (resp) => {
      if (resp?.success) {
        onSuccess();
        reset();
      }
    },
  });

  function reset() {
    setChannelName("");
    setDisplayName("");
    setPageId("");
    setPageName("");
    setFbCookiesJson("");
    setMcCookiesJson("");
    setParseStatus(null);
  }

  function handleValidate() {
    const r = parseAndMergeCookies(fbCookiesJson, mcCookiesJson);
    if (r.error) setParseStatus({ count: 0, error: r.error });
    else setParseStatus({ count: r.cookies.length });
  }

  function handleSubmit() {
    if (!channelName.trim()) {
      setParseStatus({ count: 0, error: "Tên kênh (channel_name) không được để trống" });
      return;
    }
    if (!pageId.trim() || !/^\d+$/.test(pageId.trim())) {
      setParseStatus({ count: 0, error: "Page ID phải là số" });
      return;
    }
    const r = parseAndMergeCookies(fbCookiesJson, mcCookiesJson);
    if (r.error) {
      setParseStatus({ count: 0, error: r.error });
      return;
    }
    setupMut.mutate({
      channel_name: channelName.trim(),
      display_name: displayName.trim() || channelName.trim(),
      page_id: pageId.trim(),
      page_name: pageName.trim() || undefined,
      cookies: r.cookies,
    });
  }

  const setupError = setupMut.isError
    ? ((setupMut.error as any)?.message || "Setup failed")
    : (setupMut.data?.success === false ? setupMut.data.error : null);

  return (
    <SimpleModal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Kết nối Page qua Web Login"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={setupMut.isPending}>
            Hủy
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={setupMut.isPending}>
            {setupMut.isPending ? "Đang kết nối..." : "Kết nối"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-muted-foreground">
          Method này bypass FB App Review (webhook). Cần cookies từ browser Chrome đang login Page admin. Export qua extension{" "}
          <a
            href="https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Cookie-Editor
          </a>{" "}
          (Format: JSON).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Tên kênh (slug, không dấu)</label>
            <input
              className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="fbweb-yinyang"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Tên hiển thị</label>
            <input
              className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="FB Web YinYang"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Page ID *</label>
            <input
              className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="844146582110162"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Tên Page</label>
            <input
              className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Yinyang Masters"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">
            Cookies từ <span className="font-mono">.facebook.com</span> *
          </label>
          <textarea
            className="w-full text-xs border rounded px-2 py-1.5 bg-background font-mono h-28 focus:outline-none focus:ring-1 focus:ring-ring"
            value={fbCookiesJson}
            onChange={(e) => setFbCookiesJson(e.target.value)}
            placeholder='[{"name":"c_user","value":"...","domain":".facebook.com",...}, ...]'
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">
            Cookies từ <span className="font-mono">.messenger.com</span> (optional)
          </label>
          <textarea
            className="w-full text-xs border rounded px-2 py-1.5 bg-background font-mono h-20 focus:outline-none focus:ring-1 focus:ring-ring"
            value={mcCookiesJson}
            onChange={(e) => setMcCookiesJson(e.target.value)}
            placeholder='[{"name":"c_user","value":"...","domain":".messenger.com",...}, ...]'
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleValidate}>
            Kiểm tra cookies
          </Button>
          {parseStatus && !parseStatus.error && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {parseStatus.count} cookies hợp lệ
            </span>
          )}
        </div>

        {parseStatus?.error && (
          <div className="text-xs text-destructive flex items-start gap-1 bg-destructive/10 rounded p-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{parseStatus.error}</span>
          </div>
        )}

        {setupError && (
          <div className="text-xs text-destructive flex items-start gap-1 bg-destructive/10 rounded p-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium">⚠️ Lưu ý risk:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Web Login KHÔNG phải official method → có nguy cơ FB ban account (checkpoint 282)</li>
            <li>Bắt đầu với Page traffic thấp để test, không spam</li>
            <li>IP cố định, KHÔNG VPN giữa session</li>
            <li>Cookies sẽ encrypt AES-256-GCM trong DB</li>
          </ul>
        </div>
      </div>
    </SimpleModal>
  );
}
