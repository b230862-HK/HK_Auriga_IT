import React, { useState, useEffect } from 'react';
import { billingService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ReceiptText,
  Calendar,
  Sparkles,
  Calculator,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  DollarSign,
  Users
} from 'lucide-react';

export default function BillingPage() {
  const { showToast } = useAuth();

  // Current month string e.g. "2026-09"
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [error, setError] = useState('');

  const fetchMonthlyBills = async (month) => {
    try {
      setLoading(true);
      setError('');
      const data = await billingService.getMonthlyBills(month);
      if (data.success) {
        setBills(data.bills || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch monthly bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyBills(selectedMonth);
  }, [selectedMonth]);

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);
      setError('');
      const data = await billingService.generateBills(selectedMonth);
      if (data.success) {
        setBills(data.bills || []);
        setSummary(data.summary || null);
        showToast(
          `Generated ${data.summary?.customerCount} pro-rated bills for ${selectedMonth}! Total: ₹${data.summary?.totalBilled}`,
          'success'
        );
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate monthly bills');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (billId) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  // Month options for quick pick (past 3 months + next 2 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -3; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const str = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: str, label });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight font-display">
            Monthly Pro-Rated Billing
          </h1>
          <p className="text-sm text-warm-600 mt-1">
            Airtight billing engine: plan price divided across actual delivery days, billed only for days served.
          </p>
        </div>

        {/* Controls: Month selector & Generate button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm font-semibold text-warm-900 bg-white shadow-2xs cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-warm-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-sm shadow-soft transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing Bills...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                <span>Compute / Refresh Bills</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-warm-200/80 shadow-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-500">
              Total Revenue ({selectedMonth})
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-warm-900 font-display mt-2">
              ₹{summary.totalBilled?.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exact pro-rated billing</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-warm-200/80 shadow-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-500">
              Customers Billed
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-warm-900 font-display mt-2">
              {summary.customerCount}
            </p>
            <p className="text-xs text-warm-500 font-medium mt-1">
              Active & paused subscribers in period
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-warm-200/80 shadow-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-500">
              Actual Lunch Days Delivered
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-warm-900 font-display mt-2">
              {summary.totalBillableDays ?? bills.reduce((acc, b) => acc + (b.billableDays || 0), 0)}
            </p>
            <p className="text-xs text-warm-500 font-medium mt-1">
              Total billable weekday deliveries
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-warm-200/80 shadow-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-500">
              Paused Days Deducted
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-display mt-2">
              {summary.totalPausedDays ?? bills.reduce((acc, b) => acc + (b.pausedWeekdays || 0), 0)}
            </p>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Never billed to customer
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pro-Rated Billing Table */}
      <div className="bg-white rounded-3xl border border-warm-200/80 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-warm-100 flex items-center justify-between bg-warm-25">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-warm-900 font-display">
              Itemized Customer Invoices
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-200 text-warm-700">
              {bills.length} generated
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-warm-500">
            <Info className="w-4 h-4 text-warm-400" />
            <span>Click any row to view full weekday audit breakdown</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-warm-500">
            <Loader2 className="w-8 h-8 animate-spin text-terracotta-500 mb-2" />
            <p className="text-sm font-medium">Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="py-16 text-center text-warm-500">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-3 text-warm-400">
              <ReceiptText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-warm-700">
              No bills generated for {selectedMonth} yet
            </p>
            <p className="text-xs text-warm-400 mt-1 max-w-sm mx-auto">
              Click the "Compute / Refresh Bills" button above to run the pro-rated calculation for all subscribed customers.
            </p>
            <button
              onClick={handleGenerateBills}
              disabled={generating}
              className="mt-4 px-4 py-2 rounded-xl bg-terracotta-600 text-white text-xs font-semibold hover:bg-terracotta-700 transition-colors shadow-2xs"
            >
              Generate Bills Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-50/70 text-[11px] font-bold uppercase tracking-wider text-warm-500 border-b border-warm-100">
                <tr>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Monthly Plan</th>
                  <th className="py-3.5 px-6 text-center">Calendar Weekdays</th>
                  <th className="py-3.5 px-6 text-center">Paused Days</th>
                  <th className="py-3.5 px-6 text-center">Delivered Days</th>
                  <th className="py-3.5 px-6 text-right">Daily Rate</th>
                  <th className="py-3.5 px-6 text-right">Final Pro-Rated Bill</th>
                  <th className="py-3.5 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 font-medium">
                {bills.map((bill) => {
                  const isExpanded = expandedBillId === bill._id;
                  const customer = bill.customerId || {};
                  const plan = customer.planId || {};

                  return (
                    <React.Fragment key={bill._id}>
                      <tr
                        onClick={() => toggleExpand(bill._id)}
                        className="hover:bg-warm-50/50 cursor-pointer transition-colors group"
                      >
                        {/* Customer */}
                        <td className="py-4 px-6">
                          <p className="font-bold text-warm-900 group-hover:text-terracotta-600 transition-colors">
                            {customer.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-warm-500">{customer.phone}</p>
                        </td>

                        {/* Plan */}
                        <td className="py-4 px-6 text-xs">
                          <span className="font-semibold text-warm-800">{plan.name || 'Plan'}</span>
                          <span className="block text-[11px] text-warm-500">₹{plan.price || 0} / mo</span>
                        </td>

                        {/* Total Weekdays */}
                        <td className="py-4 px-6 text-center text-xs text-warm-700">
                          {bill.totalWeekdays}
                        </td>

                        {/* Paused Days */}
                        <td className="py-4 px-6 text-center text-xs">
                          {bill.pausedWeekdays > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              -{bill.pausedWeekdays} days
                            </span>
                          ) : (
                            <span className="text-warm-400">0</span>
                          )}
                        </td>

                        {/* Billable Days */}
                        <td className="py-4 px-6 text-center text-xs">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {bill.billableDays} days
                          </span>
                        </td>

                        {/* Daily Rate */}
                        <td className="py-4 px-6 text-right text-xs text-warm-600">
                          ₹{Number(bill.dailyRate || 0).toFixed(2)}
                        </td>

                        {/* Final Amount */}
                        <td className="py-4 px-6 text-right">
                          <span className="text-base font-extrabold text-warm-900 font-display">
                            ₹{Number(bill.finalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Expand Chevron */}
                        <td className="py-4 px-4 text-center text-warm-400 group-hover:text-warm-700">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 inline" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable Audit Trail Drawer */}
                      {isExpanded && (
                        <tr className="bg-warm-50/70 border-y border-warm-200/80 animate-in fade-in">
                          <td colSpan={8} className="p-6">
                            <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-warm-100 pb-3 gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-warm-900">
                                    Billing Calculation Breakdown for {customer.name} ({bill.month})
                                  </h4>
                                  <p className="text-xs text-warm-500">
                                    Subscription start:{' '}
                                    {customer.subscriptionStartDate
                                      ? new Date(customer.subscriptionStartDate).toLocaleDateString()
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div className="text-xs font-mono bg-warm-100 px-3 py-1 rounded-lg text-warm-800">
                                  ₹{bill.dailyRate} &times; {bill.billableDays} billable days = ₹{bill.finalAmount}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                                    <span>Paused Weekdays Deducted ({bill.details?.pausedDates?.length || bill.pausedWeekdays}):</span>
                                  </p>
                                  {bill.details?.pausedDates?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {bill.details.pausedDates.map((dateStr) => (
                                        <span
                                          key={dateStr}
                                          className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]"
                                        >
                                          {dateStr}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-warm-400 italic">None. Customer was not paused during this period.</p>
                                  )}
                                </div>

                                <div>
                                  <p className="font-bold text-emerald-800 mb-1">
                                    Billable Weekdays Delivered ({bill.details?.billableDates?.length || bill.billableDays}):
                                  </p>
                                  {bill.details?.billableDates?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto pr-1">
                                      {bill.details.billableDates.map((dateStr) => (
                                        <span
                                          key={dateStr}
                                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]"
                                        >
                                          {dateStr}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-warm-400 italic">0 billable days.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
