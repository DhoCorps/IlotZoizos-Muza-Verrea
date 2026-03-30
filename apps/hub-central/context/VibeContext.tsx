'use client'; // <--- LA CLÉ DE TOUT EST ICI

import React, { createContext, useContext, useState, ReactNode } from 'react';

// On définit les types pour que l'Îlot soit solide
export type VibeMode = 'stable' | 'vibrant' | 'pulse' | 'storm';

interface VibeContextType {
  mode: VibeMode;
  setMode: (mode: VibeMode) => void;
  intensity: number;
  setIntensity: (val: number) => void;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

export const VibeProvider = ({ children }: { children: ReactNode }) => {
  // Si ça plantait ici, c'est que React n'était pas chargé
  const [mode, setMode] = useState<VibeMode>('stable');
  const [intensity, setIntensity] = useState(20);

  return (
    <VibeContext.Provider value={{ mode, setMode, intensity, setIntensity }}>
      {children}
    </VibeContext.Provider>
  );
};

export const useVibe = () => {
  const context = useContext(VibeContext);
  if (context === undefined) {
    throw new Error('useVibe doit être utilisé à l\'intérieur d\'un VibeProvider');
  }
  return context;
};