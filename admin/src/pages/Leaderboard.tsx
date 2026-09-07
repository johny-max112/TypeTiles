import { useState, useEffect } from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { apiClient } from "../api";

interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  tier: string;
  total_score: number;
  best_wpm: number;
  avg_accuracy: number;
  games_played: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tier, setTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, [tier]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      if (tier) {
        const response = await apiClient.getLeaderboardByTier(tier, 100);
        setLeaderboard(response.data.leaderboard);
      } else {
        const response = await apiClient.getLeaderboard(100, 0);
        setLeaderboard(response.data.leaderboard);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setTier(null)}
            className={`px-4 py-2 rounded transition ${
              tier === null ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            All Time
          </button>
          {["Volt", "Cipher", "Nova"].map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-4 py-2 rounded transition ${
                tier === t ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading leaderboard...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="text-left py-3 px-4 text-gray-300">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-300">Player</th>
                  <th className="text-left py-3 px-4 text-gray-300">Tier</th>
                  <th className="text-left py-3 px-4 text-gray-300">Score</th>
                  <th className="text-left py-3 px-4 text-gray-300">Best WPM</th>
                  <th className="text-left py-3 px-4 text-gray-300">Accuracy</th>
                  <th className="text-left py-3 px-4 text-gray-300">Games</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="w-5 h-5 text-yellow-400" />}
                        {idx === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                        {idx === 2 && <Trophy className="w-5 h-5 text-orange-600" />}
                        <span className="font-bold text-white">#{idx + 1}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{entry.display_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 rounded text-xs">
                        {entry.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-bold flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {entry.total_score.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-green-400">{entry.best_wpm}</td>
                    <td className="py-3 px-4 text-yellow-400">{(entry.avg_accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-gray-400">{entry.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
