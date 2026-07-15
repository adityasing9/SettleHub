import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { Bell, Wifi, WifiOff, LogOut, User as UserIcon, RefreshCw } from "lucide-react";

export const Header: React.FC<{ onMenuClick?: () => void }> = () => {
  const { user, logout, apiFetch } = useAuth();
  const { isOnline, pendingCount, syncData } = useOffline();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch("/dashboard/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Listen to queue event to update notifications or status
      const handleSyncQueue = () => {
        fetchNotifications();
      };
      window.addEventListener("offline_action_queued", handleSyncQueue);
      return () => window.removeEventListener("offline_action_queued", handleSyncQueue);
    }
  }, [user]);

  const handleMarkRead = async () => {
    try {
      await apiFetch("/dashboard/notifications/read", { method: "POST" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncClick = async () => {
    setSyncing(true);
    await syncData();
    setTimeout(() => setSyncing(false), 800);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="glass-panel sticky top-0 z-40 flex h-16 w-full items-center justify-between px-6">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
          <span className="h-6 w-6 rounded bg-primary flex items-center justify-center text-sm">⚡</span>
          SmartSplit <span className="text-xs text-primary font-normal bg-primary/10 px-1.5 py-0.5 rounded">PWA</span>
        </span>
      </div>

      {/* Action Indicators */}
      <div className="flex items-center gap-4">
        {/* Offline Status indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
              <Wifi size={13} />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full animate-pulse">
              <WifiOff size={13} />
              <span>Offline Cache</span>
            </div>
          )}

          {pendingCount > 0 && (
            <button
              onClick={handleSyncClick}
              disabled={syncing || !isOnline}
              className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-full cursor-pointer transition-all"
              title={isOnline ? "Click to Sync Now" : "Will sync when back online"}
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              <span>{pendingCount} Sync Queued</span>
            </button>
          )}
        </div>

        {/* Notifications Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
                if (!showNotifications && unreadCount > 0) {
                  handleMarkRead();
                }
              }}
              className="relative rounded-full bg-secondary p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl glass-card border border-white/10 p-4 shadow-xl slide-up">
                <h3 className="text-sm font-semibold text-white mb-3">Notifications</h3>
                <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 rounded-lg text-xs border ${
                          n.isRead ? "border-transparent bg-transparent" : "border-primary/20 bg-primary/5"
                        }`}
                      >
                        <div className="flex justify-between font-medium text-gray-200">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-400 mt-1">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 focus:outline-none"
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt="Avatar"
                className="h-9 w-9 rounded-full border border-white/20 bg-secondary"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl glass-card border border-white/10 p-2 shadow-xl slide-up">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
                <a
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <UserIcon size={14} />
                  My Profile
                </a>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
