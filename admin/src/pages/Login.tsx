import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { apiClient } from "../api";
import "./Login.css";

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.login(username, password);
      const { user } = response.data;
      await apiClient.getCurrentUser();

      if (user.role !== "admin") {
        setError("You don't have admin access");
        return;
      }

      onLogin(user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="admin-signin">
      <section className="admin-signin-card" aria-labelledby="admin-login-title">
        <header className="admin-signin-header">
          <div className="admin-signin-brand"><Shield size={22} aria-hidden="true" /><span>Type<span className="admin-brand-accent">Tiles</span></span></div>
          <h1 id="admin-login-title">Admin login</h1>
          <p>Sign in with your administrator account.</p>
        </header>
        {error && <div className="admin-signin-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="admin-signin-form" aria-busy={isLoading}>
          <div>
            <label htmlFor="admin-username">Username</label>
            <div className="admin-signin-input">
              <input id="admin-username" name="username" type="text" autoComplete="username" value={username}
                onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" required disabled={isLoading} />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password">Password</label>
            <div className="admin-signin-input">
              <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoading} />
              <button type="button" className="admin-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword} aria-controls="admin-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="admin-signin-submit">
            {isLoading ? <><LoaderCircle className="admin-signin-spinner" size={19} aria-hidden="true" /> Signing in...</> : "Log in"}
          </button>
          <div className="admin-signin-status" role="status" aria-live="polite">
            {isLoading ? "Connecting to the server. Please wait." : ""}
          </div>
        </form>
      </section>
    </main>
  );
}
