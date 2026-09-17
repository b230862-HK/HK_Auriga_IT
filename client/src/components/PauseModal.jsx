import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, PlayCircle, PauseCircle, Loader2 } from 'lucide-react';
import { customerService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function PauseModal({ customer, isOpen, onClose, onSuccess }) {
  const { showToast } = useAuth();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !customer) return null;

  const isAlreadyPaused = customer.status === 'paused';

  const handlePause = async (e) => {
    e.preventDefault();
    setError('');

    if (!startDate) {
      setError('Start date is required to pause subscription.');
      return;
    }

    if (!isIndefinite && endDate && endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    try {
      setLoading(true);
      await customerService.pauseCustomer(customer._id, {
        startDate,
        endDate: isIndefinite ? null : (endDate || null),
        reason
      });
      showToast(`Subscription paused for ${customer.name}`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to pause subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      setError('');
      await customerService.resumeCustomer(customer._id);
      showToast(`Subscription resumed! ${customer.name} is now active.`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resume subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full border border-warm-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between bg-warm-50/70">
          <div className="flex items-center gap-2.5">
            {isAlreadyPaused ? (
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <PauseCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-terracotta-100 text-terracotta-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-warm-900">
                {isAlreadyPaused ? 'Manage Paused Subscription' : 'Pause Subscription'}
              </h3>
              <p className="text-xs text-warm-500 font-medium">
                Customer: <span className="text-warm-800 font-semibold">{customer.name}</span> ({customer.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-warm-400 hover:text-warm-700 p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isAlreadyPaused ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold mt-0.5">
                    !
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Subscription Currently Paused</h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      This customer is currently marked as paused. Lunch deliveries are suspended and paused weekdays will not be billed.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-warm-600 leading-relaxed">
                Clicking <strong>Resume Subscription</strong> will reactivate daily deliveries immediately. The resume date itself will be counted as a delivered and billable day.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-50 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResume}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-soft transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  <span>Resume Now</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePause} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                  Pause Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-600">
                    Expected Resume / End Date
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-warm-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isIndefinite}
                      onChange={(e) => {
                        setIsIndefinite(e.target.checked);
                        if (e.target.checked) setEndDate('');
                      }}
                      className="rounded border-warm-300 text-terracotta-600 focus:ring-terracotta-500"
                    />
                    <span>Indefinite Pause</span>
                  </label>
                </div>
                <input
                  type="date"
                  disabled={isIndefinite}
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Leave empty or check indefinite"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25 disabled:bg-warm-100 disabled:text-warm-400 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-warm-500 mt-1">
                  {isIndefinite
                    ? 'Customer remains paused until resumed manually.'
                    : 'Customer resumes delivery the day following the end date.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Travel, Diwali holidays, Medical leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
                />
              </div>

              <div className="p-3 bg-warm-50 rounded-xl border border-warm-200/70 text-[11px] text-warm-600 leading-relaxed">
                ℹ️ <strong>Billing Guarantee:</strong> Weekdays within this pause range are automatically excluded from the monthly pro-rated invoice calculation.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-50 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-semibold text-sm shadow-soft transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                  <span>Confirm Pause</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
