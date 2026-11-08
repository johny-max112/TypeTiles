import { useState, useEffect } from "react";
import { Ban, Unlock, RotateCcw, Shield, Search } from "lucide-react";
import { apiClient } from "../api";

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  tier: string;
  role: "student" | "teacher" | "admin";
  is_banned: number;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getAllUsers(50, 0, search || undefined);
      setUsers(response.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: number) => {
    if (!confirm("Are you sure you want to ban this user?")) return;

    try {
      await apiClient.banUser(userId, "Banned by admin");
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_banned: 1 } : u)));
      alert("User banned successfully");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      await apiClient.unbanUser(userId);
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_banned: 0 } : u)));
      alert("User unbanned successfully");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to unban user");
    }
  };

  const handleUpdateTier = async (userId: number, tier: string) => {
    try {
      setFeedback("");
      await apiClient.updateUserTier(userId, tier);
      setUsers(users.map((u) => (u.id === userId ? { ...u, tier } : u)));
      setShowModal(false);
      alert("User tier updated successfully");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update tier");
    }
  };

  const handleResetStats = async (userId: number) => {
    if (!confirm("Are you sure you want to reset this user's stats?")) return;

    try {
      setFeedback("");
      await apiClient.resetUserStats(userId);
      alert("User stats reset successfully");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to reset stats");
    }
  };

  const handleUpdateRole = async (user: User) => {
    if (user.role === "admin") return;

    const nextRole = user.role === "teacher" ? "student" : "teacher";
    if (!confirm(`Change ${user.display_name}'s role to ${nextRole}?`)) return;

    try {
      setFeedback("");
      await apiClient.updateUserRole(user.id, nextRole);
      await loadUsers();
      setFeedback(`${user.display_name} is now a ${nextRole}.`);
    } catch (err: any) {
      setFeedback(err.response?.data?.error || "Failed to update user role");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === "admin" || deletingId !== null) return;
    if (prompt(`Permanently delete ${user.display_name} (${user.email})? This removes their scores, history, feedback and verification data. Their hosted classroom will close. Shared matches remain. Type their username "${user.username}" to confirm.`) !== user.username) return;
    setDeletingId(user.id);
    setFeedback("");
    try {
      const response = await apiClient.deleteUser(user.id);
      setUsers(current => current.filter(item => item.id !== user.id));
      setFeedback(response.data.message);
    } catch (err: any) {
      setFeedback(err.response?.data?.error || "Failed to delete user");
    } finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">User Management</h1>
        {feedback ? <div className="mb-4 rounded border border-blue-700 bg-blue-900/20 p-3 text-sm text-blue-200">{feedback}</div> : null}

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading users...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="text-left py-3 px-4 text-gray-300">Username</th>
                  <th className="text-left py-3 px-4 text-gray-300">Email</th>
                  <th className="text-left py-3 px-4 text-gray-300">Tier</th>
                  <th className="text-left py-3 px-4 text-gray-300">Role</th>
                  <th className="text-left py-3 px-4 text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300">Joined</th>
                  <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-white font-medium">{user.display_name}</td>
                    <td className="py-3 px-4 text-gray-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 rounded text-xs">
                        {user.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-700 border border-gray-600 text-gray-200 rounded text-xs">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.is_banned ? (
                        <span className="px-2 py-1 bg-red-900/30 border border-red-700 text-red-300 rounded text-xs">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-900/30 border border-green-700 text-green-300 rounded text-xs">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                          }}
                          title="Change tier"
                          className="p-1 hover:bg-blue-900/50 text-blue-400 rounded transition"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {user.is_banned ? (
                          <button
                            onClick={() => handleUnbanUser(user.id)}
                            title="Unban user"
                            className="p-1 hover:bg-green-900/50 text-green-400 rounded transition"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(user.id)}
                            title="Ban user"
                            className="p-1 hover:bg-red-900/50 text-red-400 rounded transition"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetStats(user.id)}
                          title="Reset stats"
                          className="p-1 hover:bg-yellow-900/50 text-yellow-400 rounded transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {user.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingId !== null}
                            className="rounded border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                          >
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                        {user.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateRole(user)}
                            title={user.role === "teacher" ? "Revoke teacher role" : "Assign teacher role"}
                            className="rounded border border-purple-700 px-2 py-1 text-xs text-purple-300 hover:bg-purple-900/50"
                          >
                            {user.role === "teacher" ? "Student" : "Teacher"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tier Change Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">Change User Tier</h2>
            <p className="text-gray-400 mb-4">{selectedUser.display_name}</p>
            <div className="space-y-2 mb-4">
              {["Volt", "Cipher", "Nova"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => handleUpdateTier(selectedUser.id, tier)}
                  className={`w-full py-2 px-4 rounded transition ${
                    selectedUser.tier === tier
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 px-4 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
