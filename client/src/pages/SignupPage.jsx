import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UtensilsCrossed, Lock, Mail, User, Store, ArrowRight, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await signup({
        name: formData.name,
        email: formData.email,
        businessName: formData.businessName || 'Home-Style Tiffin',
        password: formData.password
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-radial from-amber-50/50 via-warm-50 to-warm-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-saffron-200/40 via-terracotta-200/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-terracotta-600 to-saffron-500 text-white shadow-elevated mb-4 animate-in zoom-in-95">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-warm-900 font-display tracking-tight">
          Register Your Tiffin Service
        </h1>
        <p className="mt-2 text-sm text-warm-600 max-w-xs mx-auto">
          Create an owner account to start tracking subscriptions, managing pause schedules, and pro-rating bills.
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
                Owner Name *
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Sunita Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Kitchen / Business Name (Optional)
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Annapurna Tiffin Express"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Owner Email *
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="sunita@tiffin.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                  Password *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-warm-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                  Confirm *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-warm-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-sm shadow-soft transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create Owner Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-warm-600">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-terracotta-600 hover:text-terracotta-700 underline underline-offset-2">
              Sign in to your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
