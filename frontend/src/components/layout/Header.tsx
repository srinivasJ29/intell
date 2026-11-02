import React from 'react';
import { Search, Bell, Command, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-mono-white border-b border-mono-border px-6 flex items-center justify-between">
      <div>
        {title ? (
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-heading text-lg font-bold text-mono-deepblack tracking-tight">
              {title}
            </h1>
            {subtitle && <span className="text-xs text-mono-medium">{subtitle}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-mono-medium uppercase tracking-wider">
              Workspace Scope:
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-mono-light border border-mono-border text-mono-deepblack">
              All Literature
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Global Search Bar */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-mono-medium pointer-events-none" />
          <input
            type="text"
            placeholder="Search papers, evidence, queries..."
            className="w-64 pl-8 pr-12 py-1.5 text-xs bg-mono-offwhite border border-mono-border rounded-md text-mono-deepblack placeholder:text-mono-medium focus:outline-none focus:ring-1 focus:ring-mono-black focus:border-mono-black focus:w-80 transition-all duration-200"
          />
          <div className="absolute right-2 flex items-center gap-0.5 px-1 py-0.5 rounded border border-mono-border bg-mono-white text-[10px] text-mono-medium font-mono">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>

        {/* System Health / Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-mono-border bg-mono-offwhite text-[11px] font-mono text-mono-dark">
          <span className="w-1.5 h-1.5 rounded-full bg-mono-black animate-pulse" />
          <span>RAG Active</span>
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-md text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-mono-black" />
        </button>
      </div>
    </header>
  );
};

