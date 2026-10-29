import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the terms and conditions.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
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
        <p className="text-xs text-slate-400 mt-2">Start your journey to daily financial control</p>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-[#111715] border border-[#223029] p-6 sm:p-8 shadow-2xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
              />
            </div>
          </div>

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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="rounded bg-[#080B0A] border-[#223029] text-mint-400 focus:ring-mint-400 h-4 w-4"
            />
            <label htmlFor="terms" className="text-xs text-slate-400">
              I agree to the <span className="text-slate-300">Terms of Service</span> and{' '}
              <span className="text-slate-300">Privacy Policy</span>
            </label>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full py-3 mt-4 shadow-lg shadow-mint-400/15">
            Create Account & Continue
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-mint-400 hover:text-mint-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
