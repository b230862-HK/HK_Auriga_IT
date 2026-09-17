import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UtensilsCrossed, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('owner@tiffin.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('owner@tiffin.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-radial from-amber-50/50 via-warm-50 to-warm-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-saffron-200/40 via-terracotta-200/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-terracotta-600 to-saffron-500 text-white shadow-elevated mb-4 animate-in zoom-in-95">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-warm-900 font-display tracking-tight">
          Welcome to TiffinFlow
        </h1>
        <p className="mt-2 text-sm text-warm-600 max-w-xs mx-auto">
          Sign in to your kitchen dashboard to manage customer subscriptions, pauses, and pro-rated billing.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-elevated rounded-3xl border border-warm-200/80 backdrop-blur-sm">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Owner Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@tiffin.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-sm shadow-soft transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo credential helper badge */}
          <div className="mt-6 pt-5 border-t border-warm-100 flex items-center justify-between text-xs">
            <span className="text-warm-500">Need demo login?</span>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="inline-flex items-center gap-1 font-semibold text-saffron-700 hover:text-saffron-800 bg-saffron-50 hover:bg-saffron-100 px-2.5 py-1 rounded-lg border border-saffron-200/80 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Seed Owner</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-warm-600">
            Don't have an owner account?{' '}
            <Link to="/signup" className="font-bold text-terracotta-600 hover:text-terracotta-700 underline underline-offset-2">
              Register your kitchen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
