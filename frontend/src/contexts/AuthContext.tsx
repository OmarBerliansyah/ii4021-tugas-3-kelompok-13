import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserSession, AuthContextType } from '../types/auth';
import * as authService from '../services/auth';
import * as cryptoLib from '../lib/crypto';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = authService.getUserSession();
    const jwt = authService.getJWT();

    if (session && jwt) {
      authService.verifySession(jwt).then((isValid) => {
        if (isValid) {
          setUser(session);
        } else {
          authService.clearJWT();
          authService.clearUserSession();
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const register = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { publicKey, privateKey } = await cryptoLib.generateKeyPair();
      
      const { publicKeyJwk, encryptedPrivateKey } =
        await cryptoLib.exportKeyMaterialForRegistration(publicKey, privateKey, password);

      const registerRequest = {
        email,
        password: password,
        public_key: JSON.stringify(publicKeyJwk),
        encrypted_private_key: encryptedPrivateKey.encryptedPrivateKey,
        private_key_iv: encryptedPrivateKey.privateKeyIv,
        kdf_salt: encryptedPrivateKey.kdfSalt,
        key_algorithm: 'P-256',
        key_metadata: {
          algorithm: 'ECDH',
          curve: 'P-256',
        },
      };

      const response = await authService.register(registerRequest as any) as any;
      
      if (!response.user) {
        throw new Error(response.error || 'Registration failed on server');
      }
      
      await login(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({
        email,
        password,
      }) as any;

      if (!response.token || !response.user) {
        throw new Error(response.error || 'Login failed');
      }

      authService.storeJWT(response.token);

      const session: UserSession = {
        email: response.user.email,
        jwt: response.token,
        publicKey: JSON.parse(response.user.publicKey) as JsonWebKey,
        encryptedPrivateKey: response.user.encryptedPrivateKey,
        privateKeyIv: response.user.privateKeyIv,
        kdfSalt: response.user.kdfSalt,
        keyAlgorithm: response.user.keyAlgorithm,
      };

      authService.storeUserSession(session);
      setUser(session);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    authService.clearJWT();
    authService.clearUserSession();
    setUser(null);
  };

  const clearError = (): void => {
    setError(null);
  };

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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}