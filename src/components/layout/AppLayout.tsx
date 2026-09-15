import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Users, UserPlus, BarChart3, Settings, Plus } from 'lucide-react';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from './OfflineBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenAddTransaction: () => void;
  onSearch?: (query: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onOpenAddTransaction,
  onSearch
}) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/transactions', label: 'Transactions', icon: Receipt },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/groups', label: 'Groups', icon: UserPlus },
    { to: '/statistics', label: 'Statistics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <OfflineBanner />
      <Header onOpenAddTransaction={onOpenAddTransaction} onSearch={onSearch} />

      <div className="flex-1 max-w-6xl w-full mx-auto flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 p-4 shrink-0 space-y-6">
          <div className="space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onOpenAddTransaction}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      <MobileBottomNav onOpenAddTransaction={onOpenAddTransaction} />
    </div>
  );
};
