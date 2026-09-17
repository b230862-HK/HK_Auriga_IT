import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  UserPlus,
  Search,
  ReceiptText,
  LogOut,
  UtensilsCrossed,
  Menu,
  X,
  ChefHat
} from 'lucide-react';

export default function Navbar() {
  const { owner, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/subscribe', label: 'Subscribe', icon: UserPlus },
    { to: '/search', label: 'Search & Lookup', icon: Search },
    { to: '/billing', label: 'Monthly Billing', icon: ReceiptText },
  ];

  const getLinkClasses = ({ isActive }) =>
    `flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-terracotta-500 text-white shadow-soft font-semibold'
        : 'text-warm-700 hover:text-terracotta-600 hover:bg-warm-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-warm-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-terracotta-600 to-saffron-500 flex items-center justify-center text-white shadow-soft">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-lg text-warm-900 tracking-tight">
                  TiffinFlow
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200/60">
                  Owner Hub
                </span>
              </div>
              <p className="text-xs text-warm-500 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                {owner?.businessName || 'Home-Style Tiffin'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink key={link.to} to={link.to} className={getLinkClasses} end={link.to === '/'}>
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Owner Profile & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-warm-900 leading-tight">{owner?.name}</p>
              <p className="text-[11px] text-warm-500 truncate max-w-[150px]">{owner?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out of owner dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-200 text-warm-600 hover:text-terracotta-700 hover:bg-terracotta-50 hover:border-terracotta-200 transition-colors text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-warm-700 hover:bg-warm-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-warm-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          <div className="px-2 py-2 mb-2 bg-warm-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-warm-900">{owner?.name}</p>
              <p className="text-[11px] text-warm-500">{owner?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-800 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={getLinkClasses}
                end={link.to === '/'}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
