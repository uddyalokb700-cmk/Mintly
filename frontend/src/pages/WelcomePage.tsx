import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, Clock, TrendingUp, CheckCircle2, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    try {
      await demoLogin();
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to start demo mode');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B0A] text-slate-100 flex flex-col justify-between selection:bg-mint-400 selection:text-slate-950">
      {/* Navigation Bar */}
      <header className="px-6 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#111715] border border-mint-400/30 flex items-center justify-center text-mint-400 shadow-lg shadow-mint-400/10">
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
            <span className="text-xl font-extrabold tracking-tight text-white">Mintly</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
              Personal Finance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            Sign In
          </Link>
          <Button onClick={() => navigate('/register')} size="sm">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-12 max-w-7xl w-full mx-auto flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-400/10 border border-mint-400/20 text-mint-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Ready Daily Budget Management</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Know how much you can spend <span className="text-mint-400">today</span> without losing control.
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Enter your monthly income and savings target. Mintly calculates your exact daily spending allowance,
            tracks every transaction in real-time, and sends a personalized morning greeting.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 gap-2 shadow-lg shadow-mint-400/20"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={handleDemoAccess}
              isLoading={isDemoLoading}
              className="w-full sm:w-auto px-6 gap-2 border-mint-400/30 hover:border-mint-400/60"
            >
              <Play className="w-4 h-4 text-mint-400" />
              <span>Try Live Demo</span>
            </Button>
          </div>

          {/* Social Proof / Pillars */}
          <div className="pt-8 grid grid-cols-3 gap-4 border-t border-[#1E2923] text-left">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">Authoritative Decimal Math</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-mint-400 tabular-nums">8:00 AM</p>
              <p className="text-xs text-slate-400 mt-0.5">Morning Push Greeting</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">₹0 Leak</p>
              <p className="text-xs text-slate-400 mt-0.5">Paise Reconciled</p>
            </div>
          </div>
        </div>

        {/* Hero Interactive Card Preview */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg">
          <div className="rounded-3xl bg-[#111715] border border-[#223029] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-mint-400/5 rounded-full blur-3xl pointer-events-none" />

            {/* Greeting Pill */}
            <div className="p-3.5 mb-5 rounded-2xl bg-[#151D19] border border-[#1E2923] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">☀️</span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Good morning, Alex!</h4>
                  <p className="text-[11px] text-slate-400">Today's allowance is ready</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-mint-400 bg-mint-400/10 px-2.5 py-1 rounded-full border border-mint-400/20">
                8:00 AM Alert
              </span>
            </div>

            {/* Hero Daily Allowance */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#151D19] to-[#0D1311] border border-[#223029] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Daily Spending Allowance
                </span>
                <span className="text-xs font-semibold text-mint-400 bg-mint-400/10 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div>
                <p className="text-4xl font-extrabold text-white tabular-nums tracking-tight">₹800.00</p>
                <p className="text-xs text-slate-400 mt-1">
                  Spent Today: <span className="text-slate-200 font-semibold">₹200.00</span> • Remaining:{' '}
                  <span className="text-mint-400 font-semibold">₹600.00</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-[#1E2923] rounded-full overflow-hidden">
                  <div className="h-full bg-mint-400 rounded-full" style={{ width: '25%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>25% Used</span>
                  <span>₹600.00 Left</span>
                </div>
              </div>
            </div>

            {/* Monthly mini breakdown */}
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-[#151D19] border border-[#1E2923]">
                <p className="text-slate-400">Monthly Spendable</p>
                <p className="text-sm font-bold text-white mt-1 tabular-nums">₹24,000.00</p>
              </div>
              <div className="p-3 rounded-xl bg-[#151D19] border border-[#1E2923]">
                <p className="text-slate-400">Savings Target</p>
                <p className="text-sm font-bold text-teal-400 mt-1 tabular-nums">₹6,000.00</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-[#1E2923] text-center text-xs text-slate-400 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 Mintly. Plan. Track. Save. Live Better.</p>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-slate-200">
            Sign In
          </Link>
          <Link to="/register" className="hover:text-slate-200">
            Register
          </Link>
          <span className="text-slate-500">•</span>
          <span>Web Push VAPID Enabled</span>
        </div>
      </footer>
    </div>
  );
};
