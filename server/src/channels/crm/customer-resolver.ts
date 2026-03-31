// CRM Customer Resolver — resolve or create CRM customer from channel message

import { supabase } from '../zalo-personal/supabase.js';
import { matchGemralUser, enrichWithGemralData } from './gemral-bridge.js';

export class CustomerResolver {

  /**
   * Find or create a CRM customer from an inbound channel message.
   * Uses primary_external_id (unique indexed) to prevent race-condition duplicates.
   * Returns customerId + whether the customer was newly created.
   */
  async resolve(
    senderId: string,
    senderName: string,
    channelType: string,
    channelName: string,
    saveContact: boolean = true,
  ): Promise<{ customerId: string; isNew: boolean } | null> {

    // BUG 3 FIX: If channel has save_contacts_to_crm = false, skip CRM entirely
    if (!saveContact) return null;

    // 1. Fast lookup by primary_external_id (unique indexed — no race condition)
    const { data: existing } = await supabase
      .from('crm_customers')
      .select('id')
      .eq('primary_external_id', senderId)
      .maybeSingle();

    if (existing) {
      // Update last_contact_at + increment message count
      await supabase.from('crm_customers')
        .update({
          last_contact_at: new Date().toISOString(),
          total_messages_received: (await this.getMessageCount(existing.id)) + 1,
        })
        .eq('id', existing.id);

      // Auto-match Gemral if not linked yet (async, non-blocking)
      this.tryAutoMatchGemral(existing.id).catch(() => {});

      return { customerId: existing.id, isNew: false };
    }

    // 2. Create new customer with primary_external_id (unique constraint prevents dupes)
    const { data: created, error } = await supabase
      .from('crm_customers')
      .insert({
        display_name: senderName || 'Khách hàng mới',
        primary_external_id: senderId,
        channels: [{
          channel_type: channelType,
          channel_name: channelName,
          external_id: senderId,
          display_name: senderName,
          linked_at: new Date().toISOString(),
        }],
        status: 'lead_moi',
        first_contact_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString(),
        total_messages_received: 1,
      })
      .select('id')
      .single();

    if (error) {
      // Unique constraint violation = race condition — another request created it first
      if (error.code === '23505') {
        const { data: raced } = await supabase
          .from('crm_customers')
          .select('id')
          .eq('primary_external_id', senderId)
          .single();
        if (raced) return { customerId: raced.id, isNew: false };
      }
      console.error('[CustomerResolver] Lỗi tạo khách:', error.message);
      throw error;
    }

    // 3. Create first interaction record
    await supabase.from('crm_interactions').insert({
      customer_id: created.id,
      interaction_type: 'chat',
      channel_type: channelType,
      channel_name: channelName,
      title: 'Liên hệ đầu tiên',
      content: `Khách nhắn tin lần đầu qua ${channelType}`,
    });

    console.log(`[CustomerResolver] Khách mới: ${senderName} (${channelType}) → ${created.id}`);

    // 4. Try auto-match Gemral (async, non-blocking)
    this.tryAutoMatchGemral(created.id).catch(() => {});

    return { customerId: created.id, isNew: true };
  }

  /**
   * Auto-match Gemral account for a CRM customer.
   * Called on new customers and on existing customers without gemral_user_id (re-sync hourly).
   */
  async tryAutoMatchGemral(customerId: string): Promise<void> {
    try {
      const { data: cust } = await supabase
        .from('crm_customers')
        .select('gemral_user_id, gemral_data, phone, email')
        .eq('id', customerId)
        .single();

      if (!cust) return;

      if (!cust.gemral_user_id) {
        // No link yet — try to match by phone/email
        const gemralId = await matchGemralUser(cust.phone, cust.email);
        if (gemralId) {
          await enrichWithGemralData(customerId, gemralId);
          console.log(`[CustomerResolver] Auto-linked Gemral: ${customerId} → ${gemralId}`);
        }
      } else {
        // Already linked — re-sync if data is stale (> 1 hour)
        const lastSync = (cust.gemral_data as any)?.last_synced_at;
        if (!lastSync || Date.now() - new Date(lastSync).getTime() > 3600_000) {
          await enrichWithGemralData(customerId, cust.gemral_user_id);
          console.log(`[CustomerResolver] Re-synced Gemral: ${customerId}`);
        }
      }
    } catch (err: any) {
      console.warn(`[CustomerResolver] Gemral match failed: ${err.message}`);
    }
  }

  private async getMessageCount(customerId: string): Promise<number> {
    const { data } = await supabase
      .from('crm_customers')
      .select('total_messages_received')
      .eq('id', customerId)
      .single();
    return data?.total_messages_received ?? 0;
  }
}
