import type { RegisterRequest, LoginRequest, AuthResponse, UserSession } from '../types/auth';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

export async function register(registerData: RegisterRequest): Promise<AuthResponse> {
  try {
    const url = `${API_BASE_URL}/auth/register`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Registration failed: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function login(loginData: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Login failed: ${response.statusText}`);
    }

    const data: AuthResponse = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

const JWT_STORAGE_KEY = 'crypto_chat_jwt';
const USER_SESSION_STORAGE_KEY = 'crypto_chat_session';

export function storeJWT(jwt: string): void {
  localStorage.setItem(JWT_STORAGE_KEY, jwt);
}

export function getJWT(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY);
}

export function clearJWT(): void {
  localStorage.removeItem(JWT_STORAGE_KEY);
}

export function storeUserSession(session: UserSession): void {
  localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  const stored = localStorage.getItem(USER_SESSION_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserSession;
  } catch (e) {
    return null;
  }
}

export function clearUserSession(): void {
  localStorage.removeItem(USER_SESSION_STORAGE_KEY);
}

export async function verifySession(jwt: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}