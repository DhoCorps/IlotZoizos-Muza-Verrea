'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WSState {
  isConnected: boolean;
  lastMessage: any;
}

const WebSocketContext = createContext<WSState | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status] = useState<WSState>({
    isConnected: false,
    lastMessage: null,
  });

  // On prépare l'effet sans le remplir pour éviter les boucles infinies
  useEffect(() => {
    // La logique de connexion WebSocket viendra ici
  }, []);

  return (
    <WebSocketContext.Provider value={status}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket doit être utilisé dans un WebSocketProvider");
  return context;
};