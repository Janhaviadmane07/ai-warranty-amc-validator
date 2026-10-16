import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@warrantyiq.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Authentication failed');
      }

      const data = await res.json();
      localStorage.setItem('warrantyiq_token', data.access_token);
      localStorage.setItem('warrantyiq_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-950 p-6 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center font-bold text-base tracking-wider text-white">
              IQ
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">WarrantyIQ</h1>
              <p className="text-xs text-slate-400">Enterprise Asset & Contract Validation Platform</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Decision-support system for hardware warranties, invoices, and AMC compliance.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corporate Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500 mb-2">Preset Demo Profiles:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRole('admin@warrantyiq.com', 'Admin@123')}
                className="px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickRole('manager@warrantyiq.com', 'Manager@123')}
                className="px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 transition"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickRole('user@warrantyiq.com', 'User@123')}
                className="px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-700 font-medium transition"
              >
                User
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Automated validation engine is for decision-support only.
        </div>
      </div>
    </div>
  );
}
