import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerService, billingService } from '../api/services.js';
import StatCard from '../components/StatCard.jsx';
import PauseModal from '../components/PauseModal.jsx';
import ImportModal from '../components/ImportModal.jsx';
import {
  Users,
  CheckCircle2,
  PauseCircle,
  ReceiptText,
  UserPlus,
  Search,
  ArrowUpRight,
  Filter,
  Calendar,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
  Upload,
  ArrowRightLeft
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState({ active: 0, paused: 0, total: 0 });
  const [currentMonthBilled, setCurrentMonthBilled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [customerData, billingData] = await Promise.all([
        customerService.listCustomers(),
        billingService.getMonthlyBills(currentMonthStr).catch(() => ({ bills: [] }))
      ]);

      if (customerData.success) {
        setCustomers(customerData.customers || []);
        setCounts(customerData.counts || { active: 0, paused: 0, total: 0 });
      }

      if (billingData && billingData.summary) {
        setCurrentMonthBilled(billingData.summary.totalBilled || 0);
      } else if (billingData && billingData.bills) {
        const sum = billingData.bills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);
        setCurrentMonthBilled(Math.round(sum * 100) / 100);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openPauseModal = (customer) => {
    setSelectedCustomer(customer);
    setPauseModalOpen(true);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm.trim()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight font-display">
            Kitchen Overview
          </h1>
          <p className="text-sm text-warm-600 mt-1">
            Real-time daily delivery tracking, subscription transfers, and pro-rated billing status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            title="Refresh dashboard stats"
            className="p-2.5 rounded-xl border border-warm-200 text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors bg-white shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-800 font-semibold text-xs transition-colors border border-warm-300/60 shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-warm-700" />
            <span>Bulk Import</span>
          </button>

          <Link
            to="/subscribe"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-semibold text-xs sm:text-sm shadow-soft transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Subscriber</span>
          </Link>

          <Link
            to="/billing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-800 font-semibold text-xs sm:text-sm transition-colors border border-warm-300/60"
          >
            <ReceiptText className="w-4 h-4 text-warm-700" />
            <span>Pro-Rated Bills</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Deliveries"
          value={counts.active}
          subtitle="Receiving daily weekday lunch"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Paused Subscriptions"
          value={counts.paused}
          subtitle="Excluded from lunch & billing"
          icon={PauseCircle}
          color="amber"
        />
        <StatCard
          title="Total Subscribers"
          value={counts.total}
          subtitle="Active slots & customers"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="This Month Billed"
          value={`₹${currentMonthBilled.toLocaleString()}`}
          subtitle={`Pro-rated revenue for ${currentMonthStr}`}
          icon={ReceiptText}
          color="terracotta"
        />
      </div>

      {/* Customer Lists Section */}
      <div className="bg-white rounded-3xl border border-warm-200/80 shadow-soft overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-warm-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-warm-25">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-warm-900 font-display">Subscribers Directory</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-200 text-warm-700">
              {filteredCustomers.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-warm-100 border border-warm-200/70 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-warm-900 shadow-2xs'
                    : 'text-warm-600 hover:text-warm-900'
                }`}
              >
                All ({counts.total})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Active ({counts.active})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'paused'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Paused ({counts.paused})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-warm-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or phone..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-200 outline-none w-full sm:w-56 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Customer Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-warm-500">
            <Loader2 className="w-8 h-8 animate-spin text-terracotta-500 mb-2" />
            <p className="text-sm font-medium">Loading subscribers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-warm-500">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-3 text-warm-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-warm-700">No subscribers found</p>
            <p className="text-xs text-warm-400 mt-1 max-w-xs mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter tab.'
                : 'Get started by creating your first tiffin subscriber or importing in bulk.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-50/70 text-[11px] font-bold uppercase tracking-wider text-warm-500 border-b border-warm-100">
                <tr>
                  <th className="py-3.5 px-6">Customer & Phone</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Assigned Plan</th>
                  <th className="py-3.5 px-6">Cycle Started</th>
                  <th className="py-3.5 px-6 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 font-medium">
                {filteredCustomers.map((customer) => {
                  const isActive = customer.status === 'active';
                  const isPaused = customer.status === 'paused';
                  const hasTransferred = customer.ownershipHistory && customer.ownershipHistory.length > 1;

                  return (
                    <tr
                      key={customer._id}
                      className="hover:bg-warm-50/50 transition-colors group"
                    >
                      {/* Customer Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-warm-100 text-warm-700 font-bold flex items-center justify-center text-xs group-hover:bg-terracotta-100 group-hover:text-terracotta-700 transition-colors">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-warm-900 leading-tight">
                                {customer.name}
                              </p>
                              {hasTransferred && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>Transferred</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-warm-500 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}
                        {isPaused && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Paused</span>
                          </span>
                        )}
                        {!isActive && !isPaused && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-6">
                        <p className="text-xs font-bold text-warm-900">
                          {customer.planId?.name || 'Default Plan'}
                        </p>
                        <p className="text-[11px] text-warm-500">
                          ₹{customer.planId?.price || 0} / month
                        </p>
                      </td>

                      {/* Cycle Started */}
                      <td className="py-4 px-6 text-xs text-warm-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-warm-400" />
                          <span>
                            {customer.subscriptionStartDate
                              ? new Date(customer.subscriptionStartDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {isPaused ? (
                          <button
                            onClick={() => openPauseModal(customer)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openPauseModal(customer)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/search?phone=${encodeURIComponent(customer.phone)}`)}
                          title="View detailed customer timeline & pause history"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors border border-warm-200"
                        >
                          <span>Profile</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pause/Resume Modal */}
      <PauseModal
        customer={selectedCustomer}
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Bulk Import Modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
