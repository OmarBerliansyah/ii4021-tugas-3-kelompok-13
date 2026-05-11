/**
 * Cryptographic utilities for the frontend
 * - P-256 ECDH key pair generation
 * - Private key encryption with PBKDF2 + AES-256-GCM
 * - Password hashing with scrypt-like behavior
 */

import type { KeyPairData, EncryptedKeyMaterial, PasswordHashResult, DerivedKey } from '../types/auth';

// ============================================
// Encoding/Decoding Helpers
// ============================================

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

// ============================================
// ECDH P-256 Key Generation
// ============================================

/**
 * Generate a P-256 ECDH key pair for key agreement
 */
export async function generateKeyPair(): Promise<KeyPairData> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Export a public key to JWK format (for sending to backend)
 */
export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey);
}

/**
 * Export a public key to raw format
 */
export async function exportPublicKeyRaw(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', publicKey);
}

/**
 * Import a public key from JWK format
 */
export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

// ============================================
// Password and Key Derivation
// ============================================

/**
 * Derive a key from password using PBKDF2 with SHA-256
 * Returns both the derived key and the salt used
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<DerivedKey> {
  // Generate salt if not provided
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(32));
  }

  // Import password as raw key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return {
    key: derivedKey,
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Hash a password using PBKDF2 (for password verification on backend)
 * Similar to scrypt but using PBKDF2 with SHA-256
 */
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

// ============================================
// Private Key Encryption
// ============================================

/**
 * Encrypt a private key using a password-derived key
 * Uses AES-256-GCM with IV
 */
export async function encryptPrivateKey(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  password: string
): Promise<EncryptedKeyMaterial> {
  // Derive encryption key from password
  const { key: encryptionKey, salt: kdfSalt } = await deriveKeyFromPassword(password);

  // Export private key to JWK
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey);

  // Serialize private key
  const privateKeyBytes = new TextEncoder().encode(JSON.stringify(privateKeyJwk));

  // Generate IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt private key
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    privateKeyBytes
  );

  // Export public key to JWK
  const publicKeyJwk = await exportPublicKeyJwk(publicKey);

  return {
    encryptedPrivateKey: bufferToBase64(encryptedData),
    privateKeyIv: bufferToBase64(iv.buffer),
    kdfSalt: kdfSalt,
    publicKeyJwk: publicKeyJwk,
  };
}

/**
 * Decrypt a private key using a password
 */
export async function decryptPrivateKey(
  encryptedPrivateKeyBase64: string,
  password: string,
  kdfSaltBase64: string,
  ivBase64: string
): Promise<CryptoKey> {
  // Reconstruct the salt
  const kdfSalt = new Uint8Array(base64ToBuffer(kdfSaltBase64));

  // Derive the decryption key using the same salt
  const { key: decryptionKey } = await deriveKeyFromPassword(password, kdfSalt);

  // Get IV
  const iv = new Uint8Array(base64ToBuffer(ivBase64));

  // Get encrypted data
  const encryptedData = base64ToBuffer(encryptedPrivateKeyBase64);

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    decryptionKey,
    encryptedData
  );

  // Parse the decrypted JWK
  const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedData)) as JsonWebKey;

  // Import the private key
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// ============================================
// Export Helpers
// ============================================

/**
 * Export all key material needed for the registration request
 */
export async function exportKeyMaterialForRegistration(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  password: string
): Promise<{
  publicKeyJwk: JsonWebKey;
  encryptedPrivateKey: EncryptedKeyMaterial;
  passwordHash: PasswordHashResult;
}> {
  const publicKeyJwk = await exportPublicKeyJwk(publicKey);
  const encryptedPrivateKey = await encryptPrivateKey(publicKey, privateKey, password);
  const passwordHash = await hashPassword(password);

  return {
    publicKeyJwk,
    encryptedPrivateKey,
    passwordHash,
  };
}
