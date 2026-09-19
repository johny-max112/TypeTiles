import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getCurrentPlayer,
  loginPlayer,
  PLAYER_TOKEN_KEY,
  registerPlayer,
  type PlayerStats,
  type PlayerUser,
} from "./playerApi";

type RegisterInput = {
  username: string;
  email: string;
  password: string;
  displayName: string;
};

type PlayerAuthContextValue = {
  user: PlayerUser | null;
  stats: PlayerStats | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const PlayerAuthContext = createContext<PlayerAuthContextValue | null>(null);

export function PlayerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlayerUser | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(PLAYER_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    getCurrentPlayer(token)
      .then(({ user: restoredUser, stats: restoredStats }) => {
        setUser(restoredUser);
        setStats(restoredStats ?? null);
      })
      .catch(() => {
        localStorage.removeItem(PLAYER_TOKEN_KEY);
        setUser(null);
        setStats(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<PlayerAuthContextValue>(
    () => ({
      user,
      stats,
      isLoading,
      login: async (username, password) => {
        const response = await loginPlayer(username, password);
        localStorage.setItem(PLAYER_TOKEN_KEY, response.token);
        setUser(response.user);
        setStats(null);
      },
      register: async (input) => {
        const response = await registerPlayer(input);
        localStorage.setItem(PLAYER_TOKEN_KEY, response.token);
        setUser(response.user);
        setStats(null);
      },
      logout: () => {
        localStorage.removeItem(PLAYER_TOKEN_KEY);
        setUser(null);
        setStats(null);
      },
    }),
    [isLoading, stats, user],
  );

  return <PlayerAuthContext.Provider value={value}>{children}</PlayerAuthContext.Provider>;
}

export function usePlayerAuth(): PlayerAuthContextValue {
  const context = useContext(PlayerAuthContext);
  if (!context) {
    throw new Error("usePlayerAuth must be used within PlayerAuthProvider");
  }
  return context;
}
