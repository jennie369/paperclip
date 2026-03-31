// ============================================================================
// Anomaly Detector — CTR Drops, Retention Cliffs, Revenue Spikes
// GEM Content Control Center
//
// Phát hiện bất thường trong dữ liệu YouTube:
// - CTR giảm >30% so với trung bình
// - Retention cliff (điểm drop-off đột ngột)
// - Revenue spikes/drops bất thường
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnomalyAlert {
  readonly type: 'ctr_drop' | 'retention_cliff' | 'revenue_spike' | 'revenue_drop';
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly videoId?: string;
  readonly videoTitle?: string;
  readonly metric: string;
  readonly currentValue: number;
  readonly expectedValue: number;
  readonly deviationPercent: number;
  readonly message: string;
  readonly suggestion: string;
  readonly detectedAt: string;
}

interface VideoData {
  readonly youtube_id?: string;
  readonly id?: string;
  readonly title: string;
  readonly ctr?: number;
  readonly views?: number;
  readonly avg_view_duration_sec?: number;
  readonly estimated_revenue?: number;
  readonly estimatedRevenue?: number;
  readonly published_at?: string;
}

interface RetentionPoint {
  readonly timeRatio: number;
  readonly watchRatio: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CTR drop threshold — alert when CTR drops more than 30% below average */
const CTR_DROP_THRESHOLD = 0.30;

/** Retention cliff threshold — alert when watch ratio drops >20% between consecutive points */
const RETENTION_CLIFF_THRESHOLD = 0.20;

/** Revenue anomaly threshold — alert when revenue deviates >50% from average */
const REVENUE_ANOMALY_THRESHOLD = 0.50;

/** Minimum videos needed for meaningful analysis */
const MIN_VIDEOS_FOR_ANALYSIS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}

function nowISO(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Anomaly Detector
// ---------------------------------------------------------------------------

export const anomalyDetector = {
  /**
   * Detect videos with CTR significantly below channel average.
   * Alerts when a video's CTR drops more than 30% below the channel average.
   */
  detectCTRDrop(videos: readonly VideoData[]): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    const ctrs = videos
      .map((v) => v.ctr)
      .filter((ctr): ctr is number => typeof ctr === 'number' && ctr > 0);

    if (ctrs.length < MIN_VIDEOS_FOR_ANALYSIS) return alerts;

    const avgCTR = average(ctrs);
    const threshold = avgCTR * (1 - CTR_DROP_THRESHOLD);

    for (const video of videos) {
      if (typeof video.ctr !== 'number' || video.ctr <= 0) continue;
      if (video.ctr >= threshold) continue;

      const deviationPercent = ((avgCTR - video.ctr) / avgCTR) * 100;
      const severity = deviationPercent > 50 ? 'critical' : deviationPercent > 40 ? 'high' : 'medium';

      alerts.push({
        type: 'ctr_drop',
        severity,
        videoId: video.youtube_id ?? video.id,
        videoTitle: video.title,
        metric: 'CTR',
        currentValue: Math.round(video.ctr * 100) / 100,
        expectedValue: Math.round(avgCTR * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        message: `CTR video "${video.title}" ở mức ${video.ctr.toFixed(1)}%, thấp hơn ${deviationPercent.toFixed(0)}% so với trung bình kênh (${avgCTR.toFixed(1)}%).`,
        suggestion: deviationPercent > 50
          ? 'Thumbnail và tiêu đề cần làm lại hoàn toàn. Thử A/B test với formula mới.'
          : 'Kiểm tra thumbnail contrast và tiêu đề. Thử thay đổi title formula.',
        detectedAt: nowISO(),
      });
    }

    return alerts;
  },

  /**
   * Detect retention cliffs — sudden drop-off points in audience retention.
   * A cliff is a point where watch ratio drops >20% between consecutive points.
   */
  detectRetentionCliff(retentionData: readonly RetentionPoint[], videoId?: string, videoTitle?: string): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    if (retentionData.length < 3) return alerts;

    // Sort by timeRatio ascending
    const sorted = [...retentionData].sort((a, b) => a.timeRatio - b.timeRatio);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (!prev || !curr) continue;

      const drop = prev.watchRatio - curr.watchRatio;
      const dropPercent = prev.watchRatio > 0 ? drop / prev.watchRatio : 0;

      if (dropPercent < RETENTION_CLIFF_THRESHOLD) continue;

      const timePercent = Math.round(curr.timeRatio * 100);
      const severity = dropPercent > 0.40 ? 'critical' : dropPercent > 0.30 ? 'high' : 'medium';

      alerts.push({
        type: 'retention_cliff',
        severity,
        videoId,
        videoTitle,
        metric: 'Audience Retention',
        currentValue: Math.round(curr.watchRatio * 100),
        expectedValue: Math.round(prev.watchRatio * 100),
        deviationPercent: Math.round(dropPercent * 100),
        message: `Drop-off ${Math.round(dropPercent * 100)}% tại ${timePercent}% video${videoTitle ? ` "${videoTitle}"` : ''}. Retention giảm từ ${Math.round(prev.watchRatio * 100)}% xuống ${Math.round(curr.watchRatio * 100)}%.`,
        suggestion: timePercent < 10
          ? 'Hook quá yếu. Mở đầu cần gây tò mò mạnh hơn trong 10 giây đầu.'
          : timePercent < 30
          ? 'Phần mở rộng (context) quá dài. Đi thẳng vào nội dung chính sớm hơn.'
          : 'Nội dung mất hấp dẫn. Thêm pattern-interrupt (câu hỏi tu từ, ví dụ bất ngờ) tại điểm này.',
        detectedAt: nowISO(),
      });
    }

    return alerts;
  },

  /**
   * Detect revenue anomalies — spikes or drops deviating >50% from average.
   */
  detectRevenueAnomaly(videos: readonly VideoData[]): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    const revenues = videos
      .map((v) => v.estimated_revenue ?? v.estimatedRevenue)
      .filter((r): r is number => typeof r === 'number' && r > 0);

    if (revenues.length < MIN_VIDEOS_FOR_ANALYSIS) return alerts;

    const avgRevenue = average(revenues);
    const stdDev = standardDeviation(revenues);
    const upperBound = avgRevenue + avgRevenue * REVENUE_ANOMALY_THRESHOLD;
    const lowerBound = avgRevenue - avgRevenue * REVENUE_ANOMALY_THRESHOLD;

    for (const video of videos) {
      const revenue = video.estimated_revenue ?? video.estimatedRevenue;
      if (typeof revenue !== 'number' || revenue <= 0) continue;

      if (revenue > upperBound) {
        const deviationPercent = ((revenue - avgRevenue) / avgRevenue) * 100;
        alerts.push({
          type: 'revenue_spike',
          severity: deviationPercent > 100 ? 'high' : 'medium',
          videoId: video.youtube_id ?? video.id,
          videoTitle: video.title,
          metric: 'Revenue (USD)',
          currentValue: Math.round(revenue * 100) / 100,
          expectedValue: Math.round(avgRevenue * 100) / 100,
          deviationPercent: Math.round(deviationPercent),
          message: `Revenue video "${video.title}" cao hơn ${Math.round(deviationPercent)}% so với trung bình ($${revenue.toFixed(2)} vs $${avgRevenue.toFixed(2)}).`,
          suggestion: 'Phân tích yếu tố thành công: track, title formula, persona. Nhân rộng pattern này.',
          detectedAt: nowISO(),
        });
      } else if (revenue < lowerBound && stdDev > 0) {
        const deviationPercent = ((avgRevenue - revenue) / avgRevenue) * 100;
        alerts.push({
          type: 'revenue_drop',
          severity: deviationPercent > 80 ? 'high' : 'medium',
          videoId: video.youtube_id ?? video.id,
          videoTitle: video.title,
          metric: 'Revenue (USD)',
          currentValue: Math.round(revenue * 100) / 100,
          expectedValue: Math.round(avgRevenue * 100) / 100,
          deviationPercent: Math.round(deviationPercent),
          message: `Revenue video "${video.title}" thấp hơn ${Math.round(deviationPercent)}% so với trung bình ($${revenue.toFixed(2)} vs $${avgRevenue.toFixed(2)}).`,
          suggestion: 'Kiểm tra content type và track. Revenue thấp thường do audience không khớp với advertiser.',
          detectedAt: nowISO(),
        });
      }
    }

    return alerts;
  },

  /**
   * Run all anomaly detection checks and return combined alerts.
   */
  detectAll(
    videos: readonly VideoData[],
    retentionData?: { videoId: string; videoTitle: string; data: readonly RetentionPoint[] }[],
  ): { anomalies: AnomalyAlert[] } {
    const anomalies: AnomalyAlert[] = [
      ...this.detectCTRDrop(videos),
      ...this.detectRevenueAnomaly(videos),
    ];

    if (retentionData) {
      for (const { videoId, videoTitle, data } of retentionData) {
        anomalies.push(...this.detectRetentionCliff(data, videoId, videoTitle));
      }
    }

    // Sort by severity: critical first
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    return { anomalies };
  },
};
