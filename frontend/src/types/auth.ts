/**
 * Authentication and Crypto Types for Frontend
 */

// ============================================
// API Request/Response Types
// ============================================

export interface RegisterRequest {
  email: string;
  password_hash: string;
  password_salt: string;
  public_key: string; // JWK format, stringified JSON
  encrypted_private_key: string; // Base64 encoded
  private_key_iv: string; // Base64 encoded
  kdf_salt: string; // Base64 encoded
  key_algorithm: string; // e.g., "P-256"
  key_metadata?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    email: string;
    jwt: string;
    public_key: string;
    encrypted_private_key: string;
    private_key_iv: string;
    kdf_salt: string;
    key_algorithm: string;
  };
  error?: string;
}

// ============================================
// User Session Types
// ============================================

export interface UserSession {
  email: string;
  jwt: string;
  publicKey: CryptoKey | JsonWebKey; // Can be either depending on where it's used
  encryptedPrivateKey: string; // Base64 encoded - will be decrypted on demand
  privateKeyIv: string; // Base64 encoded
  kdfSalt: string; // Base64 encoded
  keyAlgorithm: string;
}

// ============================================
// Crypto Key Pair Types
// ============================================

export interface KeyPairData {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedKeyMaterial {
  encryptedPrivateKey: string; // Base64 encoded
  privateKeyIv: string; // Base64 encoded
  kdfSalt: string; // Base64 encoded
  publicKeyJwk: JsonWebKey; // Stringified JWK
}

// ============================================
// Password Hashing Types
// ============================================

export interface PasswordHashResult {
  hash: string; // Base64 encoded
  salt: string; // Base64 encoded
}

// ============================================
// Key Derivation Types
// ============================================

export interface DerivedKey {
  key: CryptoKey;
  salt: string; // Base64 encoded
}

// ============================================
// Auth Context Types
// ============================================

export interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
