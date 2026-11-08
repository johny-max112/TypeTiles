import { useState } from "react";
import type { FormEvent } from "react";
import { Dices } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";
import { HudBackground } from "./HudBackground";
import { ApiError, type RegistrationRole } from "../lib/playerApi";

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
  const [registrationRole, setRegistrationRole] = useState<RegistrationRole>("student");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setVerificationRequired(false);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ username, email, password, displayName, role: registrationRole });
        setPassword("");
        navigate("/verify-email", { replace: true });
      } else {
        await login(username, password);
        navigate(destination, { replace: true });
      }
    } catch (requestError) {
      const pending = !isRegister && requestError instanceof ApiError && requestError.status === 403 && requestError.code === "EMAIL_VERIFICATION_REQUIRED";
      setVerificationRequired(pending);
      setError(pending ? "Please verify your email before logging in." : requestError instanceof Error ? requestError.message : "Unable to authenticate");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,#08122e_0%,#2d164e_100%)] px-4 py-8 text-white sm:px-8">
      <HudBackground />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(0,64,95,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,64,95,.5)_1px,transparent_1px)] [background-size:76px_76px]" />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-black/40 p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <Dices className="h-11 w-11 rotate-[-13deg] text-[#6a9eff]" />
          <div className="mt-1 bg-gradient-to-r from-[#6a9eff] to-[#1183bb] bg-clip-text font-['Orbitron'] text-3xl font-extrabold text-transparent sm:text-4xl">TypeTiles</div>
          <h1 className="mt-6 text-2xl font-bold uppercase tracking-[0.16em]">{isRegister ? "Create Account" : "Login"}</h1>
          <p className="mt-2 text-center text-sm text-white/70">
            {isRegister ? "Choose your account type and verify your email to get started." : "Sign in to continue to your matches."}
          </p>
        </div>

        {!isRegister && (location.state as { emailVerified?: boolean } | null)?.emailVerified === true ? <p role="status" className="text-sm text-emerald-300">Email verified. Log in to continue.</p> : null}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {isRegister ? (
            <fieldset disabled={submitting}>
              <legend className="mb-2 text-sm text-white/80">Account type</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["student", "teacher"] as const).map((role) => (
                  <label key={role} className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 ${registrationRole === role ? "border-[#6a9eff] bg-[#454ec3]/20" : "border-white/20 bg-white/5"}`}>
                    <input type="radio" name="registration-role" value={role} checked={registrationRole === role} onChange={() => setRegistrationRole(role)} className="mt-1 accent-[#6a9eff]" />
                    <span>
                      <span className="block text-sm font-semibold">{role === "student" ? "Student" : "Teacher"}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-white/70">
                        {role === "student" ? "Practice typing and join multiplayer classrooms." : "Host classrooms and review your students' session results."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {isRegister ? (
            <label className="block text-sm text-white/80">
              Display name
              <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30" autoComplete="name" />
            </label>
          ) : null}

          <label className="block text-sm text-white/80">
            Username
            <input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30" autoComplete="username" />
          </label>

          {isRegister ? (
            <>
              <label className="block text-sm text-white/80">
                Email
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30" autoComplete="email" />
              </label>
            </>
          ) : null}

          <label className="block text-sm text-white/80">
            Password
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30" autoComplete={isRegister ? "new-password" : "current-password"} />
          </label>

          {!isRegister ? <div className="text-right"><Link to="/forgot-password" className="text-sm text-[#8db0ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Forgot Password?</Link></div> : null}

          {error ? <p className="text-sm text-red-300" role="alert">{error}</p> : null}
          {!isRegister && verificationRequired ? <Link to="/verify-email" className="inline-block text-sm text-[#8db0ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Verify your email</Link> : null}

          <button type="submit" disabled={submitting} className="w-full rounded-[10px] bg-[#454ec3] px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Working..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm text-white/70">
          <Link className="text-white/60 transition hover:text-white" to="/welcome">Back to Welcome</Link>
          <span>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <Link className="text-[#8db0ff] hover:text-white" to={isRegister ? "/login" : "/register"} state={{ from: destination }}>
            {isRegister ? "Log in" : "Create Account"}
          </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
