import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { apiClient } from "../api";

interface AdminLog {
  id: number;
  admin_id: number;
  action: string;
  target_user_id: number | null;
  details: string;
  created_at: string;
  admin_username: string;
  target_username: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await apiClient.getAdminLogs(100, 0);
      setLogs(response.data.logs);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "ban_user":
        return "text-red-400 bg-red-900/20";
      case "unban_user":
        return "text-green-400 bg-green-900/20";
      case "update_tier":
        return "text-blue-400 bg-blue-900/20";
      case "reset_stats":
        return "text-yellow-400 bg-yellow-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const formatAction = (action: string) => {
    return action.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <Activity className="w-8 h-8" />
        Admin Activity Logs
      </h1>

      {isLoading ? (
        <div className="text-gray-400">Loading logs...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="text-left py-3 px-4 text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 text-gray-300">Admin</th>
                  <th className="text-left py-3 px-4 text-gray-300">Action</th>
                  <th className="text-left py-3 px-4 text-gray-300">Target</th>
                  <th className="text-left py-3 px-4 text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{log.admin_username}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {log.target_username ? (
                        <span className="text-blue-400 font-medium">{log.target_username}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{log.details || "—"}</td>
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
