
export interface RegisterRequest {
  email: string;
  password: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_iv: string;
  kdf_salt: string;
  key_algorithm: 'X25519';
  key_metadata: {
    algorithm: 'X25519';
    privateKeyEncryption: 'PBKDF2-SHA256-AES-256-GCM';
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    id: string;
    email: string;
    publicKey: string;
    encryptedPrivateKey: string;
    privateKeyIv: string;
    kdfSalt: string;
    keyAlgorithm: string;
    keyMetadata: Record<string, unknown>;
  };
}

export interface UserSession {
  email: string;
  jwt: string;
  publicKeyJwk: JsonWebKey;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  kdfSalt: string;
  keyAlgorithm: string;
}

export interface KeyPairData {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedKeyMaterial {
  encryptedPrivateKey: string;
  privateKeyIv: string;
  kdfSalt: string;
  publicKeyJwk: JsonWebKey;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

export interface DerivedKey {
  key: CryptoKey;
  salt: string;
}

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
