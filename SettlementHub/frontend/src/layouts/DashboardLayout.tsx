import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Folder,
  CreditCard,
  FileText,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Bell,
  Plus,
  Menu,
  X,
  Search,
  CloudOff,
  PiggyBank
} from 'lucide-react';

interface SearchResult {
  people: any[];
  transactions: any[];
  expenses: any[];
  groups: any[];
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'People', path: '/people', icon: Users },
    { name: 'Pair Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Groups', path: '/groups', icon: Folder },
    { name: 'Expenses', path: '/expenses', icon: CreditCard },
    { name: 'Budgets', path: '/budgets', icon: PiggyBank },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'AI Insights', path: '/ai', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    fetchNotifications();
    checkOfflineQueue();
    
    const interval = setInterval(fetchNotifications, 10000); // Poll notifications
    
    // Listen to custom offline queue events
    const handleQueueChange = (e: Event) => {
      setOfflineQueueCount((e as CustomEvent).detail || 0);
    };
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, []);

  const checkOfflineQueue = () => {
    const queue = JSON.parse(localStorage.getItem('sh_offline_queue') || '[]');
    setOfflineQueueCount(queue.length);
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/settings/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/settings/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/search/?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
      setIsSearchOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors duration-300">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/50 p-4 fixed h-full z-20">
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-none tracking-tight">SETTLEMENT</h1>
            <span className="text-xs text-slate-400 font-semibold tracking-wider">HUB</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-extrabold text-base tracking-tight">SettlementHub</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-950" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-950 h-full p-4 border-r border-slate-200 dark:border-slate-800 shadow-xl pt-20">
            <div className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* CONTENT WRAPPER */}
      <div className="flex-1 md:pl-64 flex flex-col">
        {/* DESKTOP HEADER */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md sticky top-0 z-10">
          {/* Global Smart Search */}
          <form onSubmit={handleSearch} className="relative w-80 flex items-center">
            <Search className="absolute left-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search people, tags, transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
            />
          </form>

          <div className="flex items-center gap-4">
            {/* Offline sync queue alert */}
            {offlineQueueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600/10 text-orange-600 text-xs font-bold animate-pulse">
                <CloudOff size={14} />
                <span>{offlineQueueCount} queued offline</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-bold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${n.is_read ? 'opacity-60 bg-transparent' : 'bg-indigo-50/50 dark:bg-indigo-950/20'}`}
                        >
                          <div className="font-bold mb-0.5 text-slate-800 dark:text-slate-200">{n.title}</div>
                          <div className="text-slate-500 dark:text-slate-400">{n.message}</div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="text-center py-4 text-slate-400">No new notifications</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              {user?.username ? user.username[0].toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-grow p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* SEARCH MODAL */}
      {isSearchOpen && searchResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-4xl h-[80vh] bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 flex flex-col space-y-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h2 className="text-xl font-bold">Search Results: "{searchQuery}"</h2>
              <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* People matches */}
              {searchResults.people.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">People</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.people.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/ledger?personId=${p.id}`);
                        }}
                        className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-colors"
                      >
                        <h4 className="font-bold text-xs">{p.name}</h4>
                        <span className="text-[10px] text-slate-400">{p.email || 'No email'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions matches */}
              {searchResults.transactions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transactions</h3>
                  <div className="space-y-2">
                    {searchResults.transactions.map(t => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800 rounded-2xl"
                      >
                        <div>
                          <h4 className="font-bold text-xs">{t.description}</h4>
                          <span className="text-[10px] text-slate-400">{t.from_person_name} → {t.to_person_name} • {t.date}</span>
                        </div>
                        <span className="font-black text-xs">₹{t.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses matches */}
              {searchResults.expenses.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</h3>
                  <div className="space-y-2">
                    {searchResults.expenses.map(e => (
                      <div
                        key={e.id}
                        className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800 rounded-2xl"
                      >
                        <div>
                          <h4 className="font-bold text-xs">{e.description}</h4>
                          <span className="text-[10px] text-slate-400">Store: {e.merchant || 'Unknown'} • {e.date}</span>
                        </div>
                        <span className="font-black text-xs">₹{e.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group matches */}
              {searchResults.groups.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Groups</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.groups.map(g => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/groups`);
                        }}
                        className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-colors"
                      >
                        <h4 className="font-bold text-xs">{g.name}</h4>
                        <span className="text-[10px] text-slate-400">{g.description || 'No description'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.people.length === 0 &&
               searchResults.transactions.length === 0 &&
               searchResults.expenses.length === 0 &&
               searchResults.groups.length === 0 && (
                 <div className="text-center py-12 text-slate-400 text-xs">No matching results found in the database.</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => navigate('/expenses')}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 z-40 group"
        title="Add Expense / Transaction"
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

    </div>
  );
};
