import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, Users, User, Settings, HelpCircle, ShieldAlert } from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Help", path: "/help", icon: HelpCircle },
  ];

  if (user?.role === "ADMIN") {
    menuItems.push({ name: "Admin Panel", path: "/admin", icon: ShieldAlert });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-white/5 min-h-[calc(100vh-4rem)] p-4 select-none">
      <nav className="flex flex-col gap-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Short quick footer */}
      <div className="pt-4 border-t border-white/5 text-[10px] text-gray-600 text-center">
        SmartSplit v1.0.0 &copy; 2026
      </div>
    </aside>
  );
};
