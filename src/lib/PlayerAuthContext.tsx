import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getCurrentPlayer,
  loginPlayer,
  logoutPlayer,
  ApiError,
  registerPlayer,
  updatePlayerProfile,
  type PlayerStats,
  type PlayerUser,
  type OnboardingStatus,
  type RegistrationResponse,
  type RegistrationRole,
  updatePlayerOnboardingStatus,
} from "./playerApi";

type RegisterInput = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: RegistrationRole;
};

type PlayerAuthContextValue = {
  user: PlayerUser | null;
  stats: PlayerStats | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<RegistrationResponse>;
  verificationEmail: string;
  verificationResendAt: number;
  clearPendingVerification: () => void;
  updateOnboardingStatus: (status: Exclude<OnboardingStatus, "eligible">) => Promise<OnboardingStatus | null>;
  updateProfile: (input: { displayName?: string; avatar?: string; background?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const PlayerAuthContext = createContext<PlayerAuthContextValue | null>(null);

export function PlayerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlayerUser | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Navigation aid only, held in memory. Refresh/direct visits allow manual email entry.
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationResendAt, setVerificationResendAt] = useState(0);

  useEffect(() => {
    getCurrentPlayer()
      .then(({ user: restoredUser, stats: restoredStats }) => {
        setUser(restoredUser);
        setStats(restoredStats ?? null);
      })
      .catch(() => {

        setUser(null);
        setStats(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const ended = () => { setUser(null); setStats(null); };
    window.addEventListener("typetiles:session-ended", ended);
    return () => window.removeEventListener("typetiles:session-ended", ended);
  }, []);

  const value = useMemo<PlayerAuthContextValue>(
    () => ({
      user,
      stats,
      isLoading,
      verificationEmail,
      verificationResendAt,
      clearPendingVerification: () => { setVerificationEmail(""); setVerificationResendAt(0); },
      login: async (username, password) => {
        await loginPlayer(username, password);
        const current = await getCurrentPlayer(); // Confirm that the browser accepted the session cookie.
        setUser(current.user);
        setStats(current.stats ?? null);
      },
      register: async (input) => {
        const response = await registerPlayer(input);
        if (response.verificationRequired !== true) throw new Error("Unable to complete registration");
        setVerificationEmail(input.email.trim().toLowerCase());
        setVerificationResendAt(Date.now() + 60_000);
        return response;
      },
      updateOnboardingStatus: async (status) => {
        const response = await updatePlayerOnboardingStatus(status);
        setUser((current) => current ? { ...current, onboardingStatus: response.status } : current);
        return response.status;
      },
      updateProfile: async (input) => {
        const response = await updatePlayerProfile(input);
        setUser(response.user);
      },
      logout: async () => {
        try { await logoutPlayer(); } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
        }

        setUser(null);
        setStats(null);
      },
    }),
    [isLoading, stats, user, verificationEmail, verificationResendAt],
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
