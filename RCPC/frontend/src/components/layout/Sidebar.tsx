import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  MousePointer,
  Network,
  FolderOpen,
  Layers,
  History,
  Settings as SettingsIcon,
  Laptop
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, setIsSettingsModalOpen } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'control', label: 'Control & Media', icon: Sliders },
    { id: 'input', label: 'Touchpad & Keys', icon: MousePointer },
    { id: 'network', label: 'Network & Hotspot', icon: Network },
    { id: 'files', label: 'Sandboxed Files', icon: FolderOpen },
    { id: 'apps', label: 'Applications', icon: Layers },
    { id: 'activity', label: 'Activity Logs', icon: History },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-dark-800 bg-dark-950 p-4 shrink-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
          <Laptop className="w-6 h-6" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white block">RCPC</span>
          <span className="text-xs text-slate-400 font-mono">Control Center</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-primary text-dark-950 font-semibold shadow-lg shadow-brand-primary/20'
                  : 'text-slate-300 hover:text-white hover:bg-dark-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-dark-800">
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-dark-900 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
