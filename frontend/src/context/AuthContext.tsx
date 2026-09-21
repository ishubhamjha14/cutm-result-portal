import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('cutm_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (token: string, user: AdminUser) => {
    localStorage.setItem('cutm_admin_token', token);
    localStorage.setItem('cutm_admin_user', JSON.stringify(user));
    setAdmin(user);
  };

  const logout = async () => {
    await api.logout();
    setAdmin(null);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('cutm_admin_token');
    if (!token) {
      setAdmin(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await api.getMe();
      setAdmin(profile);
      localStorage.setItem('cutm_admin_user', JSON.stringify(profile));
    } catch {
      localStorage.removeItem('cutm_admin_token');
      localStorage.removeItem('cutm_admin_user');
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
