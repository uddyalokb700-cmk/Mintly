import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Sliders,
  Settings,
  LogOut,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface SidebarProps {
  onOpenAddExpense: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddExpense }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Transactions', icon: Receipt, path: '/transactions' },
    { label: 'Analytics', icon: PieChart, path: '/analytics' },
    { label: 'Budget Plan', icon: Sliders, path: '/budget' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  const isDemo = user?.email === 'demo@mintly.app';

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#080B0A] border-r border-[#1E2923] p-5 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-[#111715] border border-mint-400/30 flex items-center justify-center text-mint-400 shadow-md shadow-mint-400/10">
          <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
            <path
              d="M12 34V18L24 28L36 18V34"
              stroke="#35E6A0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="14" r="3" fill="#35E6A0" />
          </svg>
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
            Mintly
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-mint-400/10 text-mint-400 border border-mint-400/20">
              Pro
            </span>
          </span>
          <p className="text-[10px] text-slate-400 tracking-wide font-medium">Daily Budget Mastery</p>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="mb-6">
        <Button
          onClick={onOpenAddExpense}
          className="w-full justify-center gap-2 py-3 shadow-md shadow-mint-400/15"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-mint-400/10 text-mint-400 border border-mint-400/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#111715]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Demo Badge if applicable */}
      {isDemo && (
        <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-amber-300">Live Demo Mode</p>
            <p className="text-[10px] text-slate-400">Sample budget & data</p>
          </div>
        </div>
      )}

      {/* User profile & Logout */}
      <div className="pt-4 border-t border-[#1E2923] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#151D19] border border-[#223029] flex items-center justify-center text-xs font-bold text-mint-400 shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'M'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
