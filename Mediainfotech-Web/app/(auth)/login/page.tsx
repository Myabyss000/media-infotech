'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Lock, User, KeyRound, ArrowRight } from 'lucide-react';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'NetTech Solutions';
  const companyTagline = process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Internal Management Portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { accessToken, user } = res.data;
      login(accessToken, user);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status >= 500) {
        setError('Internal server error during login. Please try again later.');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
        setError('Internal server error: Unable to connect to server');
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-blue-950/40">
      {/* Company Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 p-2.5 shadow-xl shadow-blue-500/10 mb-4">
          <img src="/Icon.png" alt={companyName} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{companyName}</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">{companyTagline}</p>
      </div>

      {/* Error Alert */}
      <AlertBanner message={error} className="mb-6" />

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Username or Email
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or employee@company.com"
              className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 focus:outline-none disabled:opacity-50 transition flex items-center justify-center space-x-2 mt-6"
        >
          {submitting ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Demo helper */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Default Admin Creds: <span className="font-mono text-slate-300">admin</span> /{' '}
        <span className="font-mono text-slate-300">Admin@123456</span>
      </div>
    </div>
  );
}
