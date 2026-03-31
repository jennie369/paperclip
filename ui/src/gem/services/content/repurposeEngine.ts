// ============================================================================
// Repurpose Engine — 1 Script → Multi-platform Content
// GEM Content Control Center
// ============================================================================

import { claudeService } from '../api/claudeService';
import { buildSystemPrompt } from './brandVoicePrompt';
import { brandVoiceChecker } from './brandVoiceChecker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RepurposeTarget =
  | 'facebook_posts'
  | 'email_sequence'
  | 'short_clips'
  | 'landing_page'
  | 'community_questions';

export interface RepurposeParams {
  scriptId: string;
  scriptTitle: string;
  scriptBody: string;
  contentType: string;
  track: string;
  persona: string;
  targets: RepurposeTarget[];
  onProgress?: (target: RepurposeTarget, status: 'generating' | 'done' | 'error') => void;
}

export interface FacebookPost {
  angle: string;
  content: string;
  hashtags: string[];
  charCount: number;
  platform: 'facebook';
}

export interface EmailSequence {
  type: 'nurture' | 'value' | 'cta';
  subject: string;
  preheader: string;
  body: string;
  timing: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface ShortClip {
  title: string;
  hook: string;
  body: string;
  cta: string;
  wordCount: number;
  estimatedDuration: number;
  timestampHint: string;
}

export interface LandingPageCopy {
  headline: string;
  subheadline: string;
  painPoints: string[];
  benefits: string[];
  testimonialPrompt: string;
  ctaText: string;
  ctaSubtext: string;
  urgencyLine: string;
}

export interface CommunityQuestion {
  question: string;
  context: string;
  engagementHook: string;
  expectedResponses: string[];
}

export interface RepurposeResult {
  scriptId: string;
  scriptTitle: string;
  facebookPosts?: FacebookPost[];
  emails?: EmailSequence[];
  clips?: ShortClip[];
  landingPage?: LandingPageCopy;
  questions?: CommunityQuestion[];
  totalItems: number;
  completedTargets: RepurposeTarget[];
  failedTargets: RepurposeTarget[];
  brandVoiceScore?: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

function buildFacebookPrompt(scriptTitle: string, scriptBody: string, track: string): string {
  return `Bạn là chuyên gia content marketing cho kênh "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube dưới đây, tạo 5 bài Facebook Posts với 5 góc tiếp cận khác nhau.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3000)}
---

## Yêu cầu:
- Mỗi bài từ 150-300 từ
- Tiếng Việt thuần túy, không dùng từ tiếng Anh
- 5 góc tiếp cận: (1) Câu hỏi gây tò mò, (2) Chia sẻ insight, (3) Câu chuyện cá nhân, (4) Data/số liệu, (5) Truyền cảm hứng
- Mỗi bài có 3-5 hashtags phù hợp
- Không dùng bullet points, viết văn xuôi
- CTA nhẹ nhàng: "Xem full video trên kênh YouTube" hoặc tương tự
- Không nhắc giá sản phẩm

Trả về JSON array:
[{"angle":"...", "content":"...", "hashtags":["..."]}]`;
}

function buildEmailPrompt(scriptTitle: string, scriptBody: string, track: string): string {
  return `Bạn là chuyên gia email marketing cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 3 email sequence: nurture → value → CTA.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3000)}
---

## 3 Email:
1. **Nurture** (Ngày 1): Chia sẻ 1 insight từ video, tạo connection, không bán hàng
2. **Value** (Ngày 3): Deep dive vào 1 concept, cung cấp giá trị thực, gợi mở
3. **CTA** (Ngày 7): Kết nối pain point → solution, CTA khóa học/app

## Yêu cầu:
- Subject line hấp dẫn (< 60 ký tự)
- Preheader text (< 90 ký tự)
- Tiếng Việt thuần túy
- Văn phong thân mật, gần gũi
- Mỗi email 200-400 từ

Trả về JSON array:
[{"type":"nurture|value|cta", "subject":"...", "preheader":"...", "body":"...", "timing":"Ngày X", "ctaText":"...", "ctaUrl":"..."}]`;
}

function buildClipsPrompt(scriptTitle: string, scriptBody: string): string {
  return `Bạn là chuyên gia short-form content cho "Jennie Uyen Chu".

Từ kịch bản YouTube dài, trích xuất 4 đoạn ngắn phù hợp TikTok/Reels/Shorts (30-60 giây mỗi clip).

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
---
${scriptBody.slice(0, 4000)}
---

## Yêu cầu mỗi clip:
- Hook mạnh (câu đầu gây chú ý)
- Nội dung 80-150 từ (30-60 giây)
- CTA ngắn: "Follow để xem thêm" / "Link ở bio"
- Gợi ý vị trí trong kịch bản gốc (timestamp hint)
- Chọn 4 khoảnh khắc hay nhất: insight sâu, moment gây bất ngờ, data thú vị, câu quote đáng nhớ

Trả về JSON array:
[{"title":"...", "hook":"...", "body":"...", "cta":"...", "wordCount":120, "estimatedDuration":45, "timestampHint":"Phần 3 - khoảng phút 12"}]`;
}

function buildLandingPrompt(scriptTitle: string, scriptBody: string, track: string): string {
  return `Bạn là copywriter cho landing page "Jennie Uyen Chu".

Từ kịch bản YouTube, tạo copy cho 1 landing page quảng bá khóa học/sản phẩm liên quan.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3000)}
---

## Cấu trúc landing page:
- Headline: 1 câu mạnh, gây tò mò (< 15 từ)
- Subheadline: Giải thích benefit chính (< 25 từ)
- 3-4 Pain Points mà đối tượng gặp phải
- 4-5 Benefits của giải pháp
- Gợi ý testimonial prompt
- CTA button text + subtext
- Urgency line (khan hiếm, thời gian)

## Yêu cầu:
- Tiếng Việt thuần túy
- Không nói giá cụ thể
- Tập trung transformation, không feature
- Kết nối tần số & nghiệp lực (USP Jennie)

Trả về JSON:
{"headline":"...", "subheadline":"...", "painPoints":["..."], "benefits":["..."], "testimonialPrompt":"...", "ctaText":"...", "ctaSubtext":"...", "urgencyLine":"..."}`;
}

function buildQuestionsPrompt(scriptTitle: string, scriptBody: string): string {
  return `Bạn là community manager cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 2 câu hỏi cho community (Facebook Group, YouTube Community tab).

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
---
${scriptBody.slice(0, 2000)}
---

## Yêu cầu:
- Câu hỏi mở, khuyến khích chia sẻ trải nghiệm
- Gợi ý 2-3 câu trả lời mẫu (để kích hoạt thảo luận)
- Có engagement hook (poll, emoji vote, tag bạn bè)
- Kết nối với nội dung video

Trả về JSON array:
[{"question":"...", "context":"...", "engagementHook":"...", "expectedResponses":["..."]}]`;
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Repurpose Engine
// ---------------------------------------------------------------------------

export const repurposeEngine = {
  async repurpose(params: RepurposeParams): Promise<RepurposeResult> {
    const {
      scriptId,
      scriptTitle,
      scriptBody,
      track,
      targets,
      onProgress,
    } = params;

    const result: RepurposeResult = {
      scriptId,
      scriptTitle,
      totalItems: 0,
      completedTargets: [],
      failedTargets: [],
      createdAt: new Date().toISOString(),
    };

    const systemPrompt = buildSystemPrompt({
      contentType: 'latc',
      track: track as 'wealth' | 'wellness' | 'integration',
      persona: 'jennie_educator',
      writingMode: 'mode_1_calm',
      pillar: 'lifestyle',
    });

    for (const target of targets) {
      onProgress?.(target, 'generating');

      try {
        switch (target) {
          case 'facebook_posts': {
            const prompt = buildFacebookPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 4096,
              temperature: 0.8,
            });
            const posts = safeParseJSON<FacebookPost[]>(response.content, []);
            result.facebookPosts = posts.map((p) => ({
              ...p,
              charCount: p.content?.length ?? 0,
              platform: 'facebook' as const,
            }));
            result.totalItems += result.facebookPosts.length;
            break;
          }

          case 'email_sequence': {
            const prompt = buildEmailPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 4096,
              temperature: 0.7,
            });
            result.emails = safeParseJSON<EmailSequence[]>(response.content, []);
            result.totalItems += result.emails.length;
            break;
          }

          case 'short_clips': {
            const prompt = buildClipsPrompt(scriptTitle, scriptBody);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 3072,
              temperature: 0.7,
            });
            result.clips = safeParseJSON<ShortClip[]>(response.content, []);
            result.totalItems += result.clips.length;
            break;
          }

          case 'landing_page': {
            const prompt = buildLandingPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 2048,
              temperature: 0.7,
            });
            result.landingPage = safeParseJSON<LandingPageCopy>(response.content, {
              headline: '',
              subheadline: '',
              painPoints: [],
              benefits: [],
              testimonialPrompt: '',
              ctaText: '',
              ctaSubtext: '',
              urgencyLine: '',
            });
            result.totalItems += 1;
            break;
          }

          case 'community_questions': {
            const prompt = buildQuestionsPrompt(scriptTitle, scriptBody);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 2048,
              temperature: 0.8,
            });
            result.questions = safeParseJSON<CommunityQuestion[]>(response.content, []);
            result.totalItems += result.questions.length;
            break;
          }
        }

        result.completedTargets.push(target);
        onProgress?.(target, 'done');
      } catch {
        result.failedTargets.push(target);
        onProgress?.(target, 'error');
      }
    }

    // Run brand voice check on all generated text
    const allText = [
      ...(result.facebookPosts?.map((p) => p.content) ?? []),
      ...(result.emails?.map((e) => e.body) ?? []),
      ...(result.clips?.map((c) => `${c.hook} ${c.body}`) ?? []),
      result.landingPage ? `${result.landingPage.headline} ${result.landingPage.subheadline}` : '',
      ...(result.questions?.map((q) => q.question) ?? []),
    ].filter(Boolean).join('\n\n');

    if (allText) {
      const checkResult = brandVoiceChecker.check(allText, 'latc');
      result.brandVoiceScore = checkResult.score;
    }

    return result;
  },

  getTargetLabel(target: RepurposeTarget): string {
    const labels: Record<RepurposeTarget, string> = {
      facebook_posts: '5 Facebook Posts',
      email_sequence: '3 Email Sequences',
      short_clips: '4 Short Clips',
      landing_page: '1 Landing Page',
      community_questions: '2 Community Questions',
    };
    return labels[target];
  },

  getTargetDescription(target: RepurposeTarget): string {
    const descriptions: Record<RepurposeTarget, string> = {
      facebook_posts: '5 góc tiếp cận khác nhau từ kịch bản gốc',
      email_sequence: 'Chuỗi email: nurture → value → CTA (Ngày 1, 3, 7)',
      short_clips: '4 khoảnh khắc hay nhất, 30-60 giây mỗi clip',
      landing_page: 'Copy landing page với headline, benefits, CTA',
      community_questions: '2 câu hỏi cho Facebook Group/YouTube Community',
    };
    return descriptions[target];
  },

  getAllTargets(): RepurposeTarget[] {
    return ['facebook_posts', 'email_sequence', 'short_clips', 'landing_page', 'community_questions'];
  },
};
