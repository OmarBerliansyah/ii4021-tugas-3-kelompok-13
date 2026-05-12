export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
export const WS_BASE_URL =  (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost/ws';

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
