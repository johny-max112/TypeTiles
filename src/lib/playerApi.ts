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

export type PlayerStats = {
  games_played: number;
  wins: number;
  losses: number;
  total_score: number;
  best_wpm: number;
  avg_accuracy: number;
  top_combo: number;
};

export type MatchHistoryRow = {
  id: number;
  mode: string;
  difficulty: string;
  round_time: number;
  word_set: string;
  status: string;
  created_at: string;
  score: number;
  wpm: number;
  accuracy: number;
  position: number | null;
};

export type LeaderboardRow = {
  id: number;
  username: string;
  display_name: string;
  tier: string;
  total_score: number;
  games_played: number;
  best_wpm: number;
  avg_accuracy: number;
  top_combo?: number;
  rank?: number;
};

export type CreateMatchInput = {
  mode: string;
  difficulty: string;
  roundTime: number;
  wordSet: string;
};

export type CreateMatchResponse = CreateMatchInput & {
  matchId: number;
  status: string;
};

export type SubmitMatchResultInput = {
  matchId: number;
  score: number;
  wpm: number;
  accuracy: number;
};

type AuthResponse = {
  token: string;
  user: PlayerUser;
};

type MeResponse = {
  user: PlayerUser;
  stats?: PlayerStats;
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

export function createPlayerMatch(input: CreateMatchInput): Promise<CreateMatchResponse> {
  return authenticatedRequest<CreateMatchResponse>("/matches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function submitPlayerMatchResult(input: SubmitMatchResultInput): Promise<unknown> {
  return authenticatedRequest<unknown>(`/matches/${input.matchId}/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPlayerHistory(): Promise<{ history: MatchHistoryRow[] }> {
  return authenticatedRequest<{ history: MatchHistoryRow[] }>("/users/history");
}

export function getPlayerRank(): Promise<{ rank: number; stats: PlayerStats }> {
  return authenticatedRequest<{ rank: number; stats: PlayerStats }>("/users/me/rank");
}

export function getLeaderboard(tier?: string): Promise<{ leaderboard: LeaderboardRow[]; tier?: string }> {
  const path = tier ? `/leaderboard/tier/${encodeURIComponent(tier)}` : "/leaderboard";
  return request<{ leaderboard: LeaderboardRow[]; tier?: string }>(path);
}

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(PLAYER_TOKEN_KEY);
  if (!token) {
    throw new Error("Authentication required");
  }

  return request<T>(path, options, token);
}
