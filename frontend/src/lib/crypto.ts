import type { KeyPairData, EncryptedKeyMaterial, PasswordHashResult, DerivedKey } from '../types/auth';

function bufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair(): Promise<KeyPairData> {
  const keyPair = (await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])) as CryptoKeyPair;

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey);
}

export async function exportPublicKeyRaw(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', publicKey);
}

export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'X25519' }, false, []);
}

export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<DerivedKey> {
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(32));
  }

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return {
    key: derivedKey,
    salt: bufferToBase64(salt.buffer),
  };
}

export async function hashPassword(password: string): Promise<PasswordHashResult> {
  const salt = crypto.getRandomValues(new Uint8Array(32));

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return {
    hash: bufferToBase64(derivedBits),
    salt: bufferToBase64(salt.buffer),
  };
}

export async function encryptPrivateKey(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  password: string
): Promise<EncryptedKeyMaterial> {
  const { key: encryptionKey, salt: kdfSalt } = await deriveKeyFromPassword(password);

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey);
  const privateKeyBytes = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    privateKeyBytes
  );

  const publicKeyJwk = await exportPublicKeyJwk(publicKey);

  return {
    encryptedPrivateKey: bufferToBase64(encryptedData),
    privateKeyIv: bufferToBase64(iv.buffer),
    kdfSalt,
    publicKeyJwk,
  };
}

export async function decryptPrivateKey(
  encryptedPrivateKeyBase64: string,
  password: string,
  kdfSaltBase64: string,
  ivBase64: string
): Promise<CryptoKey> {
  const kdfSalt = new Uint8Array(base64ToBuffer(kdfSaltBase64));
  const { key: decryptionKey } = await deriveKeyFromPassword(password, kdfSalt);

  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const encryptedData = base64ToBuffer(encryptedPrivateKeyBase64);

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    decryptionKey,
    encryptedData
  );

  const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedData)) as JsonWebKey;

  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'X25519' },
    false,
    ['deriveBits']
  );
}


export async function exportKeyMaterialForRegistration(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  password: string
): Promise<{
  publicKeyJwk: JsonWebKey;
  encryptedPrivateKey: EncryptedKeyMaterial;
}> {
  const publicKeyJwk = await exportPublicKeyJwk(publicKey);
  const encryptedPrivateKey = await encryptPrivateKey(publicKey, privateKey, password);

  return { publicKeyJwk, encryptedPrivateKey };
}
