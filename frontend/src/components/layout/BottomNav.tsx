import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Settings, Plus } from 'lucide-react';

interface BottomNavProps {
  onOpenAddExpense: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAddExpense }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080B0A]/95 backdrop-blur-lg border-t border-[#1E2923] px-3 py-2 flex items-center justify-around">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            isActive ? 'text-mint-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            isActive ? 'text-mint-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <PieChart className="w-5 h-5" />
        <span>Analytics</span>
      </NavLink>

      {/* Floating Center Action Button */}
      <button
        onClick={onOpenAddExpense}
        className="-mt-5 w-12 h-12 rounded-full bg-mint-400 hover:bg-mint-500 text-slate-950 flex items-center justify-center shadow-lg shadow-mint-400/30 transition-transform active:scale-95 border-2 border-[#080B0A]"
        aria-label="Add expense"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <NavLink
        to="/transactions"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            isActive ? 'text-mint-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <Receipt className="w-5 h-5" />
        <span>History</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            isActive ? 'text-mint-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
};
