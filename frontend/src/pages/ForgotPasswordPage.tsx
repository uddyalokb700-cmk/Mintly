import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.post<{ message: string; reset_token?: string }>('/auth/password-reset/', {
        email,
      });
      setMessage(res.message);
      if (res.reset_token) {
        setToken(res.reset_token);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request reset token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/password-reset/confirm/', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      alert('Password reset successful. You can now login with your new password.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B0A] flex flex-col justify-center items-center px-4 py-12 selection:bg-mint-400 selection:text-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-[#111715] border border-[#223029] p-6 sm:p-8 shadow-2xl space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>

        <div>
          <h2 className="text-xl font-bold text-slate-100">Reset your password</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1
              ? "Enter your email address and we'll send a password recovery token."
              : 'Enter your reset token and new password.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-mint-400/10 border border-mint-400/30 text-mint-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
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

            <Button type="submit" isLoading={isLoading} className="w-full py-3 shadow-lg shadow-mint-400/15">
              Send Reset Token
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Reset Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token here"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-mint-400 transition-colors"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-3 shadow-lg shadow-mint-400/15">
              Confirm & Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
