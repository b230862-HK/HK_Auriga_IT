import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Toast() {
  const { toast, closeToast } = useAuth();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 bg-white/95 max-w-md">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-terracotta-600 flex-shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-saffron-600 flex-shrink-0" />}

      <p className="text-sm font-medium text-warm-900 flex-1">{toast.message}</p>

      <button
        onClick={closeToast}
        className="text-warm-400 hover:text-warm-700 transition-colors p-1 rounded-lg hover:bg-warm-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
