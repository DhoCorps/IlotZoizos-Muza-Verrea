'use client';

import { useSession, SessionProvider } from "next-auth/react";
import React, { createContext, useContext, ReactNode } from 'react';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthInternalProvider>{children}</AuthInternalProvider>
    </SessionProvider>
  );
}

function AuthInternalProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const authValue = {
    user: session?.user,
    status,
    isAuthenticated: !!session,
    isArchitect: (session?.user as any)?.role === 'architect',
    signature: (session?.user as any)?.signature || "🔭"
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);