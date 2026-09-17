import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UtensilsCrossed } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50 text-warm-700">
        <div className="w-12 h-12 rounded-2xl bg-terracotta-100 flex items-center justify-center text-terracotta-600 animate-bounce mb-3 shadow-soft">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-warm-600">Loading TiffinFlow...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
