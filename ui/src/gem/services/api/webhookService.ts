// ============================================================================
// Webhook Service — Thông báo qua kênh bên ngoài
// GEM Content Control Center
//
// Gửi thông báo sự kiện đến Slack và Telegram.
// Cấu hình webhook URL theo loại sự kiện.
// Hỗ trợ: generation_complete, review_needed, analytics_ready.
// ============================================================================

import { getSupabase } from './supabase';
import type { ServiceResponse } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Loại sự kiện có thể gửi webhook */
export type WebhookEventType =
  | 'generation_complete'
  | 'review_needed'
  | 'analytics_ready'
  | 'job_failed'
  | 'daily_cleanup'
  | 'content_published';

/** Loại kênh webhook */
export type WebhookChannel = 'slack' | 'telegram';

/** Cấu hình webhook */
export interface WebhookConfig {
  readonly id?: string;
  readonly channel: WebhookChannel;
  readonly url: string;
  readonly events: WebhookEventType[];
  readonly isActive: boolean;
  readonly metadata?: Record<string, unknown>;
}

/** Dữ liệu gửi kèm webhook */
export interface WebhookPayload {
  readonly event: WebhookEventType;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
}

/** Kết quả gửi webhook */
export interface WebhookSendResult {
  readonly channel: WebhookChannel;
  readonly success: boolean;
  readonly statusCode?: number;
  readonly errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Nhãn tiếng Việt cho sự kiện
// ---------------------------------------------------------------------------

const EVENT_LABELS: Readonly<Record<WebhookEventType, string>> = {
  generation_complete: 'Tạo nội dung hoàn thành',
  review_needed: 'Cần duyệt nội dung',
  analytics_ready: 'Báo cáo phân tích sẵn sàng',
  job_failed: 'Công việc thất bại',
  daily_cleanup: 'Dọn dẹp hệ thống hàng ngày',
  content_published: 'Nội dung đã xuất bản',
};

// ---------------------------------------------------------------------------
// Slack formatter
// ---------------------------------------------------------------------------

function formatSlackMessage(payload: WebhookPayload): Record<string, unknown> {
  const eventLabel = EVENT_LABELS[payload.event] ?? payload.event;

  return {
    text: `[GEM Content Center] ${eventLabel}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📌 ${eventLabel}`,
        },
      },
      {
        type: 'section',
        fields: Object.entries(payload.data).slice(0, 10).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:*\n${String(value)}`,
        })),
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `GEM Content Control Center | ${new Date(payload.timestamp).toLocaleString('vi-VN')}`,
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Telegram formatter
// ---------------------------------------------------------------------------

function formatTelegramMessage(payload: WebhookPayload): string {
  const eventLabel = EVENT_LABELS[payload.event] ?? payload.event;

  const dataLines = Object.entries(payload.data)
    .slice(0, 10)
    .map(([key, value]) => `• <b>${key}:</b> ${String(value)}`)
    .join('\n');

  return [
    `<b>📌 ${eventLabel}</b>`,
    '',
    dataLines,
    '',
    `<i>GEM Content Center — ${new Date(payload.timestamp).toLocaleString('vi-VN')}</i>`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const webhookService = {
  /**
   * Gửi thông báo đến Slack qua Incoming Webhook.
   */
  async sendToSlack(
    webhookUrl: string,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<WebhookSendResult> {
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const slackBody = formatSlackMessage(payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackBody),
      });

      return {
        channel: 'slack',
        success: response.ok,
        statusCode: response.status,
        errorMessage: response.ok ? undefined : `Slack trả về HTTP ${response.status}.`,
      };
    } catch (err) {
      return {
        channel: 'slack',
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Lỗi gửi Slack webhook.',
      };
    }
  },

  /**
   * Gửi thông báo đến Telegram qua Bot API.
   *
   * URL format: https://api.telegram.org/bot{TOKEN}/sendMessage
   * Tham số data cần có `chatId` hoặc sử dụng chatId trong webhookUrl.
   */
  async sendToTelegram(
    botToken: string,
    chatId: string,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<WebhookSendResult> {
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const text = formatTelegramMessage(payload);

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );

      const result = await response.json();
      const telegramOk = (result as Record<string, unknown>)?.ok === true;

      return {
        channel: 'telegram',
        success: telegramOk,
        statusCode: response.status,
        errorMessage: telegramOk
          ? undefined
          : `Telegram API lỗi: ${(result as Record<string, unknown>)?.description ?? 'Không rõ.'}`,
      };
    } catch (err) {
      return {
        channel: 'telegram',
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Lỗi gửi Telegram webhook.',
      };
    }
  },

  /**
   * Lưu cấu hình webhook vào Supabase.
   *
   * Cấu hình được lưu trong metadata của profiles hoặc
   * bảng riêng tuỳ theo thiết kế.
   * Hiện tại lưu vào localStorage cho client-side.
   */
  async configure(
    userId: string,
    config: WebhookConfig,
  ): Promise<ServiceResponse<WebhookConfig>> {
    try {
      const supabase = getSupabase();

      // Lưu cấu hình webhook vào metadata của profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      const preferences = (profile as Record<string, unknown> | null)?.preferences as Record<string, unknown> ?? {};
      const webhooks = (preferences.webhooks as WebhookConfig[]) ?? [];

      // Tìm và cập nhật hoặc thêm mới
      const existingIndex = webhooks.findIndex(
        (w) => w.channel === config.channel,
      );

      if (existingIndex >= 0) {
        webhooks[existingIndex] = config;
      } else {
        webhooks.push(config);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: { ...preferences, webhooks } as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: config, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lưu cấu hình webhook.';
      return { data: null, error: message, success: false };
    }
  },

  /**
   * Lấy danh sách cấu hình webhook của người dùng.
   */
  async getConfigs(userId: string): Promise<ServiceResponse<WebhookConfig[]>> {
    try {
      const supabase = getSupabase();

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const preferences = (profile as Record<string, unknown> | null)?.preferences as Record<string, unknown> ?? {};
      const webhooks = (preferences.webhooks as WebhookConfig[]) ?? [];

      return { data: webhooks, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi tải cấu hình webhook.';
      return { data: null, error: message, success: false };
    }
  },

  /**
   * Phát sự kiện đến tất cả webhook đã cấu hình.
   *
   * Tự động gửi đến các kênh đã đăng ký nhận sự kiện này.
   */
  async dispatch(
    userId: string,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<WebhookSendResult[]> {
    const { data: configs } = await this.getConfigs(userId);
    if (!configs || configs.length === 0) {
      return [];
    }

    const results: WebhookSendResult[] = [];

    for (const config of configs) {
      if (!config.isActive || !config.events.includes(event)) {
        continue;
      }

      if (config.channel === 'slack') {
        const result = await this.sendToSlack(config.url, event, data);
        results.push(result);
      } else if (config.channel === 'telegram') {
        const meta = config.metadata ?? {};
        const chatId = meta.chatId as string ?? '';
        const result = await this.sendToTelegram(config.url, chatId, event, data);
        results.push(result);
      }
    }

    return results;
  },

  /**
   * Lấy nhãn tiếng Việt cho loại sự kiện.
   */
  getEventLabel(event: WebhookEventType): string {
    return EVENT_LABELS[event] ?? event;
  },
};
