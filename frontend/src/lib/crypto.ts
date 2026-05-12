import type { KeyPairData, EncryptedKeyMaterial, PasswordHashResult, DerivedKey } from '../types/auth';

function getWebCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error('Web Crypto API tidak tersedia di browser ini.');
  }
  return globalThis.crypto;
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API membutuhkan secure context. Gunakan HTTPS atau localhost.');
  }
  return subtle;
}

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
  const subtle = getSubtleCrypto();
  const keyPair = (await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])) as CryptoKeyPair;

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  const subtle = getSubtleCrypto();
  return subtle.exportKey('jwk', publicKey);
}

export async function exportPublicKeyRaw(publicKey: CryptoKey): Promise<ArrayBuffer> {
  const subtle = getSubtleCrypto();
  return subtle.exportKey('raw', publicKey);
}

export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.importKey('jwk', jwk, { name: 'X25519' }, false, []);
}

export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<DerivedKey> {
  const webCrypto = getWebCrypto();
  const subtle = getSubtleCrypto();
  if (!salt) {
    salt = webCrypto.getRandomValues(new Uint8Array(32));
  }

  const passwordKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return {
    key: derivedKey,
    salt: bufferToBase64(salt.buffer),
  };
}

export async function hashPassword(password: string): Promise<PasswordHashResult> {
  const webCrypto = getWebCrypto();
  const subtle = getSubtleCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(32));

  const passwordKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
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
  const webCrypto = getWebCrypto();
  const subtle = getSubtleCrypto();
  const { key: encryptionKey, salt: kdfSalt } = await deriveKeyFromPassword(password);

  const privateKeyJwk = await subtle.exportKey('jwk', privateKey);
  const privateKeyBytes = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await subtle.encrypt(
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
  const subtle = getSubtleCrypto();
  const kdfSalt = new Uint8Array(base64ToBuffer(kdfSaltBase64));
  const { key: decryptionKey } = await deriveKeyFromPassword(password, kdfSalt);

  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const encryptedData = base64ToBuffer(encryptedPrivateKeyBase64);

  const decryptedData = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    decryptionKey,
    encryptedData
  );

  const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedData)) as JsonWebKey;

  return subtle.importKey(
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
