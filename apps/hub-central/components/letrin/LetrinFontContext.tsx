'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { compileAndInjectFont } from '../../../hub-central/utils/letrin-compiler'; // Ajuste ton chemin d'import

interface FontItem {
  _id: string;
  title: string;
  resolution: number;
  license: string;
  matrices: Record<string, any[][]>;
}

interface LetrinContextType {
  activeFont: string;
  setActiveFont: (fontName: string) => void;
  fonts: FontItem[];
}

const LetrinFontContext = createContext<LetrinContextType>({
  activeFont: '',
  setActiveFont: () => {},
  fonts: [],
});

export function LetrinFontProvider({ children }: { children: React.ReactNode }) {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [activeFont, setActiveFont] = useState<string>('');

  useEffect(() => {
    // 1. Récupération des polices depuis l'API au chargement global
    fetch('/api/letrin/fonts')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFonts(data.data);
          // 2. Compilation et injection automatique de chaque police dans le DOM
          data.data.forEach((font: FontItem) => {
            compileAndInjectFont(font.title, font.matrices, font.resolution);
          });
        }
      })
      .catch(err => console.error("Erreur de chargement des polices Letr'In", err));
  }, []);

  return (
    <LetrinFontContext.Provider value={{ activeFont, setActiveFont, fonts }}>
      {/* On applique la police active globalement via une variable CSS ou le style parent */}
      <div 
        style={{ '--letrin-active-font': activeFont ? `'${activeFont}', sans-serif` : 'inherit' } as React.CSSProperties}
        className="w-full h-full min-h-screen"
      >
        {children}
      </div>
    </LetrinFontContext.Provider>
  );
}

export const useLetrinFont = () => useContext(LetrinFontContext);