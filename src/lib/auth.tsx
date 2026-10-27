import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  SYNTHETIC_DEMO_ACCOUNTS,
  type DemoAccount,
} from './syntheticSeed';
import type { UserRole } from './weaveEngine';

// Access token kept strictly in memory per Section 19 (never localStorage/sessionStorage/URL)
let inMemoryAccessToken: string | null = 'synth_mem_tok_initial_session';

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setInMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

interface AuthContextValue {
  user: DemoAccount;
  isAuthenticated: boolean;
  apiMode: 'mock' | 'live';
  setApiMode: (mode: 'mock' | 'live') => void;
  switchRolePersona: (role: UserRole, institutionId?: string) => void;
  loginWithAccount: (account: DemoAccount, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoAccount>(SYNTHETIC_DEMO_ACCOUNTS[0]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [apiMode, setApiMode] = useState<'mock' | 'live'>(
    import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'live'
  );

  const switchRolePersona = useCallback((role: UserRole, institutionId?: string) => {
    const matched =
      SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === role) || SYNTHETIC_DEMO_ACCOUNTS[0];
    const updated: DemoAccount = {
      ...matched,
      institution_id:
        institutionId ||
        matched.institution_id ||
        (role === 'institution_operator' || role === 'institution_admin'
          ? 'INST-KKR-101'
          : undefined),
    };
    setInMemoryAccessToken(`synth_mem_tok_${role}_${Date.now().toString(36)}`);
    setUser(updated);
    setIsAuthenticated(true);
  }, []);

  const loginWithAccount = useCallback((account: DemoAccount, token: string) => {
    setInMemoryAccessToken(token);
    setUser(account);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setInMemoryAccessToken(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        apiMode,
        setApiMode,
        switchRolePersona,
        loginWithAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
