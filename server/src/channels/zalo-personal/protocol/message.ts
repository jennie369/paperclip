// packages/server/src/channels/zalo-personal/protocol/message.ts

export interface ZaloCredentials {
  imei: string;
  userAgent: string;
  language: string;
  cookie: ZaloCookie[];
  loginInfo?: ZaloLoginInfo;
}

export interface ZaloCookie {
  domain: string;
  name: string;
  value: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate: number;
}

export interface ZaloLoginInfo {
  uid: string;
  zpw_enk: string;
  zpw_ws: string[];
  zpw_service_map_v3: {
    chat: string[];
    group: string[];
    file: string[];
    profile: string[];
    group_poll: string[];
  };
}

export interface ZaloSession {
  uid: string;
  imei: string;
  userAgent: string;
  language: string;
  secretKey: string;
  loginInfo: ZaloLoginInfo;
  cookies: ZaloCookie[];
}

export interface ZaloDMMessage {
  msgId: string;
  uidFrom: string;
  idTo: string;
  dName: string;
  ts: string;
  content: string;
  msgType: string;
  cmd: number;
}

export interface ZaloGroupMessage {
  msgId: string;
  uidFrom: string;
  idTo: string;
  dName: string;
  content: string;
  mentions?: Array<{
    uid: string;
    pos: number;
    len: number;
    type: number;
  }>;
}

export const WS_CMD = {
  CIPHER_KEY_HANDSHAKE: { cmd: 1, subCmd: 1 },
  PING: { cmd: 2, subCmd: 1 },
  PONG: { cmd: 2, subCmd: 0 },
  DM_MESSAGE: { cmd: 501, subCmd: 0 },
  GROUP_MESSAGE: { cmd: 521, subCmd: 0 },
  CONTROL_EVENT: { cmd: 601, subCmd: 0 },
  DUPLICATE_SESSION: { cmd: 3000, subCmd: 0 },
} as const;

export const ZALO_API = {
  ZPW_TYPE: 30,
  ZPW_VER: 665,
  ENC_VER: 'v2',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  LANGUAGE: 'vi',
  QR_TIMEOUT: 100_000,
  PING_INTERVAL: 30_000,
  READ_DEADLINE_MULTIPLIER: 2.5,
  STABLE_THRESHOLD: 60_000,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_FILE_SIZE: 25 * 1024 * 1024,
} as const;
