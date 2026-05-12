import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserSession, AuthContextType } from '../types/auth';
import * as authService from '../services/auth';
import * as cryptoLib from '../lib/crypto';
import { useCryptoSession } from './CryptoContext';
import { useToast } from './useToast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setMyPrivateKey, clearSession } = useCryptoSession();
  const { pushToast } = useToast();

  useEffect(() => {
    const init = async () => {
      const session = authService.getUserSession();
      const jwt = authService.getJWT();

      if (session && jwt) {
        const isValid = await authService.verifySession(jwt);
        if (isValid) {
          setUser(session);
        } 
        else {
          authService.clearJWT();
          authService.clearUserSession();
          pushToast({
            variant: 'warning',
            title: 'Sesi login berakhir',
            message: 'Silakan login kembali untuk melanjutkan.',
          });
        }
      }
      setIsLoading(false);
    };
    init();
  }, [pushToast]);

  const register = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { publicKey, privateKey } = await cryptoLib.generateKeyPair();

      const { publicKeyJwk, encryptedPrivateKey } =
        await cryptoLib.exportKeyMaterialForRegistration(publicKey, privateKey, password);

      const registerRequest = {
        email,
        password,
        public_key: JSON.stringify(publicKeyJwk),
        encrypted_private_key: encryptedPrivateKey.encryptedPrivateKey,
        private_key_iv: encryptedPrivateKey.privateKeyIv,
        kdf_salt: encryptedPrivateKey.kdfSalt,
        key_algorithm: 'X25519' as const,
        key_metadata: {
          algorithm: 'X25519' as const,
          privateKeyEncryption: 'PBKDF2-SHA256-AES-256-GCM' as const,
        },
      };

      const response = await authService.register(registerRequest);

      if (!response.user) {
        throw new Error('Registration failed on server');
      }

      await login(email, password);
      pushToast({
        variant: 'success',
        title: 'Registrasi berhasil',
        message: 'Akun berhasil dibuat.',
      });
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');

      const rawMessage = err instanceof Error ? err.message : 'Registrasi gagal.';
      const message =
        rawMessage.toLowerCase().includes('registered') || rawMessage.toLowerCase().includes('already')
          ? 'Email sudah terdaftar.'
          : 'Registrasi gagal. Coba lagi.';
      pushToast({
        variant: 'error',
        title: 'Registrasi gagal',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });

      if (!response.token || !response.user) {
        throw new Error('Login failed: invalid server response');
      }

      authService.storeJWT(response.token);

      const session: UserSession = {
        email: response.user.email,
        jwt: response.token,
        publicKeyJwk: JSON.parse(response.user.publicKey) as JsonWebKey,
        encryptedPrivateKey: response.user.encryptedPrivateKey,
        privateKeyIv: response.user.privateKeyIv,
        kdfSalt: response.user.kdfSalt,
        keyAlgorithm: response.user.keyAlgorithm,
      };

      authService.storeUserSession(session);
      setUser(session);

      const unlockedKey = await cryptoLib.decryptPrivateKey(
        session.encryptedPrivateKey,
        password,
        session.kdfSalt,
        session.privateKeyIv
      );
      setMyPrivateKey(unlockedKey);
      pushToast({
        variant: 'success',
        title: 'Login berhasil',
        message: 'Sesi terenkripsi siap digunakan.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      const rawMessage = err instanceof Error ? err.message : 'Login failed';
      const friendlyMessage =
        rawMessage.toLowerCase().includes('invalid')
          ? 'Email atau password salah.'
          : rawMessage;
      pushToast({
        variant: 'error',
        title: 'Login gagal',
        message: friendlyMessage,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    authService.clearJWT();
    authService.clearUserSession();
    clearSession();
    setUser(null);
    pushToast({
      variant: 'info',
      title: 'Logout berhasil',
      message: 'Anda telah keluar dari aplikasi.',
    });
  };

  const clearError = (): void => setError(null);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    register,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
