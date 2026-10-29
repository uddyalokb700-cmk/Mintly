import React from 'react';
import { Bell, Sun, Moon, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getGreeting } from '../../utils/formatters';
import { Button } from '../ui/Button';

interface NavbarProps {
  onOpenAddExpense: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddExpense }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, openDrawer } = useNotifications();

  const { greeting, iconEmoji } = getGreeting(user?.name);
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-[#080B0A]/80 backdrop-blur-md border-b border-[#1E2923]">
      {/* Greeting & Date */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>{greeting}</span>
          <span>{iconEmoji}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{todayFormatted}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Expense button for Desktop */}
        <Button
          size="sm"
          onClick={onOpenAddExpense}
          className="hidden sm:inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#151D19] border border-transparent hover:border-[#223029] transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={openDrawer}
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#151D19] border border-transparent hover:border-[#223029] transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-400"></span>
            </span>
          )}
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1E2923]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mint-500/20 to-teal-400/20 border border-mint-400/40 flex items-center justify-center font-bold text-xs text-mint-400">
            {user?.name ? user.name[0].toUpperCase() : 'M'}
          </div>
        </div>
      </div>
    </header>
  );
};
