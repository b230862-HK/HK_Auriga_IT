import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/services.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tiffin_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const closeToast = () => setToast(null);

  useEffect(() => {
    async function verifyExistingAuth() {
      const storedToken = localStorage.getItem('tiffin_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await authService.getMe();
        if (data.success && data.owner) {
          setOwner(data.owner);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid token');
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    verifyExistingAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    if (data.success && data.token) {
      localStorage.setItem('tiffin_token', data.token);
      localStorage.setItem('tiffin_owner', JSON.stringify(data.owner));
      setToken(data.token);
      setOwner(data.owner);
      showToast(`Welcome back, ${data.owner.name}!`, 'success');
      return data;
    }
    throw new Error(data.error || 'Login failed');
  };

  const signup = async (formData) => {
    const data = await authService.signup(formData);
    if (data.success && data.token) {
      localStorage.setItem('tiffin_token', data.token);
      localStorage.setItem('tiffin_owner', JSON.stringify(data.owner));
      setToken(data.token);
      setOwner(data.owner);
      showToast(`Welcome to TiffinFlow, ${data.owner.name}!`, 'success');
      return data;
    }
    throw new Error(data.error || 'Signup failed');
  };

  const logout = () => {
    localStorage.removeItem('tiffin_token');
    localStorage.removeItem('tiffin_owner');
    setToken(null);
    setOwner(null);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        token,
        isAuthenticated: !!token && !!owner,
        isLoading,
        login,
        signup,
        logout,
        toast,
        showToast,
        closeToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
