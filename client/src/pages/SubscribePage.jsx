import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { planService, customerService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  UserPlus,
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  ArrowLeft
} from 'lucide-react';

export default function SubscribePage() {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    planId: '',
    subscriptionStartDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const data = await planService.getPlans();
        if (data.success && data.plans.length > 0) {
          setPlans(data.plans);
          setFormData((prev) => ({ ...prev, planId: data.plans[0]._id }));
        }
      } catch (err) {
        setError('Failed to fetch subscription plans');
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone || !formData.planId) {
      setError('Name, phone number, and subscription plan are required.');
      return;
    }

    // Validate phone digits
    const cleanDigits = formData.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(cleanDigits)) {
      setError('Please provide a valid 7-15 digit phone number.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await customerService.createCustomer({
        name: formData.name,
        phone: cleanDigits,
        address: formData.address,
        planId: formData.planId,
        subscriptionStartDate: formData.subscriptionStartDate
      });

      showToast(`Subscriber ${formData.name} successfully registered!`, 'success');
      navigate(`/search?phone=${encodeURIComponent(cleanDigits)}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to subscribe customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-500 hover:text-warm-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight font-display">
            Onboard New Subscriber
          </h1>
          <p className="text-sm text-warm-600 mt-1">
            Register customer phone number, choose a lunch delivery plan, and establish the subscription start date.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-warm-200/80 shadow-soft p-6 sm:p-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Customer Full Name *
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
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                Phone Number (Primary Lookup Key) *
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>
              <p className="text-[11px] text-warm-500 mt-1">Must be unique across all active/paused subscribers.</p>
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
              Delivery Address (Office or Residence)
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute top-3 left-3.5 pointer-events-none text-warm-400">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Flat 402, Building 7, Mindspace Cybercity, Tech Zone"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25 resize-none"
              />
            </div>
          </div>

          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-2">
              Select Monthly Tiffin Plan *
            </label>

            {loadingPlans ? (
              <div className="p-6 border border-warm-200 rounded-2xl flex items-center justify-center text-warm-500 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading available plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {plans.map((p) => {
                  const isSelected = formData.planId === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setFormData((prev) => ({ ...prev, planId: p._id }))}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-terracotta-500 bg-terracotta-50/60 shadow-soft'
                          : 'border-warm-200 bg-warm-25 hover:border-warm-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-warm-700">
                          {p.name}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-terracotta-600" />}
                      </div>
                      <p className="text-xl font-extrabold text-warm-900 font-display">
                        ₹{p.price.toLocaleString()}
                        <span className="text-xs font-normal text-warm-500"> / mo</span>
                      </p>
                      {p.description && (
                        <p className="text-[11px] text-warm-600 mt-2 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subscription Start Date */}
          <div className="max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
              Subscription Start Date *
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                name="subscriptionStartDate"
                required
                value={formData.subscriptionStartDate}
                onChange={handleChange}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
              />
            </div>
            <p className="text-[11px] text-warm-500 mt-1">
              Mid-month starts will be pro-rated from this date forward.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-warm-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-sm shadow-soft transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Subscribe Customer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
