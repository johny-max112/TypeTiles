import axios, { AxiosInstance } from "axios";

const API_URL = process.env.VITE_API_URL || "http://localhost:3001/api";

interface APIConfig {
  token?: string;
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  setToken(token: string) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Auth
  async register(username: string, email: string, password: string, displayName: string) {
    return this.client.post("/auth/register", { username, email, password, displayName });
  }

  async login(username: string, password: string) {
    return this.client.post("/auth/login", { username, password });
  }

  async getCurrentUser() {
    return this.client.get("/auth/me");
  }

  // Leaderboard
  async getLeaderboard(limit: number = 50, offset: number = 0) {
    return this.client.get("/leaderboard", { params: { limit, offset } });
  }

  async getLeaderboardByTier(tier: string, limit: number = 50) {
    return this.client.get(`/leaderboard/tier/${tier}`, { params: { limit } });
  }

  async getUserStats(userId: number) {
    return this.client.get(`/users/${userId}/stats`);
  }

  // Admin
  async getAdminStats() {
    return this.client.get("/admin/dashboard/stats");
  }

  async getAllUsers(limit: number = 50, offset: number = 0, search?: string) {
    return this.client.get("/admin/users", { params: { limit, offset, search } });
  }

  async banUser(userId: number, reason?: string) {
    return this.client.post(`/admin/users/${userId}/ban`, { reason });
  }

  async unbanUser(userId: number) {
    return this.client.post(`/admin/users/${userId}/unban`);
  }

  async updateUserTier(userId: number, tier: string) {
    return this.client.put(`/admin/users/${userId}/tier`, { tier });
  }

  async resetUserStats(userId: number) {
    return this.client.post(`/admin/users/${userId}/reset-stats`);
  }

  async getAdminLogs(limit: number = 50, offset: number = 0) {
    return this.client.get("/admin/logs", { params: { limit, offset } });
  }

  // Matches
  async createMatch(mode: string, difficulty: string, roundTime: number, wordSet: string) {
    return this.client.post("/matches", { mode, difficulty, roundTime, wordSet });
  }

  async getMatchDetails(matchId: number) {
    return this.client.get(`/matches/${matchId}`);
  }

  async getMatchHistory() {
    return this.client.get("/users/history");
  }

  async submitScore(matchId: number, score: number, wpm: number, accuracy: number) {
    return this.client.post(`/matches/${matchId}/submit`, { score, wpm, accuracy });
  }
}

export const apiClient = new APIClient();
