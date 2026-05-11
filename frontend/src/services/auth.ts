import type { RegisterRequest, LoginRequest, LoginResponse, UserSession } from '../types/auth';
import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';

export async function register(registerData: RegisterRequest): Promise<{ user: unknown }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Registration failed: ${response.statusText}`);
  }

  return data as { user: unknown };
}

export async function login(loginData: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Login failed: ${response.statusText}`);
  }

  return data as LoginResponse;
}

export function storeJWT(jwt: string): void {
  localStorage.setItem(STORAGE_KEYS.JWT, jwt);
}

export function getJWT(): string | null {
  return localStorage.getItem(STORAGE_KEYS.JWT);
}

export function clearJWT(): void {
  localStorage.removeItem(STORAGE_KEYS.JWT);
}

export function storeUserSession(session: UserSession): void {
  localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
  if (!stored) return null;
  return JSON.parse(stored) as UserSession;
}

export function clearUserSession(): void {
  localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
}

export async function verifySession(jwt: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });
  return response.ok;
}