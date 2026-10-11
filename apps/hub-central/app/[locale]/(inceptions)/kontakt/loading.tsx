// apps/hub-central/app/[locale]/(inceptions)/kontakt/loading.tsx
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function KontaktLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
      <Sparkles className="w-12 h-12 text-[#E5484D] animate-spin" />
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
        Synchronisation des fréquences Kontakt-RH...
      </p>
    </div>
  );
}