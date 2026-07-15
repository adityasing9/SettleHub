import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, User, Settings } from "lucide-react";

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: LayoutDashboard },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-lg border-t border-white/5 flex items-center justify-around z-40 select-none pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
              isActive ? "text-primary" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={18} className={isActive ? "scale-110" : ""} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
