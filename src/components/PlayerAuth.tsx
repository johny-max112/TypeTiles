import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";

export default function PlayerAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = usePlayerAuth();
  const isRegister = location.pathname === "/register";
  const destination = (location.state as { from?: string } | null)?.from ?? "/app";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ username, email, password, displayName });
      } else {
        await login(username, password);
      }
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to authenticate");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4 text-white">
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-black/40 p-8 shadow-lg backdrop-blur-sm">
        <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Type Tiles</div>
        <h1 className="mt-2 text-3xl font-bold">{isRegister ? "Create account" : "Player login"}</h1>
        <p className="mt-2 text-white/70">
          {isRegister ? "Create your player account to track matches." : "Sign in to continue to your matches."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm text-white/80">
            Username
            <input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 h-11 w-full rounded bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300" autoComplete="username" />
          </label>

          {isRegister ? (
            <>
              <label className="block text-sm text-white/80">
                Display name
                <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 h-11 w-full rounded bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300" autoComplete="name" />
              </label>
              <label className="block text-sm text-white/80">
                Email
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300" autoComplete="email" />
              </label>
            </>
          ) : null}

          <label className="block text-sm text-white/80">
            Password
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300" autoComplete={isRegister ? "new-password" : "current-password"} />
          </label>

          {error ? <p className="text-sm text-red-300" role="alert">{error}</p> : null}

          <button type="submit" disabled={submitting} className="w-full rounded bg-cyan-400 px-6 py-3 font-semibold text-slate-900 disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Working..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-white/70">
          {isRegister ? "Already have an account? " : "Need an account? "}
          <Link className="text-cyan-300 hover:text-white" to={isRegister ? "/login" : "/register"} state={{ from: destination }}>
            {isRegister ? "Log in" : "Register"}
          </Link>
        </p>
      </div>
    </div>
  );
}
