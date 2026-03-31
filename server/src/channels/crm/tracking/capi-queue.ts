// CAPI Event Queue — batch-queue events for Facebook Conversions API
// Events are stored in crm_tracking_events, then processed by a cron/worker

import { supabase } from '../../zalo-personal/supabase.js';

interface CAPIQueueEvent {
  event_name: string;
  customer_id?: string;
  payload: Record<string, any>;
}

/**
 * Queue a CAPI event for later processing.
 * Inserts into crm_tracking_events with sent_to_capi = false.
 * A background worker/cron picks up unsent events and sends via FacebookCAPI.
 */
export async function queueCAPIEvent(event: CAPIQueueEvent): Promise<void> {
  try {
    const { error } = await supabase.from('crm_tracking_events').insert({
      event_name: event.event_name,
      customer_id: event.customer_id || null,
      payload: event.payload,
      sent_to_capi: false,
    });
    if (error) {
      console.warn(`[CAPI Queue] Insert failed: ${error.message}`);
    }
  } catch (err: any) {
    // Non-blocking — CAPI queue failure should never break CRM operations
    console.warn(`[CAPI Queue] Error: ${err.message}`);
  }
}
