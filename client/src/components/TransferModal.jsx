import React, { useState } from 'react';
import { X, ArrowRightLeft, User, Phone, MapPin, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { subscriptionService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function TransferModal({ subscriptionId, currentCustomerName, isOpen, onClose, onSuccess }) {
  const { showToast } = useAuth();
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!transferDate || !name.trim() || !phone.trim()) {
      setError('Transfer date, new customer name, and phone are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await subscriptionService.transferSubscription(subscriptionId, {
        transferDate,
        newCustomer: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim()
        }
      });

      showToast(res.message || 'Subscription successfully transferred!', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to transfer subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-elevated max-w-lg w-full border border-warm-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between bg-warm-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-soft">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-warm-900">Transfer Subscription Mid-Cycle</h3>
              <p className="text-xs text-warm-500 font-medium">
                Reassign slot from: <strong className="text-warm-800">{currentCustomerName}</strong>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-xs text-blue-900 leading-relaxed">
            💡 <strong>Billing Split Rule:</strong> Outgoing customer is billed through <strong>Day Prior</strong> to transfer. The incoming customer is billed starting from the <strong>Transfer Date</strong> onward. The monthly plan and cycle start date carry over unchanged.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-warm-600 mb-1.5">
              Transfer Date (Effective Handover Date) *
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-sm text-warm-900 transition-all bg-warm-25"
              />
            </div>
          </div>

          <div className="border-t border-warm-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-warm-700 mb-3">
              New Customer Details
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-warm-600 mb-1">New Customer Full Name *</label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gaurav Sen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-warm-200 focus:border-terracotta-500 outline-none text-sm text-warm-900 bg-warm-25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-warm-600 mb-1">New Customer Phone *</label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9844433221"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-warm-200 focus:border-terracotta-500 outline-none text-sm text-warm-900 bg-warm-25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-warm-600 mb-1">Delivery Address</label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Flat 904, Tower C"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-warm-200 focus:border-terracotta-500 outline-none text-sm text-warm-900 bg-warm-25"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-warm-100">
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-soft transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Execute Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
