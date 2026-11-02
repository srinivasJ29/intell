import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Files,
  Scale,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/workspaces', label: 'Workspaces', icon: FolderKanban },
    { to: '/documents', label: 'Documents', icon: Files },
    { to: '/comparisons', label: 'Comparisons', icon: Scale },
    { to: '/reports', label: 'Research Reports', icon: FileText },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`h-screen bg-mono-white border-r border-mono-border flex flex-col justify-between transition-all duration-300 relative select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-mono-border">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-mono-deepblack flex items-center justify-center text-mono-white font-mono font-bold text-sm tracking-wider shadow-subtle">
                IR
              </div>
              <span className="font-heading font-bold text-base text-mono-deepblack tracking-tight">
                IntelliResearch
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded bg-mono-deepblack flex items-center justify-center text-mono-white font-mono font-bold text-sm shadow-subtle">
              IR
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-mono-deepblack text-mono-white shadow-subtle'
                      : 'text-mono-dark hover:text-mono-deepblack hover:bg-mono-light'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-mono-border bg-mono-offwhite">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-mono-light border border-mono-border flex items-center justify-center text-mono-dark font-mono text-xs font-semibold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-mono-deepblack truncate">
                  {user?.full_name || user?.email}
                </span>
                <span className="text-[10px] text-mono-medium truncate font-mono">
                  {user?.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded text-mono-dark hover:text-red-700 hover:bg-mono-light transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full p-2 flex items-center justify-center rounded text-mono-dark hover:text-red-700 hover:bg-mono-light transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};

