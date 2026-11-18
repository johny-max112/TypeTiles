import { useState, useEffect } from "react";
import { Users, Gamepad2, TrendingUp, Ban, RefreshCw } from "lucide-react";
import { apiClient } from "../api";

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  recentPlayers: number;
  completedMatches: number;
  cancelledMatches: number;
  generatedAt: string;
  bannedUsers: number;
  topPlayers: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await apiClient.getAdminStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load stats");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          {stats && <p className="mt-2 text-sm text-gray-400">Last updated: {new Date(stats.generatedAt).toLocaleString()}</p>}
        </div>
        <button type="button" onClick={loadStats} disabled={refreshing} className="flex items-center gap-2 rounded border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />{refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <p role="alert" className="text-red-400">{error}{stats ? " Showing the last loaded data." : " Use Refresh to retry."}</p>}
      {stats && <>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-8 h-8" />}
          title="Total Users"
          value={stats?.totalUsers || 0}
          color="blue"
        />
        <StatCard
          icon={<Gamepad2 className="w-8 h-8" />}
          title="Total Matches"
          value={stats?.totalMatches || 0}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          title="Players in matches (24h)"
          value={stats.recentPlayers}
          color="purple"
        />
        <StatCard
          icon={<Ban className="w-8 h-8" />}
          title="Banned Users"
          value={stats?.bannedUsers || 0}
          color="red"
        />
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <p>24h counts unique non-banned users participating in matches created in the last 24 hours. This is not an online count.</p>
        <p>Total matches includes all saved statuses. Completed: {stats.completedMatches.toLocaleString()} · Cancelled: {stats.cancelledMatches.toLocaleString()}. Status totals reflect saved records; older Solo matches may still be marked active.</p>
      </div>

      {/* Top Players */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-2">Solo leaderboard</h2>
        <p className="mb-4 text-sm text-gray-400">Top 10 by saved total Solo score. Classroom results are reported separately.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400">Player</th>
                <th className="text-left py-2 px-4 text-gray-400">Score</th>
                <th className="text-left py-2 px-4 text-gray-400">Best WPM</th>
                <th className="text-left py-2 px-4 text-gray-400">Average accuracy</th>
                <th className="text-left py-2 px-4 text-gray-400">Games</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPlayers.map((player: any) => (
                <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-white">{player.display_name || player.username}</td>
                  <td className="py-3 px-4 text-blue-400">{player.total_score.toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-400">{Number.isFinite(player.best_wpm) && player.best_wpm >= 0 ? player.best_wpm.toFixed(1) : "—"}</td>
                  <td className="py-3 px-4 text-yellow-400">{Number.isFinite(player.avg_accuracy) && player.avg_accuracy >= 0 && player.avg_accuracy <= 100 ? `${player.avg_accuracy.toFixed(1)}%` : "—"}</td>
                  <td className="py-3 px-4 text-gray-300">{player.games_played}</td>
                </tr>
              ))}
              {stats.topPlayers.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No Solo results yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-900/20 border-blue-700 text-blue-400",
    green: "bg-green-900/20 border-green-700 text-green-400",
    purple: "bg-purple-900/20 border-purple-700 text-purple-400",
    red: "bg-red-900/20 border-red-700 text-red-400",
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );
}
