import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Play, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    setError(null);
    try {
      await demoLogin();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login as Demo User');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B0A] flex flex-col justify-center items-center px-4 py-12 selection:bg-mint-400 selection:text-slate-950">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link to="/welcome" className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#111715] border border-mint-400/30 flex items-center justify-center text-mint-400 shadow-xl shadow-mint-400/10">
            <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
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
          <span className="text-2xl font-extrabold tracking-tight text-white">Mintly</span>
        </Link>
        <p className="text-xs text-slate-400 mt-2">Sign in to manage your daily budget and savings</p>
      </div>

      {/* Card Form */}
      <div className="w-full max-w-md rounded-2xl bg-[#111715] border border-[#223029] p-6 sm:p-8 shadow-2xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <Link to="/forgot-password" tabIndex={-1} className="text-xs text-mint-400 hover:text-mint-300">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full py-3 mt-2 shadow-lg shadow-mint-400/15">
            Sign In
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1E2923]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111715] px-2 text-slate-500">Or try demo</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleDemoAccess}
          isLoading={isDemoLoading}
          className="w-full py-2.5 border-mint-400/30 hover:border-mint-400/50 gap-2"
        >
          <Play className="w-4 h-4 text-mint-400" />
          <span>One-Click Demo Access</span>
        </Button>

        <p className="text-center text-xs text-slate-400 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="text-mint-400 hover:text-mint-300 font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};
