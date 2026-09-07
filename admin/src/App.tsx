import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Users, Shield, Activity } from "lucide-react";
import { apiClient } from "./api";
import DashboardPage from "./pages/Dashboard";
import UsersPage from "./pages/Users";
import LeaderboardPage from "./pages/Leaderboard";
import LogsPage from "./pages/Logs";
import LoginPage from "./pages/Login";

interface AuthUser {
  id: number;
  username: string;
  role: string;
}

function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    apiClient.setToken("");
    onLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold text-white">TypeTiles Admin</span>
            </div>
            <div className="flex gap-6">
              <NavLink to="/dashboard" icon={<BarChart3 />} label="Dashboard" />
              <NavLink to="/users" icon={<Users />} label="Users" />
              <NavLink to="/leaderboard" icon={<Activity />} label="Leaderboard" />
              <NavLink to="/logs" icon={<Shield />} label="Logs" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={to}
      className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition font-medium"
    >
      {icon}
      {label}
    </a>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      apiClient.setToken(token);
      apiClient
        .getCurrentUser()
        .then((res) => {
          if (res.data.user.role === "admin") {
            setIsAuthenticated(true);
            setUser(res.data.user);
          } else {
            localStorage.removeItem("admin_token");
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (token: string, userData: AuthUser) => {
    if (userData.role === "admin") {
      localStorage.setItem("admin_token", token);
      apiClient.setToken(token);
      setIsAuthenticated(true);
      setUser(userData);
    } else {
      alert("You don't have admin access");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={handleLogout}>
                <DashboardPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={handleLogout}>
                <UsersPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leaderboard"
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={handleLogout}>
                <LeaderboardPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/logs"
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={handleLogout}>
                <LogsPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
