// apps/hub-central/components/poetrik/PoemExportVisual.tsx
'use client';

import React, { useRef } from 'react';

interface PoemExportVisualProps {
  title: string;
  content: string;
  authorPseudo: string;
  onExportRequest?: (element: HTMLDivElement) => void;
}

export const PoemExportVisual: React.FC<PoemExportVisualProps> = ({
  title,
  content,
  authorPseudo,
  onExportRequest
}) => {
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (exportRef.current && onExportRequest) {
      onExportRequest(exportRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Le Canevas d'Export (Le rendu visuel pur) */}
      <div 
        ref={exportRef}
        className="w-[400px] min-h-[500px] bg-[#fdf6e3] text-[#2c3e50] p-10 rounded-sm shadow-2xl relative"
        style={{
          backgroundImage: 'radial-gradient(#e5dfc5 1px, transparent 1px)',
          backgroundSize: '20px 20px' // Effet papier texturé léger
        }}
        data-testid="export-canvas"
      >
        <div className="absolute top-4 left-4 text-xs font-mono text-[#a89f91]">Poetrik / Letr'in</div>
        
        <div className="flex flex-col items-center justify-center h-full mt-10 gap-8">
          <h1 className="text-2xl font-serif font-bold text-center border-b border-[#d1c9b8] pb-4 w-3/4">
            {title}
          </h1>
          
          <div className="text-lg font-serif italic text-center whitespace-pre-wrap leading-loose">
            {content}
          </div>
          
          <div className="mt-10 text-sm font-serif font-semibold text-[#8c7f6b]">
            — 🪶 {authorPseudo}
          </div>
        </div>
      </div>

      {/* Contrôles (Ne font pas partie de l'export final) */}
      <button 
        onClick={handleExport}
        className="px-6 py-2 bg-indigo-900 text-indigo-100 rounded-lg shadow hover:bg-indigo-800 transition-colors"
      >
        📸 Générer la Carte Poétique
      </button>
    </div>
  );
};