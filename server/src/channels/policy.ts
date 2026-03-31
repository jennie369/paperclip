// Channel-Agent Auto-Reply — Policy Engine
// Checks DM/group policy, allowlist, and pairing flow

import { supabase } from './zalo-personal/supabase.js';
import type {
  InboundMessage,
  PolicyResult,
  ChannelInstanceRow,
  DmPolicy,
  GroupPolicy,
} from './types.js';

/**
 * Check if an inbound message is allowed by the channel's policy.
 */
export async function check(
  msg: InboundMessage,
  channelConfig: ChannelInstanceRow
): Promise<PolicyResult> {
  const policy = msg.peerKind === 'group'
    ? (channelConfig.group_policy || 'disabled')
    : (channelConfig.dm_policy || 'open');

  switch (policy) {
    case 'open':
      return { pass: true };

    case 'disabled':
      return { pass: false, reason: `${msg.peerKind} replies disabled for this channel` };

    case 'allowlist':
      return checkAllowlist(msg, channelConfig);

    case 'pairing':
      return checkPairing(msg, channelConfig);

    default:
      return { pass: false, reason: `Unknown policy: ${policy}` };
  }
}

/**
 * Allowlist policy: sender must be in allow_from or paired_users.
 */
function checkAllowlist(
  msg: InboundMessage,
  config: ChannelInstanceRow
): PolicyResult {
  const allowed = [
    ...(config.allow_from || []),
    ...(config.paired_users || []),
  ];

  if (allowed.includes(msg.senderId)) {
    return { pass: true };
  }

  return {
    pass: false,
    reason: `Sender ${msg.senderId} not in allowlist`,
  };
}

/**
 * Pairing policy: sender must be paired, or generate a pairing code.
 */
async function checkPairing(
  msg: InboundMessage,
  config: ChannelInstanceRow
): Promise<PolicyResult> {
  // Already paired
  const pairedUsers = config.paired_users || [];
  if (pairedUsers.includes(msg.senderId)) {
    return { pass: true };
  }

  // Check if there's a pending pairing code for this sender
  const { data: existing } = await supabase
    .from('channel_pairing_codes')
    .select('code, status, expires_at')
    .eq('channel_name', msg.channel)
    .eq('sender_id', msg.senderId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return {
      pass: false,
      reason: `Pairing pending — code: ${existing.code}. Waiting for board approval.`,
      pairingCode: existing.code,
    };
  }

  // Generate new pairing code
  const code = generatePairingCode();

  const { error } = await supabase.from('channel_pairing_codes').insert({
    channel_name: msg.channel,
    sender_id: msg.senderId,
    sender_name: msg.senderName,
    code,
    status: 'pending',
    // expires_at has default (now() + 24h) in DB
  });

  if (error) {
    console.error('[Policy] Failed to create pairing code:', error.message);
    return { pass: false, reason: 'Failed to create pairing code' };
  }

  console.log(`[Policy] Pairing code ${code} created for sender ${msg.senderId} on ${msg.channel}`);

  return {
    pass: false,
    reason: `New pairing code generated: ${code}. Board must approve before auto-reply is enabled.`,
    pairingCode: code,
  };
}

/**
 * Approve a pending pairing code — adds the sender to paired_users.
 */
export async function approvePairing(
  channelName: string,
  code: string,
  approvedBy: string = 'board'
): Promise<{ success: boolean; senderId?: string; error?: string }> {
  // Find the pending code
  const { data: pairing, error: findErr } = await supabase
    .from('channel_pairing_codes')
    .select('*')
    .eq('channel_name', channelName)
    .eq('code', code)
    .eq('status', 'pending')
    .single();

  if (findErr || !pairing) {
    return { success: false, error: 'Pairing code not found or already used' };
  }

  // Check expiry
  if (new Date(pairing.expires_at) < new Date()) {
    await supabase.from('channel_pairing_codes')
      .update({ status: 'expired' })
      .eq('id', pairing.id);
    return { success: false, error: 'Pairing code expired' };
  }

  // Mark code as approved
  const { error: updateErr } = await supabase
    .from('channel_pairing_codes')
    .update({
      status: 'approved',
      approved_by: approvedBy,
    })
    .eq('id', pairing.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Add sender to channel's paired_users array
  const { data: instance } = await supabase
    .from('channel_instances')
    .select('paired_users')
    .eq('name', channelName)
    .single();

  const currentPaired = (instance?.paired_users || []) as string[];
  if (!currentPaired.includes(pairing.sender_id)) {
    const { error: pairErr } = await supabase
      .from('channel_instances')
      .update({
        paired_users: [...currentPaired, pairing.sender_id],
        updated_at: new Date().toISOString(),
      })
      .eq('name', channelName);

    if (pairErr) {
      return { success: false, error: pairErr.message };
    }
  }

  console.log(`[Policy] Pairing approved: ${pairing.sender_id} on ${channelName} (code: ${code})`);

  return { success: true, senderId: pairing.sender_id };
}

/**
 * Generate a 6-digit numeric pairing code.
 */
function generatePairingCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
