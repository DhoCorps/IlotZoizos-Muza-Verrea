// apps/hub-central/context/ChapeauContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ChapeauContextState {
  recipientUid: string;
  recipientPseudo: string;
  targetTitle: string;
  storeUid?: string;
  allowedExchangeTypes?: string[]; // Ex: ['item', 'creation', 'service']
}

interface ChapeauContextType {
  chapeauData: ChapeauContextState;
  setChapeauData: (data: Partial<ChapeauContextState>) => void;
  resetChapeauData: () => void;
}

const defaultState: ChapeauContextState = {
  recipientUid: 'system_canopy_treasury',
  recipientPseudo: 'l\'Îlot',
  targetTitle: 'la Canopée',
};

const ChapeauContext = createContext<ChapeauContextType | undefined>(undefined);

export function ChapeauProvider({ children }: { children: ReactNode }) {
  const [chapeauData, setState] = useState<ChapeauContextState>(defaultState);

  const setChapeauData = (data: Partial<ChapeauContextState>) => {
    setState((prev) => ({ ...prev, ...data }));
  };

  const resetChapeauData = () => {
    setState(defaultState);
  };

  return (
    <ChapeauContext.Provider value={{ chapeauData, setChapeauData, resetChapeauData }}>
      {children}
    </ChapeauContext.Provider>
  );
}

export function useChapeau(): ChapeauContextType {
  const context = useContext(ChapeauContext);
  if (!context) {
    throw new Error('useChapeau doit être utilisé à l\'intérieur d\'un ChapeauProvider');
  }
  return context;
}