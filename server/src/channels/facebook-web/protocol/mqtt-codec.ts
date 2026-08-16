// packages/server/src/channels/facebook-web/protocol/mqtt-codec.ts
//
// Minimal MQTT 3.1 (MQIsdp) packet codec — handles only what FB needs:
// CONNECT, CONNACK, PUBLISH, PUBACK, SUBSCRIBE, SUBACK, PINGREQ, PINGRESP, DISCONNECT.
//
// Why custom: FB uses 'MQIsdp' protocol name (legacy MQTT 3.1 spec), and packs
// session metadata as JSON in the CONNECT USERNAME field. Mainstream MQTT libs
// default to 3.1.1 and don't expose USERNAME packing flexibly enough for FB's
// quirks. Keeping this codec tiny (~200 LOC) avoids a dependency.

import { MQTT_PACKET, FB_API } from './message.js';

// ──────────────────────────────────────────────────────────────────────
// Low-level helpers
// ──────────────────────────────────────────────────────────────────────

/** Encode MQTT variable-length integer (remaining length field). */
function encodeRemainingLength(len: number): Buffer {
  const bytes: number[] = [];
  do {
    let digit = len % 128;
    len = Math.floor(len / 128);
    if (len > 0) digit |= 0x80;
    bytes.push(digit);
  } while (len > 0);
  return Buffer.from(bytes);
}

/** Decode MQTT variable-length integer. Returns [value, bytesConsumed]. */
export function decodeRemainingLength(buf: Buffer, offset: number = 0): [number, number] {
  let multiplier = 1;
  let value = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos];
    value += (b & 0x7f) * multiplier;
    pos += 1;
    if ((b & 0x80) === 0) break;
    multiplier *= 128;
    if (multiplier > 128 * 128 * 128) throw new Error('MQTT remaining length malformed');
  }
  return [value, pos - offset];
}

/** Encode MQTT length-prefixed UTF-8 string. */
function encodeString(s: string): Buffer {
  const body = Buffer.from(s, 'utf-8');
  const len = Buffer.alloc(2);
  len.writeUInt16BE(body.length, 0);
  return Buffer.concat([len, body]);
}

/** Decode MQTT length-prefixed UTF-8 string. Returns [string, bytesConsumed]. */
export function decodeString(buf: Buffer, offset: number = 0): [string, number] {
  if (buf.length - offset < 2) throw new Error('MQTT string: insufficient bytes for length prefix');
  const len = buf.readUInt16BE(offset);
  if (buf.length - offset < 2 + len) throw new Error('MQTT string: insufficient bytes for payload');
  const s = buf.slice(offset + 2, offset + 2 + len).toString('utf-8');
  return [s, 2 + len];
}

// ──────────────────────────────────────────────────────────────────────
// CONNECT packet (FB-specific JSON username payload)
// ──────────────────────────────────────────────────────────────────────

export interface FbConnectPayload {
  /** User-Agent string */
  a: string;
  asi: null;
  /** App ID — 514771569228061 for Business Suite */
  aid: number;
  /** Asset IDs scoped by type */
  aids: { PAGE: string; INSTAGRAM_ACCOUNT_V2?: string };
  chat_on: boolean;
  cp: number;
  ct: 'websocket';
  /** Device UUID v4 */
  d: string;
  dc: string;
  ecp: number;
  fg: boolean;
  gas: null;
  mqtt_sid: string;
  no_auto_fg: boolean;
  /** Primary page ID */
  p: string;
  pack: any[];
  php_override: string;
  pm: any[];
  /** Session ID int64 */
  s: number;
  st: any[];
  /** c_user (Facebook user ID) */
  u: string;
}

/**
 * Encode MQTT CONNECT packet with FB-specific JSON username.
 *
 * Wire format (MQTT 3.1):
 *   [type/flags] [remaining_length]
 *   [protocol_name_len][protocol_name="MQIsdp"]
 *   [protocol_level=3]
 *   [connect_flags=0x82] (USERNAME | CLEAN_SESSION)
 *   [keepalive_sec=15]
 *   [client_id_len][client_id="mqttwsclient"]
 *   [username_len][username=JSON.stringify(payload)]
 */
export function encodeConnect(
  payload: FbConnectPayload,
  opts: {
    clientId?: string;
    keepaliveSec?: number;
    cleanSession?: boolean;
  } = {},
): Buffer {
  const clientId = opts.clientId ?? FB_API.MQTT_CLIENT_ID;
  const keepalive = opts.keepaliveSec ?? FB_API.MQTT_KEEPALIVE_SEC;
  const cleanSession = opts.cleanSession ?? true;

  // Variable header
  const protocolName = encodeString(FB_API.MQTT_PROTOCOL_NAME);
  const protocolLevel = Buffer.from([FB_API.MQTT_PROTOCOL_LEVEL]);
  let flags = 0x00;
  if (cleanSession) flags |= 0x02;
  flags |= 0x80; // USERNAME flag (FB requires)
  const flagsBuf = Buffer.from([flags]);
  const keepaliveBuf = Buffer.alloc(2);
  keepaliveBuf.writeUInt16BE(keepalive, 0);

  // Payload
  const clientIdBuf = encodeString(clientId);
  const usernameJson = JSON.stringify(payload);
  const usernameBuf = encodeString(usernameJson);

  const body = Buffer.concat([
    protocolName,
    protocolLevel,
    flagsBuf,
    keepaliveBuf,
    clientIdBuf,
    usernameBuf,
  ]);

  const fixedHeader = Buffer.from([(MQTT_PACKET.CONNECT << 4) | 0x00]);
  const remLen = encodeRemainingLength(body.length);
  return Buffer.concat([fixedHeader, remLen, body]);
}

// ──────────────────────────────────────────────────────────────────────
// SUBSCRIBE / PUBLISH / PING / DISCONNECT
// ──────────────────────────────────────────────────────────────────────

/**
 * Encode SUBSCRIBE packet for one or more topics.
 */
export function encodeSubscribe(packetId: number, topics: Array<{ topic: string; qos: 0 | 1 | 2 }>): Buffer {
  const packetIdBuf = Buffer.alloc(2);
  packetIdBuf.writeUInt16BE(packetId, 0);

  const parts: Buffer[] = [packetIdBuf];
  for (const { topic, qos } of topics) {
    parts.push(encodeString(topic));
    parts.push(Buffer.from([qos]));
  }
  const body = Buffer.concat(parts);

  // SUBSCRIBE requires flags = 0x02 (per MQTT spec)
  const fixedHeader = Buffer.from([(MQTT_PACKET.SUBSCRIBE << 4) | 0x02]);
  const remLen = encodeRemainingLength(body.length);
  return Buffer.concat([fixedHeader, remLen, body]);
}

/**
 * Encode PUBLISH packet. QoS=0 = no packet ID.
 */
export function encodePublish(topic: string, payload: Buffer | string, opts: { qos?: 0 | 1; packetId?: number } = {}): Buffer {
  const qos = opts.qos ?? 0;
  const payloadBuf = typeof payload === 'string' ? Buffer.from(payload, 'utf-8') : payload;
  const topicBuf = encodeString(topic);

  const headerParts: Buffer[] = [topicBuf];
  if (qos > 0) {
    if (!opts.packetId) throw new Error('PUBLISH QoS>0 requires packetId');
    const pid = Buffer.alloc(2);
    pid.writeUInt16BE(opts.packetId, 0);
    headerParts.push(pid);
  }
  headerParts.push(payloadBuf);
  const body = Buffer.concat(headerParts);

  const flags = (qos & 0x03) << 1;
  const fixedHeader = Buffer.from([(MQTT_PACKET.PUBLISH << 4) | flags]);
  const remLen = encodeRemainingLength(body.length);
  return Buffer.concat([fixedHeader, remLen, body]);
}

export function encodePingreq(): Buffer {
  return Buffer.from([MQTT_PACKET.PINGREQ << 4, 0x00]);
}

export function encodeDisconnect(): Buffer {
  return Buffer.from([MQTT_PACKET.DISCONNECT << 4, 0x00]);
}

// ──────────────────────────────────────────────────────────────────────
// Decode (incoming packets)
// ──────────────────────────────────────────────────────────────────────

export interface ParsedPacket {
  type: number;
  flags: number;
  payload: Buffer;
  /** Total consumed bytes including header */
  consumed: number;
}

/**
 * Parse a single MQTT packet from buffer. Returns null if not enough bytes.
 * For multi-packet buffers, call repeatedly with offset until null.
 */
export function parsePacket(buf: Buffer): ParsedPacket | null {
  if (buf.length < 2) return null;
  const firstByte = buf[0];
  const type = (firstByte >> 4) & 0x0f;
  const flags = firstByte & 0x0f;

  let remLen: number;
  let lenBytes: number;
  try {
    [remLen, lenBytes] = decodeRemainingLength(buf, 1);
  } catch {
    return null;
  }
  const totalLen = 1 + lenBytes + remLen;
  if (buf.length < totalLen) return null;

  const payload = buf.slice(1 + lenBytes, totalLen);
  return { type, flags, payload, consumed: totalLen };
}

/** Decode PUBLISH packet payload to (topic, body). QoS=0 only — no packetId. */
export function decodePublish(payload: Buffer, qos: number = 0): { topic: string; packetId?: number; body: Buffer } {
  const [topic, topicLen] = decodeString(payload, 0);
  let offset = topicLen;
  let packetId: number | undefined;
  if (qos > 0) {
    packetId = payload.readUInt16BE(offset);
    offset += 2;
  }
  const body = payload.slice(offset);
  return { topic, packetId, body };
}

/** Decode SUBACK packet (packetId + return codes). */
export function decodeSuback(payload: Buffer): { packetId: number; returnCodes: number[] } {
  const packetId = payload.readUInt16BE(0);
  const returnCodes = Array.from(payload.slice(2));
  return { packetId, returnCodes };
}
