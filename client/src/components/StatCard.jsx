import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'terracotta' }) {
  const colorMap = {
    terracotta: {
      bg: 'bg-terracotta-50',
      border: 'border-terracotta-100',
      iconBg: 'bg-terracotta-500 text-white',
      accent: 'text-terracotta-700',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-600 text-white',
      accent: 'text-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500 text-white',
      accent: 'text-amber-800',
    },
    saffron: {
      bg: 'bg-saffron-50',
      border: 'border-saffron-100',
      iconBg: 'bg-saffron-500 text-white',
      accent: 'text-saffron-800',
    },
    blue: {
      bg: 'bg-sky-50',
      border: 'border-sky-100',
      iconBg: 'bg-sky-600 text-white',
      accent: 'text-sky-700',
    }
  };

  const scheme = colorMap[color] || colorMap.terracotta;

  return (
    <div className={`p-5 rounded-2xl border ${scheme.border} bg-white shadow-soft transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-warm-500">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scheme.iconBg} shadow-xs`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-warm-900 font-display tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-warm-500 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
