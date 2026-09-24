import React from 'react';

export default function BibliotekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#121417] text-[#E1E4E8] selection:bg-[#E5484D] selection:text-white font-sans">
      {/* Enveloppe globale du Sanctuaire Bibliotek */}
      <div className="relative overflow-hidden">
        {/* Effet d'ambiance Canopée / Abysse */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-gradient-to-b from-[#E5484D]/5 to-transparent blur-3xl pointer-events-none" />
        
        {children}
      </div>
    </div>
  );
}