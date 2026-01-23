import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WholesaleCustomer {
  id: number;
  businessName: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  gstNumber?: string | null;
}

interface WholesaleAuthContextType {
  customer: WholesaleCustomer | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (token: string, customer: WholesaleCustomer) => void;
  logout: () => void;
  getAuthHeader: () => { Authorization: string } | {};
}

const WholesaleAuthContext = createContext<WholesaleAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'wholesale_auth';

export function WholesaleAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<WholesaleCustomer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { token, customer } = JSON.parse(stored);
        setToken(token);
        setCustomer(customer);
      }
    } catch (e) {
      console.error('Failed to load wholesale auth state:', e);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newCustomer: WholesaleCustomer) => {
    setToken(newToken);
    setCustomer(newCustomer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, customer: newCustomer }));
  };

  const logout = () => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getAuthHeader = () => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  return (
    <WholesaleAuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        isLoggedIn: !!token && !!customer,
        login,
        logout,
        getAuthHeader,
      }}
    >
      {children}
    </WholesaleAuthContext.Provider>
  );
}

export function useWholesaleAuth() {
  const context = useContext(WholesaleAuthContext);
  if (context === undefined) {
    throw new Error('useWholesaleAuth must be used within a WholesaleAuthProvider');
  }
  return context;
}
