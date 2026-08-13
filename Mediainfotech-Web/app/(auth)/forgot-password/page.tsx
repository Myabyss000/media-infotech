'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'NetTech Solutions';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send password reset request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-blue-950/40">
      <Link
        href="/login"
        className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition mb-6"
      >
        <ArrowLeft size={16} />
        <span>Back to Login</span>
      </Link>

      <div className="text-left mb-6">
        <h1 className="text-xl font-bold text-white">Reset Password</h1>
        <p className="text-xs text-slate-400 mt-1">
          Enter your registered work email to receive password reset instructions.
        </p>
      </div>

      {submitted ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-400" />
          <h3 className="text-sm font-bold text-white mb-1">Check Your Email</h3>
          <p className="text-xs text-slate-300">
            We sent a password reset link to <strong className="text-white">{email}</strong> if an account exists.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner message={error} />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Work Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 disabled:opacity-50 transition"
          >
            {loading ? 'Sending Request...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
}
