// apps/hub-central/app/[locale]/(inceptions)/kontakt/cv-editor/error.tsx
'use client';

import React, { useEffect } from 'react';
import { Skull, RefreshCw } from 'lucide-react';

export default function CVEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🔥 Fracture critique dans le CV Editor :", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-black/40 border border-red-500/20 rounded-3xl backdrop-blur-xl">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
        <Skull size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase text-white">Fracture dans la Matrice</h2>
        <p className="text-xs font-mono text-slate-400 max-w-md">
          {error.message || "Une anomalie s'est produite lors du chargement du parchemin."}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#E5484D] text-white font-black uppercase text-xs rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
      >
        <RefreshCw size={14} /> Réinitialiser le Flux
      </button>
    </div>
  );
}