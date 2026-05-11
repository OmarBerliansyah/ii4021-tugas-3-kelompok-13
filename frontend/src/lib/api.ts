import { API_BASE_URL, WS_BASE_URL as WS_URL, STORAGE_KEYS } from '../config/constants';

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const jwt = localStorage.getItem(STORAGE_KEYS.JWT);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body?.error || body?.message || `API ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const WS_BASE_URL = WS_URL;
