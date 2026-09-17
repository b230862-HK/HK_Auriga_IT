import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerService, billingService } from '../api/services.js';
import PauseModal from '../components/PauseModal.jsx';
import {
  Search,
  Phone,
  User,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Receipt,
  FileText,
  Loader2
} from 'lucide-react';

export default function CustomerSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';

  const [phoneInput, setPhoneInput] = useState(phoneParam);
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [currentBill, setCurrentBill] = useState(null);
  const [error, setError] = useState('');

  // Pause Modal
  const [modalOpen, setModalOpen] = useState(false);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const handleSearch = async (phoneToQuery) => {
    const target = (phoneToQuery || phoneInput).trim();
    if (!target) return;

    try {
      setLoading(true);
      setError('');
      setCustomerData(null);
      setCurrentBill(null);

      const res = await customerService.getCustomerByPhone(target);
      if (res.success && res.customer) {
        setCustomerData(res);
        setSearchParams({ phone: target });

        // Also fetch live bill preview for current month
        try {
          const billRes = await billingService.getCustomerBill(res.customer._id, currentMonthStr);
          if (billRes.success && billRes.bill) {
            setCurrentBill(billRes.bill);
          }
        } catch (bErr) {
          console.warn('Bill preview error:', bErr);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || `No customer found for phone: "${target}"`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phoneParam) {
      setPhoneInput(phoneParam);
      handleSearch(phoneParam);
    }
  }, [phoneParam]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const customer = customerData?.customer;
  const pauses = customerData?.pauses || [];
  const isActive = customer?.status === 'active';
  const isPaused = customer?.status === 'paused';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight font-display">
          Customer Phone Lookup
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          Instant subscription lookup, live pause/resume management, and pause audit history.
        </p>
      </div>

      {/* Search Form Bar */}
      <div className="bg-white p-4 rounded-2xl border border-warm-200/80 shadow-soft">
        <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Enter subscriber's phone number (e.g. 9876543210)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 bg-warm-25"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phoneInput.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-sm shadow-soft transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Customer</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer Found View */}
      {customer && (
        <div className="space-y-6">
          {/* Main Profile Card */}
          <div className="bg-white rounded-3xl border border-warm-200/80 shadow-soft overflow-hidden">
            <div className="p-6 sm:p-8 bg-gradient-to-r from-warm-50 via-white to-warm-50 border-b border-warm-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-terracotta-600 to-saffron-500 text-white font-display font-extrabold text-2xl flex items-center justify-center shadow-soft">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-warm-900 font-display">
                      {customer.name}
                    </h2>
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Active Delivery</span>
                      </span>
                    )}
                    {isPaused && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>Delivery Paused</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-warm-600 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-warm-400" />
                      <strong>{customer.phone}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-warm-400" />
                      <span>
                        Subscribed since{' '}
                        {new Date(customer.subscriptionStartDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Pause/Resume Action Button */}
              <div>
                <button
                  onClick={() => setModalOpen(true)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-soft transition-all duration-200 flex items-center gap-2 ${
                    isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Resume Subscription</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-4 h-4" />
                      <span>Pause Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan Card */}
              <div className="p-4 rounded-2xl bg-warm-25 border border-warm-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-warm-500">
                  Current Plan
                </span>
                <p className="text-base font-bold text-warm-900 mt-1">
                  {customer.planId?.name || 'Standard Veg Plan'}
                </p>
                <p className="text-sm font-extrabold text-terracotta-600 mt-0.5">
                  ₹{customer.planId?.price?.toLocaleString() || 0}{' '}
                  <span className="text-xs font-normal text-warm-500">/ month</span>
                </p>
                <p className="text-xs text-warm-600 mt-2 line-clamp-2">
                  {customer.planId?.description || 'Daily Mon–Fri lunch delivery'}
                </p>
              </div>

              {/* Address Card */}
              <div className="p-4 rounded-2xl bg-warm-25 border border-warm-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-warm-500">
                  Delivery Location
                </span>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-warm-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warm-800 leading-relaxed">
                    {customer.address || 'No address specified'}
                  </p>
                </div>
              </div>

              {/* Live Pro-Rated Bill Card */}
              <div className="p-4 rounded-2xl bg-terracotta-50/50 border border-terracotta-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-800">
                  {currentMonthStr} Pro-Rated Bill
                </span>
                {currentBill ? (
                  <div className="mt-1">
                    <p className="text-xl font-extrabold text-warm-900 font-display">
                      ₹{currentBill.finalAmount?.toLocaleString()}
                    </p>
                    <div className="text-xs text-warm-600 mt-1 space-y-0.5">
                      <p>
                        <strong>{currentBill.billableDays}</strong> billable days (of{' '}
                        {currentBill.totalWeekdays} total)
                      </p>
                      <p className="text-terracotta-700">
                        {currentBill.pausedWeekdays} weekday(s) paused & deducted
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-warm-500 mt-2">Calculating monthly pro-rate...</p>
                )}
              </div>
            </div>
          </div>

          {/* Pause History Timeline */}
          <div className="bg-white rounded-3xl border border-warm-200/80 shadow-soft p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warm-500" />
                <h3 className="text-lg font-bold text-warm-900 font-display">
                  Subscription Pause History
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-100 text-warm-700">
                  {pauses.length} records
                </span>
              </div>
            </div>

            {pauses.length === 0 ? (
              <div className="text-center py-8 text-warm-500">
                <p className="text-xs">No pause records on file for this customer.</p>
                <p className="text-[11px] text-warm-400 mt-0.5">
                  When this customer pauses for travel, festivals, or leave, records will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pauses.map((pause, idx) => {
                  const startStr = new Date(pause.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const endStr = pause.endDate
                    ? new Date(pause.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Indefinite / Ongoing';

                  return (
                    <div
                      key={pause._id || idx}
                      className="p-4 rounded-2xl border border-warm-200 bg-warm-25/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-warm-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            pause.isResumed
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {pause.isResumed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <PauseCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-warm-900">
                              {startStr} &rarr; {endStr}
                            </span>
                            {pause.isResumed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Resumed
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Currently Paused
                              </span>
                            )}
                          </div>
                          {pause.reason && (
                            <p className="text-xs text-warm-600 mt-1">
                              <strong>Reason:</strong> {pause.reason}
                            </p>
                          )}
                          {pause.resumedAt && (
                            <p className="text-[11px] text-warm-500 mt-0.5">
                              Resumed on{' '}
                              {new Date(pause.resumedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}{' '}
                              (billed from resume date)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-warm-500">
                          Recorded on{' '}
                          {new Date(pause.createdAt || Date.now()).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <PauseModal
        customer={customer}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => handleSearch(customer.phone)}
      />
    </div>
  );
}
