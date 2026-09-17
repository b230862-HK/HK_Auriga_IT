import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Toast from './components/Toast.jsx';

import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SubscribePage from './pages/SubscribePage.jsx';
import CustomerSearchPage from './pages/CustomerSearchPage.jsx';
import BillingPage from './pages/BillingPage.jsx';

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-25 text-warm-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-warm-200/80 bg-white/60 py-6 text-center text-xs text-warm-500">
        <p>TiffinFlow &mdash; Generic Home-Style Tiffin Management & Pro-Rated Billing Platform</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes inside AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/search" element={<CustomerSearchPage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </BrowserRouter>
    </AuthProvider>
  );
}
