import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import { demoStore, DEMO_TOKEN } from '../api/demoStore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  hasBudget: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  setHasBudget: (hasBudget: boolean) => void;
  updateUser: (updatedData: Partial<User>) => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mintly_token'));
  const [user, setUser] = useState<User | null>(null);
  const [hasBudget, setHasBudgetState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem('mintly_token');
    if (!storedToken) {
      setUser(null);
      setHasBudgetState(false);
      setIsLoading(false);
      return;
    }
    if (storedToken === DEMO_TOKEN) {
      setUser(demoStore.getUser());
      setHasBudgetState(true);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<{ user: User; has_budget: boolean }>('/auth/me/');
      setUser(res.user);
      setHasBudgetState(res.has_budget);
    } catch (err) {
      localStorage.removeItem('mintly_token');
      setToken(null);
      setUser(null);
      setHasBudgetState(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User; has_budget: boolean }>('/auth/login/', {
      email,
      password,
    });
    localStorage.setItem('mintly_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setHasBudgetState(res.has_budget);
  };

  const register = async (data: any) => {
    const res = await api.post<{ token: string; user: User; has_budget: boolean }>('/auth/register/', data);
    localStorage.setItem('mintly_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setHasBudgetState(res.has_budget);
  };

  const demoLogin = async () => {
    try {
      const res = await api.post<{ token: string; user: User; has_budget: boolean }>('/auth/demo/');
      if (res && res.token) {
        localStorage.setItem('mintly_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setHasBudgetState(res.has_budget ?? true);
        return;
      }
      throw new Error('Invalid demo response');
    } catch (err) {
      const fallback = demoStore.initDemoSession();
      localStorage.setItem('mintly_token', fallback.token);
      setToken(fallback.token);
      setUser(fallback.user);
      setHasBudgetState(fallback.has_budget);
    }
  };

  const logout = () => {
    const storedToken = localStorage.getItem('mintly_token');
    if (storedToken && storedToken !== DEMO_TOKEN) {
      api.post('/auth/logout/').catch(() => {});
    }
    localStorage.removeItem('mintly_token');
    localStorage.removeItem('mintly_demo_mode');
    setToken(null);
    setUser(null);
    setHasBudgetState(false);
  };

  const setHasBudget = (status: boolean) => {
    setHasBudgetState(status);
  };

  const updateUser = async (updatedData: Partial<User>) => {
    const res = await api.patch<User>('/auth/me/', updatedData);
    setUser(res);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        hasBudget,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        setHasBudget,
        updateUser,
        refreshMe,
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
