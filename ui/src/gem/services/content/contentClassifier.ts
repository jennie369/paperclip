// @ts-nocheck
// ============================================================================
// Content Classifier — Keyword-based Content Classification
// GEM Content Control Center
//
// Phân loại nội dung dựa trên keywords:
// - contentType: latc | tmt | short_clip
// - track: wealth | wellness | integration
// - persona: 7 Jennie personas
// - Confidence score (0-1)
// ============================================================================

import type { ContentType, Track, PersonaType } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  readonly contentType: ContentType;
  readonly track: Track;
  readonly persona: PersonaType;
  readonly confidence: number;
}

interface KeywordMap {
  readonly keywords: readonly string[];
  readonly weight: number;
}

// ---------------------------------------------------------------------------
// Keyword maps per track
// ---------------------------------------------------------------------------

const TRACK_KEYWORDS: Record<Track, KeywordMap> = {
  wealth: {
    keywords: [
      'bitcoin', 'crypto', 'trading', 'đầu tư', 'tài chính', 'tiền',
      'giao dịch', 'portfolio', 'lợi nhuận', 'cắt lỗ', 'chốt lời',
      'chart', 'xu hướng', 'altcoin', 'blockchain', 'defi', 'nft',
      'thị trường', 'vốn', 'cổ phiếu', 'bất động sản', 'thu nhập',
      'scanner', 'whale', 'token', 'leverage', 'margin',
    ],
    weight: 1.0,
  },
  wellness: {
    keywords: [
      'thiền', 'tần số', 'năng lượng', 'tâm thức', 'chữa lành',
      'nghiệp', 'rung động', 'giác ngộ', 'tâm linh', 'thức tỉnh',
      'meditation', 'healing', 'karma', 'phật', 'tu tập', 'từ bi',
      'bình an', 'chánh niệm', 'trí tuệ', 'giải thoát', 'luân hồi',
      'tarot', 'tình yêu', 'sức khỏe tinh thần',
    ],
    weight: 1.0,
  },
  integration: {
    keywords: [
      'cuộc sống', 'hành trình', 'cân bằng', 'phát triển bản thân',
      'kết hợp', 'tích hợp', 'tổng thể', 'mindful trading',
      'tài chính tâm thức', 'giàu có thật sự', 'tự do tài chính',
      'mục đích sống', 'ý nghĩa', 'hạnh phúc', 'thành công',
      'sứ mệnh', 'legacy', 'cộng đồng', 'cho đi', 'tri ân',
    ],
    weight: 1.2, // Slightly higher weight for integration (40% target)
  },
};

// ---------------------------------------------------------------------------
// Keyword maps per content type
// ---------------------------------------------------------------------------

const CONTENT_TYPE_KEYWORDS: Record<ContentType, KeywordMap> = {
  latc: {
    keywords: [
      'sự thật', 'bí mật', 'không ai nói', 'trường học',
      'quy tắc', 'chiến lược', 'framework', 'hệ thống',
      'phân tích sâu', 'deep dive', 'toàn diện',
    ],
    weight: 1.0,
  },
  tmt: {
    keywords: [
      'thầy minh tuệ', 'sư', 'tu sĩ', 'tu hành', 'khất sĩ',
      'nhân quả', 'đề bà', 'phật pháp', 'tăng đoàn', 'giới luật',
      'bộ hành', 'đầu trần chân đất',
    ],
    weight: 1.5,
  },
  short_clip: {
    keywords: [
      'nhanh', 'ngắn', '30 giây', '1 phút', 'tip', 'hack',
      'câu hỏi nhanh', 'reels', 'shorts', 'tiktok',
    ],
    weight: 1.0,
  },
  social_post: {
    keywords: [
      'post', 'bài đăng', 'facebook', 'instagram', 'threads',
      'caption', 'hashtag', 'mạng xã hội', 'social',
    ],
    weight: 1.0,
  },
  news: {
    keywords: [
      'tin tức', 'news', 'blog', 'bài viết', 'phân tích',
      'thị trường', 'SEO', 'báo chí', 'chuyên đề',
    ],
    weight: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Keyword maps per persona
// ---------------------------------------------------------------------------

const PERSONA_KEYWORDS: Record<PersonaType, KeywordMap> = {
  jennie_mentor: {
    keywords: ['hướng dẫn', 'dẫn dắt', 'chia sẻ', 'kinh nghiệm', 'bài học', 'con đường'],
    weight: 1.0,
  },
  jennie_provocateur: {
    keywords: ['sai lầm', 'thách thức', 'phá vỡ', 'khó nghe', 'sự thật phũ', 'dám', 'brutal'],
    weight: 1.2,
  },
  jennie_storyteller: {
    keywords: ['câu chuyện', 'kể', 'ngày xưa', 'hành trình', 'trải nghiệm', 'cảm xúc'],
    weight: 1.0,
  },
  jennie_analyst: {
    keywords: ['số liệu', 'phân tích', 'dữ liệu', 'thống kê', 'biểu đồ', 'evidence', 'research'],
    weight: 1.0,
  },
  jennie_motivator: {
    keywords: ['bạn có thể', 'hành động', 'bắt đầu ngay', 'thay đổi', 'động lực', 'năng lượng'],
    weight: 1.0,
  },
  jennie_educator: {
    keywords: ['giải thích', 'bước', 'hướng dẫn', 'framework', 'hệ thống', 'cách làm'],
    weight: 1.0,
  },
  jennie_confidante: {
    keywords: ['tâm sự', 'thấu hiểu', 'nỗi đau', 'cô đơn', 'ôm', 'bình yên', 'lắng nghe'],
    weight: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function scoreText<T extends string>(
  text: string,
  keywordMap: Record<T, KeywordMap>,
): { winner: T; scores: Record<T, number> } {
  const lowerText = text.toLowerCase();
  const scores = {} as Record<T, number>;
  let maxScore = -1;
  let winner: T | undefined;

  for (const key of Object.keys(keywordMap) as T[]) {
    const config = keywordMap[key];
    let score = 0;

    for (const keyword of config.keywords) {
      // Count occurrences (case-insensitive)
      const regex = new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * config.weight;
      }
    }

    scores[key] = score;

    if (score > maxScore) {
      maxScore = score;
      winner = key;
    }
  }

  // Fallback to first key if nothing matches
  if (winner === undefined) {
    winner = (Object.keys(keywordMap) as T[])[0]!;
  }

  return { winner, scores };
}

function calculateConfidence(scores: Record<string, number>): number {
  const values = Object.values(scores);
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;

  const max = Math.max(...values);
  const confidence = max / total;

  // Scale to 0-1 range — a single-track match gives ~1.0,
  // evenly split gives ~0.33
  return Math.min(1, Math.max(0, confidence));
}

// ---------------------------------------------------------------------------
// Content Classifier
// ---------------------------------------------------------------------------

export const contentClassifier = {
  /**
   * Classify text content by type, track, and persona.
   *
   * @example
   * ```ts
   * const result = contentClassifier.classifyContent(
   *   'Bitcoin vừa breakout lên $100K. 5 sai lầm trader mới mắc phải khi FOMO.'
   * );
   * // { contentType: 'latc', track: 'wealth', persona: 'jennie_provocateur', confidence: 0.72 }
   * ```
   */
  classifyContent(text: string): ClassificationResult {
    if (!text || text.trim().length === 0) {
      return {
        contentType: 'latc',
        track: 'integration',
        persona: 'jennie_mentor',
        confidence: 0,
      };
    }

    const typeResult = scoreText(text, CONTENT_TYPE_KEYWORDS);
    const trackResult = scoreText(text, TRACK_KEYWORDS);
    const personaResult = scoreText(text, PERSONA_KEYWORDS);

    // Average confidence across all three dimensions
    const confidences = [
      calculateConfidence(typeResult.scores),
      calculateConfidence(trackResult.scores),
      calculateConfidence(personaResult.scores),
    ];
    const avgConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;

    return {
      contentType: typeResult.winner,
      track: trackResult.winner,
      persona: personaResult.winner,
      confidence: Math.round(avgConfidence * 100) / 100,
    };
  },

  /**
   * Classify with detailed scores for each dimension.
   */
  classifyDetailed(text: string): {
    result: ClassificationResult;
    typeScores: Record<ContentType, number>;
    trackScores: Record<Track, number>;
    personaScores: Record<PersonaType, number>;
  } {
    const typeResult = scoreText(text, CONTENT_TYPE_KEYWORDS);
    const trackResult = scoreText(text, TRACK_KEYWORDS);
    const personaResult = scoreText(text, PERSONA_KEYWORDS);

    const confidences = [
      calculateConfidence(typeResult.scores),
      calculateConfidence(trackResult.scores),
      calculateConfidence(personaResult.scores),
    ];
    const avgConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;

    return {
      result: {
        contentType: typeResult.winner,
        track: trackResult.winner,
        persona: personaResult.winner,
        confidence: Math.round(avgConfidence * 100) / 100,
      },
      typeScores: typeResult.scores,
      trackScores: trackResult.scores,
      personaScores: personaResult.scores,
    };
  },
};
