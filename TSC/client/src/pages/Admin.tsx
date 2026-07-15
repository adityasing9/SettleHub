import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, Users, Layers, RefreshCw } from "lucide-react";

export const Admin: React.FC = () => {
  const { apiFetch } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Mock/Admin fetches (Normally these would be separate admin endpoints.
      // Since our main endpoints return user details, we gather info from our schema helpers)
      const groupsRes = await apiFetch("/groups");
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        setGroupsList(groups);
        
        // Fetch activity logs for these groups
        let aggregateLogs: any[] = [];
        for (const g of groups) {
          const lRes = await apiFetch(`/groups/${g.id}/activity`);
          if (lRes.ok) {
            const logs = await lRes.json();
            aggregateLogs = [...aggregateLogs, ...logs.map((l: any) => ({ ...l, groupName: g.name }))];
          }
        }
        setLogsList(aggregateLogs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }

      // Mock user directory representing seeded accounts
      setUsersList([
        { id: "1", name: "Aaditya", email: "aaditya@example.com", role: "ADMIN", status: "VERIFIED" },
        { id: "2", name: "Sonu", email: "sonu@example.com", role: "USER", status: "VERIFIED" },
        { id: "3", name: "Prince", email: "prince@example.com", role: "USER", status: "VERIFIED" },
        { id: "4", name: "Riyaj", email: "riyaj@example.com", role: "USER", status: "VERIFIED" },
        { id: "5", name: "Ayush", email: "ayush@example.com", role: "USER", status: "VERIFIED" },
      ]);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-primary" />
        <span className="text-sm text-gray-400">Loading system administration metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
          <Shield size={16} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Administration</h1>
          <p className="text-xs text-gray-400 mt-1">Audit active groups, review security logs, and monitor users.</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 flex gap-3 items-center">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">👤</span>
          <div>
            <h4 className="text-base font-bold text-white">{usersList.length}</h4>
            <p className="text-[10px] text-gray-500 font-medium">Registered User Profiles</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex gap-3 items-center">
          <span className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center text-sm">📁</span>
          <div>
            <h4 className="text-base font-bold text-white">{groupsList.length}</h4>
            <p className="text-[10px] text-gray-500 font-medium">Active Database Groups</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex gap-3 items-center">
          <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm">📝</span>
          <div>
            <h4 className="text-base font-bold text-white">{logsList.length}</h4>
            <p className="text-[10px] text-gray-500 font-medium">Logged System Audit Events</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Directory */}
        <div className="glass-card rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Users size={15} /> User Directory
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} className="border-t border-white/5">
                    <td className="px-3 py-2 font-bold text-white">{usr.name}</td>
                    <td className="px-3 py-2 text-gray-400">{usr.email}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        usr.role === "ADMIN" ? "bg-rose-500/10 text-rose-400" : "bg-primary/10 text-primary"
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Action audit logs */}
        <div className="glass-card rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Layers size={15} /> System Audit Logs
          </h3>
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {logsList.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No logs found.</p>
            ) : (
              logsList.map((log, index) => (
                <div key={index} className="text-xs border-b border-white/5 pb-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span className="font-semibold text-gray-300">{log.actorName}</span>
                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-400 mt-1">
                    Logged <strong>{log.action}</strong> in group <strong>{log.groupName}</strong>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
