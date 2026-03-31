// Facebook Conversions API (CAPI) Service
// Sends server-side events to Facebook for attribution & optimization

import crypto from 'crypto';

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || '';
const FB_ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN || '';
const FB_API_VERSION = 'v19.0';

interface CAPIEvent {
  event_name: string;
  event_time: number;
  user_data: {
    em?: string[];  // SHA256 hashed email
    ph?: string[];  // SHA256 hashed phone
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, any>;
  event_source_url?: string;
  action_source: 'website' | 'app' | 'chat' | 'other';
  event_id?: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export class FacebookCAPI {

  async sendEvent(event: CAPIEvent): Promise<{ success: boolean; error?: string }> {
    if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
      console.warn('[CAPI] Missing FB_PIXEL_ID or FB_CAPI_ACCESS_TOKEN');
      return { success: false, error: 'Missing config' };
    }

    try {
      const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [event],
          access_token: FB_ACCESS_TOKEN,
        }),
      });

      const data = await res.json();
      if (data.events_received) {
        console.log(`[CAPI] Event ${event.event_name} sent OK (${data.events_received} received)`);
        return { success: true };
      }
      return { success: false, error: JSON.stringify(data) };
    } catch (err: any) {
      console.error('[CAPI] Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trackPurchase(params: {
    email?: string;
    phone?: string;
    customerId?: string;
    orderId: string;
    value: number;
    currency?: string;
    contents?: Array<{ id: string; quantity: number; item_price: number }>;
  }): Promise<{ success: boolean; error?: string }> {
    const userData: CAPIEvent['user_data'] = {};
    if (params.email) userData.em = [sha256(params.email)];
    if (params.phone) userData.ph = [sha256(params.phone.replace(/[^0-9]/g, ''))];
    if (params.customerId) userData.external_id = [sha256(params.customerId)];

    return this.sendEvent({
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      user_data: userData,
      custom_data: {
        value: params.value,
        currency: params.currency || 'VND',
        order_id: params.orderId,
        contents: params.contents,
        content_type: 'product',
      },
      action_source: 'website',
      event_id: `purchase_${params.orderId}`,
    });
  }

  async trackLead(params: {
    email?: string;
    phone?: string;
    customerId?: string;
    source?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const userData: CAPIEvent['user_data'] = {};
    if (params.email) userData.em = [sha256(params.email)];
    if (params.phone) userData.ph = [sha256(params.phone.replace(/[^0-9]/g, ''))];
    if (params.customerId) userData.external_id = [sha256(params.customerId)];

    return this.sendEvent({
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      user_data: userData,
      custom_data: { source: params.source || 'chat' },
      action_source: 'chat',
      event_id: `lead_${params.customerId || Date.now()}`,
    });
  }

  async trackViewContent(params: {
    email?: string;
    customerId?: string;
    contentName: string;
    contentCategory?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const userData: CAPIEvent['user_data'] = {};
    if (params.email) userData.em = [sha256(params.email)];
    if (params.customerId) userData.external_id = [sha256(params.customerId)];

    return this.sendEvent({
      event_name: 'ViewContent',
      event_time: Math.floor(Date.now() / 1000),
      user_data: userData,
      custom_data: {
        content_name: params.contentName,
        content_category: params.contentCategory,
      },
      action_source: 'website',
    });
  }
}

export const facebookCAPI = new FacebookCAPI();
