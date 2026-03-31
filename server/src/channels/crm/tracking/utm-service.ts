// UTM Tracking Service
// Parse, build, and track UTM parameters for attribution

import { supabase } from '../../zalo-personal/supabase.js';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export class UTMService {

  parseUTM(url: string): UTMParams {
    try {
      const u = new URL(url);
      return {
        utm_source: u.searchParams.get('utm_source') || undefined,
        utm_medium: u.searchParams.get('utm_medium') || undefined,
        utm_campaign: u.searchParams.get('utm_campaign') || undefined,
        utm_content: u.searchParams.get('utm_content') || undefined,
        utm_term: u.searchParams.get('utm_term') || undefined,
      };
    } catch {
      return {};
    }
  }

  buildUTMLink(baseUrl: string, params: UTMParams): string {
    const url = new URL(baseUrl);
    if (params.utm_source) url.searchParams.set('utm_source', params.utm_source);
    if (params.utm_medium) url.searchParams.set('utm_medium', params.utm_medium);
    if (params.utm_campaign) url.searchParams.set('utm_campaign', params.utm_campaign);
    if (params.utm_content) url.searchParams.set('utm_content', params.utm_content);
    if (params.utm_term) url.searchParams.set('utm_term', params.utm_term);
    return url.toString();
  }

  async trackVisit(params: {
    customerId?: string;
    sessionId?: string;
    utm: UTMParams;
    pageUrl: string;
    referrer?: string;
  }): Promise<void> {
    try {
      await supabase.from('crm_interactions').insert({
        customer_id: params.customerId,
        interaction_type: 'page_visit',
        channel: 'web',
        metadata: {
          ...params.utm,
          page_url: params.pageUrl,
          referrer: params.referrer,
          session_id: params.sessionId,
        },
      });
    } catch (err: any) {
      console.warn('[UTM] Track visit error:', err.message);
    }
  }

  async getAttribution(customerId: string): Promise<UTMParams | null> {
    try {
      const { data } = await supabase
        .from('crm_interactions')
        .select('metadata')
        .eq('customer_id', customerId)
        .eq('interaction_type', 'page_visit')
        .not('metadata->utm_source', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data?.metadata) return null;
      const meta = data.metadata as Record<string, any>;
      return {
        utm_source: meta.utm_source,
        utm_medium: meta.utm_medium,
        utm_campaign: meta.utm_campaign,
      };
    } catch {
      return null;
    }
  }
}

export const utmService = new UTMService();
