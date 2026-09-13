// app/(inception)/tribunal/page.tsx
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { CanopyTribunal } from '@/components/tribunal/CanopyTribunal';
import { Scale, ShieldAlert } from 'lucide-react';

export default function TribunalPage() {
  const searchParams = useSearchParams();
  
  // Récupération optionnelle des paramètres d'URL (ex: ?reportId=...&plaintiff=...&defendant=...)
  const reportUid = searchParams.get('reportId') || 'report_general_session';
  const defaultPlaintiff = searchParams.get('plaintiff') || '';
  const defaultDefendant = searchParams.get('defendant') || '';

  return (
    <div className="space-y-8 flex flex-col items-center">
      
      {/* Carte d'information / Avertissement */}
      <div className="w-full max-w-2xl rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-start gap-4 text-slate-300">
        <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-400 shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div className="space-y-1 text-xs font-mono">
          <p className="font-bold uppercase tracking-wide text-slate-200">Protocole de Justice Karmique</p>
          <p className="text-slate-400">
            Toute sentence prononcée ici est définitive et interroge le Graphe Neo4j pour vérifier l'intégrité du Bouclier Karmique de l'accusé. Assurez-vous de la véracité du rapport avant de faire tomber le sceau.
          </p>
        </div>
      </div>

      {/* Composant principal du Tribunal */}
      <CanopyTribunal 
        reportUid={reportUid}
        defaultPlaintiffId={defaultPlaintiff}
        defaultDefendantId={defaultDefendant}
      />

    </div>
  );
}