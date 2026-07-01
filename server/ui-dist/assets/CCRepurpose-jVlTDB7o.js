import { ag as useQuery, b5 as useQueryClient, r as reactExports, b6 as useMutation, b7 as queryKeys, aC as getSupabase, b8 as Facebook, m as Mail, b9 as PanelsTopLeft, ba as MessageCircle, j as jsxRuntimeExports, bb as Repeat, bc as Button, C as CircleCheckBig, a2 as Download, bd as CircleAlert, be as Hash, a4 as Globe, l as TrendingUp, Z as Zap, F as FileText, y as Search, k as LoaderCircle, bf as Select, V as Target, bg as Badge, d as Sparkles, bh as ProgressBar, q as ChartColumn, A as ArrowRight, E as Eye, c as Clock, b1 as CalendarDays, a6 as Shield, a8 as CircleX, t as TriangleAlert, bi as ChevronUp, bj as ChevronDown, ac as Copy, n as Send, N as Lightbulb } from './index-B6bTFNAD.js';
import { F as Film } from './film-kBGLTcEd.js';

function useScriptsForRepurpose() {
  return useQuery({
    queryKey: ["scripts", "for-repurpose"],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("cc_scripts").select("id, title, content_type, track, persona, word_count, body, created_at, status").in("status", ["draft", "review", "approved", "published"]).order("created_at", { ascending: false }).limit(50);
      if (error) {
        console.error("[useScriptsForRepurpose] Error:", error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
}
function useRepurposeScript() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = reactExports.useState([]);
  const mutation = useMutation({
    mutationFn: async ({
      scriptId,
      targets
    }) => {
      setProgress(targets.map((t) => ({ target: t, status: "generating" })));
      const response = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, targets })
      });
      const json = await response.json();
      if (!response.ok || !json.success || !json.data) {
        setProgress(
          (prev) => prev.map((p) => ({ ...p, status: "error" }))
        );
        throw new Error(json.error ?? "Lỗi khi tái chế nội dung");
      }
      const result = json.data;
      setProgress(
        targets.map((t) => ({
          target: t,
          status: result.completedTargets.includes(t) ? "done" : "error"
        }))
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.all });
    }
  });
  const reset = reactExports.useCallback(() => {
    setProgress([]);
    mutation.reset();
  }, [mutation]);
  return {
    repurpose: mutation.mutate,
    repurposeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error?.message ?? null,
    progress,
    reset
  };
}

const SCRIPT_TYPE_LABELS = {
  latc: "LATC",
  tmt: "TMT",
  short_clip: "Clip Ngắn"
};
const TRACK_LABELS = {
  wealth: { label: "Tài Chính", color: "text-gold" },
  wellness: { label: "Tâm Thức", color: "text-purple" },
  integration: { label: "Tích Hợp", color: "text-emerald" }
};
const TARGET_OPTIONS = [
  {
    key: "facebookPosts",
    apiTarget: "facebook_posts",
    label: "5 Facebook Posts",
    count: 5,
    desc: "5 góc nhìn khác nhau từ kịch bản",
    icon: Facebook,
    color: "text-blue",
    bgColor: "bg-blue/20"
  },
  {
    key: "emailSequences",
    apiTarget: "email_sequence",
    label: "3 Email Sequences",
    count: 3,
    desc: "Nurture → Value → CTA",
    icon: Mail,
    color: "text-purple",
    bgColor: "bg-purple/20"
  },
  {
    key: "shortClips",
    apiTarget: "short_clips",
    label: "4 Short Clips",
    count: 4,
    desc: "4 khoảnh khắc hay nhất, 30-60 giây",
    icon: Film,
    color: "text-rose",
    bgColor: "bg-rose/20"
  },
  {
    key: "landingPage",
    apiTarget: "landing_page",
    label: "1 Landing Page Copy",
    count: 1,
    desc: "Headline, body, CTA cho landing page",
    icon: PanelsTopLeft,
    color: "text-emerald",
    bgColor: "bg-emerald/20"
  },
  {
    key: "communityQuestions",
    apiTarget: "community_questions",
    label: "2 Community Questions",
    count: 2,
    desc: "Câu hỏi tạo tương tác cộng đồng",
    icon: MessageCircle,
    color: "text-gold",
    bgColor: "bg-gold/20"
  }
];
const ANGLE_COLORS = {
  "painpoint": "text-rose",
  "story": "text-purple",
  "insight": "text-gold",
  "social proof": "text-emerald",
  "cta": "text-cyan"
};
function getAngleColor(angle) {
  const lower = angle.toLowerCase();
  for (const [key, color] of Object.entries(ANGLE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "text-txt-2";
}
const EMAIL_TYPE_LABELS = {
  nurture: "Nurture — Nuôi Dưỡng",
  value: "Value — Giá Trị",
  cta: "CTA — Kêu Gọi Hành Động"
};
function ScriptPreviewCard({ script }) {
  const trackInfo = TRACK_LABELS[script.track] ?? { label: script.track, color: "text-txt-3" };
  const preview = script.body?.slice(0, 200) ?? "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-txt-2 uppercase tracking-wider flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, className: "text-gold" }),
        "Xem Trước Kịch Bản"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: SCRIPT_TYPE_LABELS[script.content_type] ?? script.content_type, variant: "gold", size: "sm" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-txt leading-snug", children: script.title }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3 leading-relaxed line-clamp-3", children: [
      preview,
      "..."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 pt-2 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 10 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          (script.word_count ?? 0).toLocaleString("vi-VN"),
          " từ"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          Math.round((script.word_count ?? 0) / 150),
          " phút đọc"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-1.5 text-xxs ${trackInfo.color}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 10 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: trackInfo.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { size: 10 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(script.created_at).toLocaleDateString("vi-VN") })
      ] })
    ] })
  ] });
}
function FacebookPostCard({ post, index, isExpanded, onToggle, onCopy, copied }) {
  const charCount = post.charCount ?? post.content.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: onToggle,
        className: "w-full flex items-center gap-3 p-3 hover:bg-bg-4/50 transition-all duration-normal",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center text-sm font-bold text-blue", children: index + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-semibold ${getAngleColor(post.angle)}`, children: post.angle }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 truncate max-w-[400px]", children: post.content.split("\n")[0] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
              charCount,
              " ký tự"
            ] }),
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 12, className: "text-txt-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, className: "text-txt-3" })
          ] })
        ]
      }
    ),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-glass-bg rounded-card p-4 mt-3 max-h-[200px] overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 whitespace-pre-wrap leading-relaxed", children: post.content }) }),
      post.hashtags && post.hashtags.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 mt-2", children: post.hashtags.map((tag, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-blue bg-blue/10 px-1.5 py-0.5 rounded", children: [
        "#",
        tag
      ] }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
            charCount,
            " ký tự"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Badge,
            {
              text: charCount <= 500 ? "Ngắn" : charCount <= 1e3 ? "Trung bình" : "Dài",
              variant: charCount <= 500 ? "success" : charCount <= 1e3 ? "gold" : "info",
              size: "sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            icon: copied === `fb-${index}` ? CircleCheckBig : Copy,
            onClick: () => onCopy(post.content, `fb-${index}`),
            children: copied === `fb-${index}` ? "Đã Sao Chép" : "Sao Chép"
          }
        )
      ] })
    ] })
  ] });
}
function EmailSequenceCard({ email, index, isExpanded, onToggle, onCopy, copied }) {
  const typeColors = { nurture: "text-purple", value: "text-emerald", cta: "text-gold" };
  const typeBgColors = { nurture: "bg-purple/20", value: "bg-emerald/20", cta: "bg-gold/20" };
  const typeLabel = EMAIL_TYPE_LABELS[email.type] ?? email.type;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: onToggle,
        className: "w-full flex items-center gap-3 p-3 hover:bg-bg-4/50 transition-all duration-normal",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-8 h-8 rounded-full ${typeBgColors[email.type] ?? "bg-purple/20"} flex items-center justify-center`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 14, className: typeColors[email.type] ?? "text-purple" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt", children: email.subject }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: typeLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: email.type.toUpperCase(), variant: email.type === "cta" ? "gold" : email.type === "value" ? "success" : "info", size: "sm" }),
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 12, className: "text-txt-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, className: "text-txt-3" })
          ] })
        ]
      }
    ),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xxs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10, className: "text-txt-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3", children: email.timing })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xxs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 10, className: "text-txt-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-txt-2 font-medium", children: [
            "Tiêu đề: ",
            email.subject
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-glass-bg rounded-card p-4 mt-3 max-h-[250px] overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 whitespace-pre-wrap leading-relaxed", children: email.body }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-end mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          icon: copied === `email-${index}` ? CircleCheckBig : Copy,
          onClick: () => onCopy(`Tiêu đề: ${email.subject}

${email.body}`, `email-${index}`),
          children: copied === `email-${index}` ? "Đã Sao Chép" : "Sao Chép"
        }
      ) })
    ] })
  ] });
}
function ClipCard({ clip, index, isExpanded, onToggle, onCopy, copied }) {
  const fullContent = [clip.hook, clip.body, clip.cta].filter(Boolean).join("\n\n");
  const duration = `${clip.estimatedDuration ?? 45} giây`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: onToggle,
        className: "w-full flex items-center gap-3 p-3 hover:bg-bg-4/50 transition-all duration-normal",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { size: 14, className: "text-rose" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt", children: clip.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: clip.timestampHint ?? "" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
              clip.wordCount ?? 0,
              " từ"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: duration, variant: "danger", size: "sm" }),
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 12, className: "text-txt-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, className: "text-txt-3" })
          ] })
        ]
      }
    ),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: clip.timestampHint ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 10 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            clip.wordCount ?? 0,
            " từ"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-rose", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { size: 10 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: duration })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-glass-bg rounded-card p-4 mt-3 max-h-[200px] overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 whitespace-pre-wrap leading-relaxed", children: fullContent }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-end mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          icon: copied === `clip-${index}` ? CircleCheckBig : Copy,
          onClick: () => onCopy(fullContent, `clip-${index}`),
          children: copied === `clip-${index}` ? "Đã Sao Chép" : "Sao Chép"
        }
      ) })
    ] })
  ] });
}
function LandingPagePreview({ data, onCopy, copied }) {
  const bodyParts = [];
  if (data.painPoints?.length) bodyParts.push("Nỗi đau:\n" + data.painPoints.map((p) => `• ${p}`).join("\n"));
  if (data.benefits?.length) bodyParts.push("Lợi ích:\n" + data.benefits.map((b) => `• ${b}`).join("\n"));
  if (data.testimonialPrompt) bodyParts.push(data.testimonialPrompt);
  if (data.urgencyLine) bodyParts.push(data.urgencyLine);
  const bodyText = bodyParts.join("\n\n");
  const fullText = `${data.headline}

${data.subheadline}

${bodyText}

[CTA] ${data.ctaText}
${data.ctaSubtext}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelsTopLeft, { size: 16, className: "text-emerald" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold text-txt", children: "Landing Page Copy" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-glass-bg rounded-card p-5 space-y-4 border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-emerald font-semibold uppercase tracking-wider", children: "Headline" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-bold text-txt mt-1", children: data.headline })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-emerald font-semibold uppercase tracking-wider", children: "Subheadline" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 mt-1", children: data.subheadline })
      ] }),
      data.painPoints && data.painPoints.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-rose font-semibold uppercase tracking-wider", children: "Nỗi Đau" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 space-y-1", children: data.painPoints.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs text-txt-2 flex items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 10, className: "text-rose mt-0.5 flex-shrink-0" }),
          p
        ] }, i)) })
      ] }),
      data.benefits && data.benefits.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-emerald font-semibold uppercase tracking-wider", children: "Lợi Ích" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 space-y-1", children: data.benefits.map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs text-txt-2 flex items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 10, className: "text-emerald mt-0.5 flex-shrink-0" }),
          b
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-border text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-block px-8 py-3 rounded-card bg-gold/20 border border-gold/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-gold", children: data.ctaText }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: data.ctaSubtext })
        ] }),
        data.urgencyLine && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-rose mt-2", children: data.urgencyLine })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "ghost",
        size: "sm",
        icon: copied === "landing" ? CircleCheckBig : Copy,
        onClick: () => onCopy(fullText, "landing"),
        children: copied === "landing" ? "Đã Sao Chép" : "Sao Chép Toàn Bộ"
      }
    ) })
  ] });
}
function CommunityQuestionCard({ question, index, onCopy, copied }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 14, className: "text-gold" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-semibold text-txt", children: [
          "Câu Hỏi #",
          index + 1
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: question.context ?? "Tương tác", variant: "gold", size: "sm" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-glass-bg rounded-card p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2 whitespace-pre-wrap leading-relaxed", children: question.question }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xxs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { size: 10 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: question.engagementHook ?? "" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          icon: copied === `cq-${index}` ? CircleCheckBig : Copy,
          onClick: () => onCopy(question.question, `cq-${index}`),
          children: copied === `cq-${index}` ? "Đã Sao Chép" : "Sao Chép"
        }
      )
    ] })
  ] });
}
function BrandVoiceCheckPanel({ items }) {
  const passed = items.filter((i) => i.passed).length;
  const total = items.length;
  const score = total > 0 ? Math.round(passed / total * 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-semibold text-txt-2 uppercase tracking-wider flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 14, className: "text-purple" }),
        "Kiểm Tra Brand Voice"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-lg font-heading font-bold ${score >= 80 ? "text-success" : score >= 60 ? "text-gold" : "text-danger"}`, children: [
        score,
        "/100"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { value: score, color: score >= 80 ? "emerald" : score >= 60 ? "gold" : "danger", size: "sm" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 text-xxs", children: [
      item.passed ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12, className: "text-success flex-shrink-0 mt-0.5" }) : item.severity === "critical" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 12, className: "text-danger flex-shrink-0 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 12, className: "text-gold flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: item.passed ? "text-txt-2" : item.severity === "critical" ? "text-danger" : "text-gold", children: item.label })
    ] }, i)) })
  ] });
}
function ResultSectionHeader({ icon: Icon, iconColor, iconBg, title, subtitle, badgeText, badgeVariant, isExpanded, onToggle }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onToggle,
      className: "w-full card p-3 flex items-center justify-between hover:bg-bg-4/50 transition-all duration-normal",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 16, className: iconColor }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-txt", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: subtitle })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: badgeText, variant: badgeVariant, size: "sm" }),
          isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 14, className: "text-txt-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14, className: "text-txt-3" })
        ] })
      ]
    }
  );
}
function RepurposePage() {
  const { data: scripts, isLoading: isLoadingScripts, error: scriptsError } = useScriptsForRepurpose();
  const { repurposeAsync, isLoading: isRepurposing, error: repurposeError, progress } = useRepurposeScript();
  const [selectedScriptId, setSelectedScriptId] = reactExports.useState("");
  const [targets, setTargets] = reactExports.useState({
    facebookPosts: true,
    emailSequences: true,
    shortClips: true,
    landingPage: true,
    communityQuestions: true
  });
  const [generationStage, setGenerationStage] = reactExports.useState("");
  const [generationProgress, setGenerationProgress] = reactExports.useState(0);
  const [results, setResults] = reactExports.useState(null);
  const [brandCheckItems, setBrandCheckItems] = reactExports.useState([]);
  const [copied, setCopied] = reactExports.useState(null);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [expandedSections, setExpandedSections] = reactExports.useState({
    facebook: true,
    email: false,
    clips: false,
    landing: false,
    community: false
  });
  const [expandedItems, setExpandedItems] = reactExports.useState({});
  const scriptList = scripts ?? [];
  const selectedScript = reactExports.useMemo(
    () => scriptList.find((s) => s.id === selectedScriptId) ?? null,
    [scriptList, selectedScriptId]
  );
  const filteredScripts = reactExports.useMemo(() => {
    if (!searchQuery.trim()) return scriptList;
    const q = searchQuery.toLowerCase();
    return scriptList.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content_type.toLowerCase().includes(q)
    );
  }, [scriptList, searchQuery]);
  const selectedTargetCount = reactExports.useMemo(() => {
    let c = 0;
    if (targets.facebookPosts) c += 5;
    if (targets.emailSequences) c += 3;
    if (targets.shortClips) c += 4;
    if (targets.landingPage) c += 1;
    if (targets.communityQuestions) c += 2;
    return c;
  }, [targets]);
  const totalGeneratedItems = reactExports.useMemo(() => {
    if (!results) return 0;
    let c = 0;
    c += results.facebookPosts?.length ?? 0;
    c += results.emails?.length ?? 0;
    c += results.clips?.length ?? 0;
    if (results.landingPage) c += 1;
    c += results.questions?.length ?? 0;
    return c;
  }, [results]);
  const platformsCovered = reactExports.useMemo(() => {
    if (!results) return 0;
    let c = 0;
    if ((results.facebookPosts?.length ?? 0) > 0) c += 1;
    if ((results.emails?.length ?? 0) > 0) c += 1;
    if ((results.clips?.length ?? 0) > 0) c += 1;
    if (results.landingPage) c += 1;
    if ((results.questions?.length ?? 0) > 0) c += 1;
    return c;
  }, [results]);
  const handleToggleTarget = reactExports.useCallback((key) => {
    setTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const handleToggleSection = reactExports.useCallback((section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);
  const handleToggleItem = reactExports.useCallback((itemKey) => {
    setExpandedItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  }, []);
  const handleCopy = reactExports.useCallback((text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2e3);
  }, []);
  const handleGenerate = reactExports.useCallback(async () => {
    if (!selectedScript) return;
    if (!Object.values(targets).some(Boolean)) return;
    const apiTargets = TARGET_OPTIONS.filter((t) => targets[t.key]).map((t) => t.apiTarget);
    setResults(null);
    setBrandCheckItems([]);
    setGenerationStage("Đang gửi yêu cầu tái chế...");
    setGenerationProgress(10);
    try {
      setGenerationStage("Đang phân tích kịch bản gốc...");
      setGenerationProgress(25);
      const result = await repurposeAsync({
        scriptId: selectedScript.id,
        targets: apiTargets
      });
      setGenerationProgress(90);
      setGenerationStage("Kiểm tra Brand Voice...");
      const brandScore = result.brandVoiceScore ?? 0;
      const brandItems = [
        { label: "Jennie ở vị trí CAO, NỔI TIẾNG", passed: brandScore >= 60, severity: brandScore >= 60 ? "ok" : "warning" },
        { label: "Nói về NGƯỜI KHÁC (không victim story)", passed: brandScore >= 50, severity: brandScore >= 50 ? "ok" : "warning" },
        { label: "Không liệt kê tính năng", passed: brandScore >= 70, severity: brandScore >= 70 ? "ok" : "warning" },
        { label: 'Giọng "Chia sẻ bí mật / quan sát"', passed: brandScore >= 65, severity: brandScore >= 65 ? "ok" : "critical" },
        { label: "Không sử dụng tiếng Anh xen lẫn", passed: brandScore >= 80, severity: brandScore >= 80 ? "ok" : "warning" },
        { label: "CTA khéo léo, không bán hàng trực tiếp", passed: brandScore >= 55, severity: brandScore >= 55 ? "ok" : "warning" }
      ];
      setResults(result);
      setBrandCheckItems(brandItems);
      setGenerationProgress(100);
      setGenerationStage("Hoàn tất!");
      const sectionMap = {
        facebook: (result.facebookPosts?.length ?? 0) > 0,
        email: (result.emails?.length ?? 0) > 0,
        clips: (result.clips?.length ?? 0) > 0,
        landing: result.landingPage !== void 0 && result.landingPage !== null,
        community: (result.questions?.length ?? 0) > 0
      };
      const firstAvailable = Object.entries(sectionMap).find(([, v]) => v);
      if (firstAvailable) {
        setExpandedSections(() => {
          const next = { facebook: false, email: false, clips: false, landing: false, community: false };
          next[firstAvailable[0]] = true;
          return next;
        });
      }
    } catch {
      setGenerationStage("");
      setGenerationProgress(0);
    }
  }, [selectedScript, targets, repurposeAsync]);
  const handleExportAll = reactExports.useCallback(() => {
    if (!results || !selectedScript) return;
    let exportText = `=== TÁI SỬ DỤNG NỘI DUNG ===
Kịch bản gốc: ${selectedScript.title}
Ngày tạo: ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}

`;
    if (results.facebookPosts && results.facebookPosts.length > 0) {
      exportText += "--- FACEBOOK POSTS ---\n\n";
      results.facebookPosts.forEach((p) => {
        exportText += `[${p.angle}]
${p.content}

---

`;
      });
    }
    if (results.emails && results.emails.length > 0) {
      exportText += "--- EMAIL SEQUENCES ---\n\n";
      results.emails.forEach((e) => {
        exportText += `[${EMAIL_TYPE_LABELS[e.type] ?? e.type}] ${e.subject}
Timing: ${e.timing}

${e.body}

---

`;
      });
    }
    if (results.clips && results.clips.length > 0) {
      exportText += "--- SHORT CLIPS ---\n\n";
      results.clips.forEach((c) => {
        exportText += `[${c.title}] ${c.timestampHint} (${c.estimatedDuration}s)

${c.hook}
${c.body}
${c.cta}

---

`;
      });
    }
    if (results.landingPage) {
      exportText += "--- LANDING PAGE ---\n\n";
      exportText += `Headline: ${results.landingPage.headline}
Subheadline: ${results.landingPage.subheadline}

CTA: ${results.landingPage.ctaText}
${results.landingPage.ctaSubtext}

---

`;
    }
    if (results.questions && results.questions.length > 0) {
      exportText += "--- COMMUNITY QUESTIONS ---\n\n";
      results.questions.forEach((q) => {
        exportText += `[${q.context}]
${q.question}

---

`;
      });
    }
    navigator.clipboard.writeText(exportText);
    setCopied("export-all");
    setTimeout(() => setCopied(null), 2500);
  }, [results, selectedScript]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-card bg-purple/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Repeat, { size: 22, className: "text-gold" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-heading text-2xl font-semibold text-txt", children: "Tái Sử Dụng Nội Dung" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "1 Kịch Bản YouTube → Đa Nền Tảng: Facebook, Email, Clips, Landing Page, Community" })
        ] })
      ] }),
      results && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", icon: copied === "export-all" ? CircleCheckBig : Download, onClick: handleExportAll, children: copied === "export-all" ? "Đã Xuất" : "Xuất Tất Cả" }) })
    ] }),
    (repurposeError || scriptsError) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 border-danger/30 bg-danger/5 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 18, className: "text-danger flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-danger", children: "Lỗi" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-2", children: repurposeError ?? scriptsError?.message ?? "Đã xảy ra lỗi" })
      ] })
    ] }),
    results && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-4 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-purple/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { size: 16, className: "text-purple" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-heading font-bold text-txt", children: totalGeneratedItems }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Nội dung đã tạo" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 16, className: "text-emerald" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-heading font-bold text-txt", children: platformsCovered }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Nền tảng phủ sóng" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 16, className: "text-gold" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-heading font-bold text-txt", children: [
            "~",
            (totalGeneratedItems * 2500).toLocaleString("vi-VN")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Lượt tiếp cận ước tính" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-3 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 16, className: "text-cyan" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-heading font-bold text-txt", children: [
            "x",
            totalGeneratedItems
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Hệ số nhân nội dung" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-5 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold text-txt flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16, className: "text-gold" }),
            "Chọn Kịch Bản Gốc"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-txt-3" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                className: "fi pl-9 text-sm",
                placeholder: "Tìm kịch bản theo tên hoặc loại...",
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value)
              }
            )
          ] }),
          isLoadingScripts ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "mx-auto mb-2 text-purple animate-spin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "Đang tải danh sách kịch bản..." })
          ] }) : scriptList.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-6 text-txt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 32, className: "mx-auto mb-2 opacity-50" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: "Chưa có kịch bản nào. Hãy tạo kịch bản trước." })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Select,
              {
                label: "Kịch Bản",
                options: filteredScripts.map((s) => ({ value: s.id, label: `[${SCRIPT_TYPE_LABELS[s.content_type] ?? s.content_type}] ${s.title}` })),
                value: selectedScriptId,
                onChange: setSelectedScriptId,
                placeholder: "Chọn kịch bản nguồn..."
              }
            ),
            selectedScript && /* @__PURE__ */ jsxRuntimeExports.jsx(ScriptPreviewCard, { script: selectedScript }),
            !selectedScript && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-6 text-txt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 32, className: "mx-auto mb-2 opacity-50" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: "Chọn một kịch bản để bắt đầu tái sử dụng" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold text-txt flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 16, className: "text-purple" }),
              "Chọn Đích Tái Sử Dụng"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
              selectedTargetCount,
              " nội dung sẽ được tạo"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: TARGET_OPTIONS.map((target) => {
            const Icon = target.icon;
            const isChecked = targets[target.key];
            const progressItem = progress.find((p) => p.target === target.apiTarget);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => handleToggleTarget(target.key),
                className: `w-full flex items-center gap-3 p-3 rounded-card border transition-all duration-normal ${isChecked ? "border-purple/30 bg-purple/5" : "border-border bg-glass-bg hover:border-border"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-5 h-5 rounded flex items-center justify-center border transition-all duration-normal flex-shrink-0 ${isChecked ? "bg-purple border-purple" : "border-border bg-bg-4"}`, children: isChecked && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12, className: "text-bg" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-8 h-8 rounded-full ${target.bgColor} flex items-center justify-center flex-shrink-0`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 14, className: target.color }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-left", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt", children: target.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: target.desc })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    progressItem && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Badge,
                      {
                        text: progressItem.status === "generating" ? "Đang tạo" : progressItem.status === "done" ? "Xong" : progressItem.status === "error" ? "Lỗi" : "",
                        variant: progressItem.status === "done" ? "success" : progressItem.status === "error" ? "danger" : "info",
                        size: "sm"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: `${target.count}`, variant: isChecked ? "new" : "default", size: "sm" })
                  ] })
                ]
              },
              target.key
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "gold",
            size: "lg",
            icon: isRepurposing ? LoaderCircle : Sparkles,
            fullWidth: true,
            onClick: handleGenerate,
            disabled: !selectedScript || isRepurposing || !Object.values(targets).some(Boolean),
            loading: isRepurposing,
            children: isRepurposing ? "Đang Tạo..." : "Tái Sử Dụng Nội Dung"
          }
        ),
        isRepurposing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "text-purple animate-spin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2", children: generationStage })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { value: generationProgress, color: "purple", size: "md", showLabel: true, label: "Tiến trình tái sử dụng", animated: true })
        ] }),
        brandCheckItems.length > 0 && !isRepurposing && /* @__PURE__ */ jsxRuntimeExports.jsx(BrandVoiceCheckPanel, { items: brandCheckItems })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-7 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold text-txt flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 16, className: "text-emerald" }),
            "Kết Quả Tái Sử Dụng"
          ] }),
          results && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: `${totalGeneratedItems} nội dung`, variant: "new", size: "sm", dot: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { text: `${platformsCovered} nền tảng`, variant: "gold", size: "sm", dot: true })
          ] })
        ] }) }),
        !results && !isRepurposing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-12 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Repeat, { size: 48, className: "mx-auto mb-4 text-txt-3 opacity-40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt-2 mb-2", children: "Chưa Có Kết Quả" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 max-w-md mx-auto", children: 'Chọn kịch bản gốc, đánh dấu các đích muốn tạo, sau đó nhấn "Tái Sử Dụng Nội Dung" để bắt đầu.' }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 mt-6 text-xxs text-txt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 10 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 10 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12, className: "text-gold" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 10 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12, className: "text-success" })
          ] })
        ] }),
        isRepurposing && !results && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-12 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 48, className: "mx-auto mb-4 text-purple animate-spin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt-2 mb-2", children: "Đang Tạo Nội Dung..." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: generationStage })
        ] }),
        results && results.facebookPosts && results.facebookPosts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultSectionHeader,
            {
              icon: Facebook,
              iconColor: "text-blue",
              iconBg: "bg-blue/20",
              title: "Facebook Posts",
              subtitle: `${results.facebookPosts.length} bài viết, ${results.facebookPosts.length} góc nhìn`,
              badgeText: `${results.facebookPosts.length}`,
              badgeVariant: "info",
              isExpanded: expandedSections.facebook ?? false,
              onToggle: () => handleToggleSection("facebook")
            }
          ),
          expandedSections.facebook && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 pl-2", children: results.facebookPosts.map((post, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FacebookPostCard,
            {
              post,
              index: i,
              isExpanded: expandedItems[`fb-${i}`] ?? false,
              onToggle: () => handleToggleItem(`fb-${i}`),
              onCopy: handleCopy,
              copied
            },
            i
          )) })
        ] }),
        results && results.emails && results.emails.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultSectionHeader,
            {
              icon: Mail,
              iconColor: "text-purple",
              iconBg: "bg-purple/20",
              title: "Email Sequences",
              subtitle: "Nurture → Value → CTA",
              badgeText: `${results.emails.length}`,
              badgeVariant: "info",
              isExpanded: expandedSections.email ?? false,
              onToggle: () => handleToggleSection("email")
            }
          ),
          expandedSections.email && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 pl-2", children: results.emails.map((email, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            EmailSequenceCard,
            {
              email,
              index: i,
              isExpanded: expandedItems[`email-${i}`] ?? false,
              onToggle: () => handleToggleItem(`email-${i}`),
              onCopy: handleCopy,
              copied
            },
            i
          )) })
        ] }),
        results && results.clips && results.clips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultSectionHeader,
            {
              icon: Film,
              iconColor: "text-rose",
              iconBg: "bg-rose/20",
              title: "Short Clips",
              subtitle: "Khoảnh khắc hay nhất, 30-60 giây",
              badgeText: `${results.clips.length}`,
              badgeVariant: "danger",
              isExpanded: expandedSections.clips ?? false,
              onToggle: () => handleToggleSection("clips")
            }
          ),
          expandedSections.clips && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 pl-2", children: results.clips.map((clip, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            ClipCard,
            {
              clip,
              index: i,
              isExpanded: expandedItems[`clip-${i}`] ?? false,
              onToggle: () => handleToggleItem(`clip-${i}`),
              onCopy: handleCopy,
              copied
            },
            i
          )) })
        ] }),
        results && results.landingPage && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultSectionHeader,
            {
              icon: PanelsTopLeft,
              iconColor: "text-emerald",
              iconBg: "bg-emerald/20",
              title: "Landing Page Copy",
              subtitle: "Headline, body, CTA sẵn sàng sử dụng",
              badgeText: "1",
              badgeVariant: "success",
              isExpanded: expandedSections.landing ?? false,
              onToggle: () => handleToggleSection("landing")
            }
          ),
          expandedSections.landing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pl-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LandingPagePreview, { data: results.landingPage, onCopy: handleCopy, copied }) })
        ] }),
        results && results.questions && results.questions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultSectionHeader,
            {
              icon: MessageCircle,
              iconColor: "text-gold",
              iconBg: "bg-gold/20",
              title: "Community Questions",
              subtitle: "Câu hỏi tạo tương tác cộng đồng",
              badgeText: `${results.questions.length}`,
              badgeVariant: "gold",
              isExpanded: expandedSections.community ?? false,
              onToggle: () => handleToggleSection("community")
            }
          ),
          expandedSections.community && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 pl-2", children: results.questions.map((q, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityQuestionCard, { question: q, index: i, onCopy: handleCopy, copied }, i)) })
        ] })
      ] })
    ] }),
    results && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-2", children: "Kịch bản gốc:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-purple truncate max-w-[200px]", children: selectedScript?.title.split("—")[0]?.trim() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-6 bg-border" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-2", children: "Nội dung:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-gold", children: totalGeneratedItems })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-6 bg-border" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-2", children: "Nền tảng:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-emerald", children: platformsCovered })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-6 bg-border" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-2", children: "Tiếp cận:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-cyan", children: [
            "~",
            (totalGeneratedItems * 2500).toLocaleString("vi-VN")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", icon: Sparkles, onClick: handleGenerate, disabled: isRepurposing, children: "Tái Tạo Lại" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", icon: copied === "export-all" ? CircleCheckBig : Download, onClick: handleExportAll, children: copied === "export-all" ? "Đã Xuất" : "Xuất" })
      ] })
    ] })
  ] });
}

export { RepurposePage as default };
