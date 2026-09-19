const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export const PLAYER_TOKEN_KEY = "player_token";

export type PlayerUser = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  tier: string;
  role: string;
};

type AuthResponse = {
  token: string;
  user: PlayerUser;
};

type MeResponse = {
  user: PlayerUser;
  stats?: unknown;
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function registerPlayer(input: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginPlayer(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getCurrentPlayer(token: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", {}, token);
}

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(PLAYER_TOKEN_KEY);
  if (!token) {
    throw new Error("Authentication required");
  }

  return request<T>(path, options, token);
}
