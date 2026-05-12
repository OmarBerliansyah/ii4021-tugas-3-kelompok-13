const DEV_API_FALLBACK = 'http://localhost:3000';
const PROD_API_FALLBACK = '/api';

const DEV_WS_FALLBACK = 'ws://localhost:3000';
const PROD_WS_FALLBACK = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? DEV_API_FALLBACK : PROD_API_FALLBACK);
export const WS_BASE_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (import.meta.env.DEV ? DEV_WS_FALLBACK : PROD_WS_FALLBACK);

export const STORAGE_KEYS = {
  JWT: 'crypto_chat_jwt',
  USER_SESSION: 'crypto_chat_session',
} as const;

export const CRYPTO_CONFIG = {
  ALGORITHM: 'X25519',
  PRIVATE_KEY_ENCRYPTION: 'PBKDF2-SHA256-AES-256-GCM',
  MESSAGE_ENCRYPTION: 'AES-256-CTR',
  HKDF_INFO: 'ii4021-crypto-chat-v1',
  PBKDF2_ITERATIONS: 100000,
} as const;
