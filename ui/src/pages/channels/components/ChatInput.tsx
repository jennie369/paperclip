// Chat Input — emoji picker + quick reply templates + file attach + send
// Ported from ZaloPersonalChat rich input bar
// With reply-to support (D3)

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, Smile, Zap, X, Check, Loader2, CornerUpLeft } from "lucide-react";
import { channelsApi } from "@/api/channels";

interface ReplyToInfo {
  id: string;
  body: string;
  senderLabel: string;
}

// ── Emoji data ──────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Mặt cười",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂",
      "🙂","😊","😇","🥰","😍","🤩","😘","😋",
      "😛","😜","🤪","😝","🤑","🤗","🤭","🫢",
      "🤫","🤔","🫡","🤐","🤨","😐","😑","😶",
      "🫠","😏","😒","🙄","😬","😮‍💨","🤥","🫣",
      "😌","😔","😪","🤤","😴","😷","🤒","🤕",
    ],
  },
  {
    label: "Tay",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏",
      "✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
      "👇","☝️","👍","👎","✊","👊","🤛","🤜",
      "👏","🙌","🫶","👐","🤲","🤝","🙏","💪",
    ],
  },
  {
    label: "Tim",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍",
      "🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓",
      "💗","💖","💘","💝","💟","♥️","💐","🌹",
    ],
  },
  {
    label: "Vật",
    emojis: [
      "💰","💵","💴","💶","💷","💸","💳","🪙",
      "📈","📉","💹","🚀","🌙","⚡","🔮","🎯",
      "🎉","🎊","🏆","🥇","⭐","🌟","✨","💫",
      "🔥","💯","✅","❌","⚠️","💡","📌","🔔",
    ],
  },
];

const DEFAULT_TEMPLATES = [
  "Cảm ơn bạn đã liên hệ! Mình sẽ hỗ trợ ngay ạ.",
  "Vui lòng cho mình biết thêm chi tiết về vấn đề của bạn.",
  "Mình đã chuyển thông tin cho bộ phận phụ trách. Bạn sẽ được hỗ trợ sớm nhất.",
  "Cảm ơn bạn! Chúc bạn một ngày tốt lành 🙏",
  "Bạn có thể xem thêm tại gemral.com nhé!",
];

function loadCustomTemplates(): string[] {
  try { return JSON.parse(localStorage.getItem("inbox-quick-templates") || "[]"); } catch { return []; }
}
function saveCustomTemplates(t: string[]) {
  localStorage.setItem("inbox-quick-templates", JSON.stringify(t));
}

interface Props {
  onSend: (text: string, replyToId?: string) => Promise<void>;
  channelName: string | null;
  threadId?: string | null;
  threadType?: string;
  replyTo?: ReplyToInfo | null;
  onCancelReply?: () => void;
}

export function ChatInput({ onSend, channelName, threadId, threadType, replyTo, onCancelReply }: Props) {
  const [text, setText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Lỗi khi GỬI TIN (25/07). Trước đây `onSend` reject chỉ khôi phục chữ rồi `throw` tiếp
  // vào handler async KHÔNG AI BẮT ⇒ unhandled rejection, người trực chỉ thấy "không có gì
  // xảy ra". Đặt surface lỗi Ở ĐÂY (không phải ở caller) vì 2 lý do:
  //   1. caller nuốt lỗi = `setText(trimmed)` bên dưới KHÔNG chạy ⇒ MẤT chữ vừa gõ;
  //   2. đặt ở đây tự phủ MỌI caller của ChatInput, không phải vá từng màn.
  // Dùng lại y khuôn `uploadError` ngay dưới — vốn sinh ra từ đúng bệnh này (01/07).
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);

  // Quick reply state
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<string[]>(loadCustomTemplates);
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false); // synchronous guard chống double-submit (state async không kịp)
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const quickReplyRef = useRef<HTMLDivElement>(null);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (quickReplyRef.current && !quickReplyRef.current.contains(e.target as Node)) {
        setShowQuickReplies(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    // Guard đồng bộ qua ref: chặn click/Enter thứ hai trước khi state kịp cập nhật
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError(null); // xoá lỗi lần trước, kẻo banner dính vĩnh viễn
    // Clear ô input NGAY để tránh user tưởng chưa gửi (Zalo send delay ~2s) rồi bấm lại → double
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      await onSend(trimmed, replyTo?.id);
    } catch (err: any) {
      // Gửi thất bại → khôi phục nội dung để user thử lại + NÓI CHO NGƯỜI TRỰC BIẾT.
      // (Kênh chưa hỗ trợ gửi tay trả 400 ở đây — trước đây im lặng hoàn toàn.)
      setText(trimmed);
      setSendError(err?.message || "Gửi tin thất bại.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [text, onSend, replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = gửi; Shift+Enter = xuống dòng. Guard IME tiếng Việt (Telex/VNI) đang ghép ký tự.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setText(newText);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
        ta.focus();
      });
    } else {
      setText((prev) => prev + emoji);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channelName) return;
    // BUG-fix 2026-07-01: trước đây truyền threadId="" → route /upload trả 400 rồi
    // catch{} NUỐT lỗi im lặng → chị bấm gửi ảnh không thấy gì. Truyền threadId thật
    // + surface lỗi (route + protocol Zalo trả {success,error}).
    if (!threadId) {
      setUploadError("Không xác định được cuộc trò chuyện để gửi ảnh.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const result = await channelsApi.uploadImage(channelName, threadId, file, threadType || "dm");
      if (!result?.success) {
        setUploadError(result?.error || "Gửi ảnh thất bại (kênh chưa kết nối hoặc lỗi Zalo).");
      }
    } catch (err: any) {
      setUploadError(err?.message || "Gửi ảnh thất bại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="border-t px-3 py-2">
      {/* Send error banner — cùng khuôn với uploadError bên dưới (25/07) */}
      {sendError && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px]">
          <span className="flex-1 min-w-0">⚠️ {sendError}</span>
          <button onClick={() => setSendError(null)} className="shrink-0 hover:opacity-70" title="Đóng">✕</button>
        </div>
      )}
      {/* Upload error banner — không còn nuốt lỗi im lặng khi gửi ảnh/file thất bại */}
      {uploadError && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px]">
          <span className="flex-1 min-w-0">⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="shrink-0 hover:opacity-70" title="Đóng">✕</button>
        </div>
      )}
      {/* FIX 3: Reply-to preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/60">
          <CornerUpLeft className="h-3 w-3 text-violet-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium text-violet-500">{replyTo.senderLabel}</span>
            <p className="text-[11px] text-muted-foreground truncate">{replyTo.body}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        {/* Attach button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0"
          title="Đính kèm"
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          /* CSKH (in-app) gửi được cả ảnh LẪN tệp; Zalo chỉ ảnh (sendImage). */
          accept={channelName?.startsWith("cskh") ? undefined : "image/*"}
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Emoji picker button */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            className={`p-1.5 rounded shrink-0 transition-colors ${
              showEmojiPicker
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => {
              setShowEmojiPicker((v) => !v);
              setShowQuickReplies(false);
            }}
            title="Biểu tượng cảm xúc"
          >
            <Smile className="h-4 w-4" />
          </button>

          {/* Emoji picker dropdown */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Biểu tượng cảm xúc</span>
                <button
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Category tabs */}
              <div className="flex border-b border-border overflow-x-auto px-1 py-1.5 gap-0.5">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.label}
                    className={`text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                      emojiCategory === idx
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setEmojiCategory(idx)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-auto">
                {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    className="text-xl hover:bg-muted rounded-md p-1 transition-colors cursor-pointer"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick reply button */}
        <div className="relative" ref={quickReplyRef}>
          <button
            className={`p-1.5 rounded shrink-0 transition-colors ${
              showQuickReplies
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => {
              setShowQuickReplies((v) => !v);
              setShowEmojiPicker(false);
            }}
            title="Mẫu trả lời nhanh"
          >
            <Zap className="h-4 w-4" />
          </button>

          {/* Quick reply dropdown */}
          {showQuickReplies && (
            <div className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">Mẫu trả lời nhanh</p>
                <button
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => {
                    const t = prompt("Nhập mẫu trả lời mới:");
                    if (t?.trim()) {
                      const updated = [...customTemplates, t.trim()];
                      setCustomTemplates(updated);
                      saveCustomTemplates(updated);
                    }
                  }}
                >
                  + Thêm mẫu
                </button>
              </div>
              <div className="py-1 max-h-60 overflow-auto">
                {allTemplates.map((template, idx) => {
                  const isCustom = idx >= DEFAULT_TEMPLATES.length;
                  return (
                    <div key={idx} className="group flex items-center hover:bg-muted transition-colors">
                      <button
                        className="flex-1 text-left px-3 py-2 text-sm cursor-pointer"
                        onClick={() => {
                          setText(template);
                          setShowQuickReplies(false);
                          textareaRef.current?.focus();
                        }}
                      >
                        {template}
                      </button>
                      {isCustom && (
                        <button
                          className="hidden group-hover:block px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const customIdx = idx - DEFAULT_TEMPLATES.length;
                            const updated = customTemplates.filter((_, i) => i !== customIdx);
                            setCustomTemplates(updated);
                            saveCustomTemplates(updated);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          className="flex-1 resize-none bg-muted/30 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring min-h-[36px] max-h-[120px]"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 shrink-0"
          title="Gửi (Enter)"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 text-right">
        Enter gửi · Shift+Enter xuống dòng
      </div>
    </div>
  );
}
