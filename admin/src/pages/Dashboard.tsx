import { useState, useEffect } from "react";
import { Users, Gamepad2, TrendingUp, Ban } from "lucide-react";
import { apiClient } from "../api";

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  activePlayers: number;
  bannedUsers: number;
  topPlayers: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.getAdminStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

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
          title="Active Players"
          value={stats?.activePlayers || 0}
          color="purple"
        />
        <StatCard
          icon={<Ban className="w-8 h-8" />}
          title="Banned Users"
          value={stats?.bannedUsers || 0}
          color="red"
        />
      </div>

      {/* Top Players */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Top Players</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400">Username</th>
                <th className="text-left py-2 px-4 text-gray-400">Score</th>
                <th className="text-left py-2 px-4 text-gray-400">Best WPM</th>
                <th className="text-left py-2 px-4 text-gray-400">Accuracy</th>
                <th className="text-left py-2 px-4 text-gray-400">Games</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topPlayers.map((player: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-white">{player.display_name || player.username}</td>
                  <td className="py-3 px-4 text-blue-400">{player.total_score.toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-400">{player.best_wpm}</td>
                  <td className="py-3 px-4 text-yellow-400">{(player.avg_accuracy * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-gray-300">{player.games_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
