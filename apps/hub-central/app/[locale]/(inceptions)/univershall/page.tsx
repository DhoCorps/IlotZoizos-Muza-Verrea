// apps/hub-central/app/[locale]/(inceptions)/univershall/page.tsx
'use client';

import React, { useState } from 'react';
import UniversHallAgoraView from '@/components/univershall/UniversHallAgoraView';
import UniversHallPantheonPodium from '@/components/univershall/UniversHallPantheonPodium';
import UniversHallConstellationExplorer from '@/components/univershall/UniversHallConstellationExplorer';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';

export default function UniversHallPage() {
  const [activeView, setActiveView] = useState<'agora' | 'pantheon' | 'constellation'>('agora');

  // Synchronisation avec le Chapeau Flottant
  usePageChapeauContext({
    recipientUid: 'canopy_univershall_root',
    recipientPseudo: "L'Agora d'Univers'Hall",
    targetTitle: "Le Grand Carrefour de l'Îlot",
  });

  return (
    <div className="space-y-8">
      {/* Sélecteur de Quartier Supérieur */}
      <div className="flex justify-center gap-3 p-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md max-w-lg mx-auto">
        <button
          onClick={() => setActiveView('agora')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeView === 'agora' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          🏛️ L'Agora (Flux)
        </button>
        <button
          onClick={() => setActiveView('pantheon')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeView === 'pantheon' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          🏆 Le Panthéon
        </button>
        <button
          onClick={() => setActiveView('constellation')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeView === 'constellation' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          ✨ Constellation
        </button>
      </div>

      {/* Rendu de la vue active */}
      <div className="animate-in fade-in duration-300">
        {activeView === 'agora' && <UniversHallAgoraView />}
        {activeView === 'pantheon' && <UniversHallPantheonPodium />}
        {activeView === 'constellation' && <UniversHallConstellationExplorer />}
      </div>
    </div>
  );
}