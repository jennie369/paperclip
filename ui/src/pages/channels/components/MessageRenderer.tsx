// MessageRenderer — smart content renderer for Zalo/FB messages
// Detects: image, sticker, file, call, link, gif, reaction, text
// Fixes: Vietnamese mojibake encoding, raw JSON display

import { Phone, FileText, Download } from "lucide-react";

interface MessageContent {
  body: string;
  content_type?: string;
  extra_data?: Record<string, unknown>;
}

type MsgType = "text" | "image" | "sticker" | "file" | "call" | "link" | "gif" | "reaction";

export function MessageRenderer({ body, content_type, extra_data }: MessageContent) {
  const type = detectType({ body, content_type, extra_data });

  switch (type) {
    case "image":
      return <ImageMsg data={extra_data || tryParseJson(body)} />;
    case "sticker":
      return <StickerMsg data={extra_data || tryParseJson(body)} />;
    case "file":
      return <FileMsg data={extra_data || tryParseJson(body)} />;
    case "call":
      return <CallMsg data={extra_data || tryParseJson(body)} />;
    case "link":
      return <LinkMsg data={extra_data || tryParseJson(body)} />;
    case "gif":
      return <ImageMsg data={extra_data || tryParseJson(body)} />;
    case "reaction":
      return <ReactionMsg data={extra_data || tryParseJson(body)} />;
    default:
      return <TextMsg content={body} />;
  }
}

const KNOWN_TYPES = new Set(["image", "sticker", "file", "call", "link", "gif", "reaction"]);

function detectType(msg: MessageContent): MsgType {
  // Only trust content_type if it's a known Zalo media type
  // Ignore generic values like "webchat", "text", "unknown" — fall through to body detection
  if (msg.content_type && KNOWN_TYPES.has(msg.content_type)) {
    return msg.content_type as MsgType;
  }

  const c = msg.body || "";
  if (!c.startsWith("{")) return "text";

  // JSON content — detect by fields
  if (c.includes('"href"') && (c.includes("zdn.vn") || c.includes("photo"))) return "image";
  if (c.includes('"sticker"') || c.includes('"stickerUrl"') || c.includes('"spriteUrl"')) return "sticker";
  if (c.includes('"fileName"') || c.includes('"fileSize"')) return "file";
  if (c.includes('"callDuration"') || c.includes('"callType"')) return "call";
  if (c.includes('"title"') && c.includes('"href"')) return "link";
  if (c.includes('"rType"') || c.includes('"react"')) return "reaction";

  return "text";
}

function tryParseJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

// ── Image ──
function ImageMsg({ data }: { data: Record<string, unknown> }) {
  const src = (data?.href || data?.thumb || data?.url || "") as string;
  // Try params for full-res
  let params: Record<string, unknown> = {};
  if (typeof data?.params === "string") {
    try { params = JSON.parse(data.params as string); } catch {}
  }
  const fullSrc = (data?.hdUrl as string) || src;

  if (!src) return <span className="text-muted-foreground italic text-xs">📷 Hình ảnh</span>;

  return (
    <div className="max-w-[280px]">
      <img
        src={src}
        alt="Hình ảnh"
        className="rounded-lg max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
        loading="lazy"
        onClick={() => window.open(fullSrc, "_blank")}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          el.parentElement?.insertAdjacentHTML(
            "beforeend",
            '<span class="text-xs italic opacity-60">📷 Hình ảnh (không tải được)</span>',
          );
        }}
      />
      {Boolean(params.width) && Boolean(params.height) && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {String(params.width)}×{String(params.height)}
        </div>
      )}
    </div>
  );
}

// ── Sticker ──
function StickerMsg({ data }: { data: Record<string, unknown> }) {
  const url = (data?.stickerUrl || data?.spriteUrl || data?.url || data?.thumb || "") as string;
  if (!url) return <span className="text-2xl">😊</span>;
  return (
    <img
      src={url}
      alt="Sticker"
      className="w-24 h-24 object-contain"
      loading="lazy"
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode("😊 Sticker")); }}
    />
  );
}

// ── File ──
function FileMsg({ data }: { data: Record<string, unknown> }) {
  const name = (data?.fileName || data?.title || "Tệp đính kèm") as string;
  const size = data?.fileSize ? `${Math.round((data.fileSize as number) / 1024)} KB` : "";
  const url = (data?.href || data?.url || "") as string;

  return (
    <div className="flex items-center gap-2.5 bg-muted/60 rounded-xl p-3 max-w-[260px] border border-border/40">
      <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        {size && <div className="text-[11px] text-muted-foreground">{size}</div>}
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Tải xuống"
        >
          <Download className="w-4 h-4 text-primary" />
        </a>
      )}
    </div>
  );
}

// ── Call ──
function CallMsg({ data }: { data: Record<string, unknown> }) {
  const type = data?.callType === "incoming" ? "Cuộc gọi đến" : "Cuộc gọi đi";
  const dur = data?.callDuration as number | undefined;
  const duration = dur
    ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`
    : "Không nghe";

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl p-2.5 border border-border/30">
      <Phone className="w-4 h-4" />
      <span>{type}</span>
      <span className="text-xs opacity-70">{duration}</span>
    </div>
  );
}

// ── Link Preview ──
function LinkMsg({ data }: { data: Record<string, unknown> }) {
  const title = (data?.title || "") as string;
  const desc = (data?.description || "") as string;
  const href = (data?.href || "") as string;
  const thumb = (data?.thumb || "") as string;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block max-w-[260px] border border-border/50 rounded-xl overflow-hidden hover:bg-muted/30 transition-colors"
    >
      {thumb && (
        <img src={thumb} alt="" className="w-full h-32 object-cover" loading="lazy" />
      )}
      <div className="p-2.5">
        {title && <div className="text-sm font-medium line-clamp-2">{title}</div>}
        {desc && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{desc}</div>}
        <div className="text-[11px] text-primary truncate mt-1">{href}</div>
      </div>
    </a>
  );
}

// ── Reaction ──
function ReactionMsg({ data }: { data: Record<string, unknown> }) {
  const emoji = (data?.content || data?.react || "👍") as string;
  return <span className="text-2xl">{emoji}</span>;
}

// ── Text with mojibake fix ──
function TextMsg({ content }: { content: string }) {
  let fixed = content;

  // Fix mojibake: replacement character U+FFFD (�)
  if (/\uFFFD/.test(fixed)) {
    try {
      const bytes = new TextEncoder().encode(fixed);
      fixed = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      // keep original
    }
  }

  // Auto-linkify URLs
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  if (urlRegex.test(fixed)) {
    const parts = fixed.split(urlRegex);
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {parts.map((part, i) =>
          urlRegex.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  }

  return <p className="text-sm whitespace-pre-wrap break-words">{fixed}</p>;
}
