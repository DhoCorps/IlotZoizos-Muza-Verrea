// apps/hub-central/app/[locale]/(inceptions)/tribunal/page.tsx
import React from 'react';
import { CanopyTribunal } from '@/components/tribunal/CanopyTribunal';
import DemopraxyRegisterView from '@/components/demopraxy/DemopraxyRegisterView';
import { ShieldAlert } from 'lucide-react';

// ==========================================
// 🏛️ COMPOSANT SERVEUR PRINCIPAL (SSR)
// ==========================================
export default async function TribunalPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Lecture asynchrone des paramètres d'URL (Standard Next.js 15)
  const resolvedSearchParams = await searchParams;
  const reportUid = (resolvedSearchParams.reportId as string) || '';
  const defaultPlaintiff = (resolvedSearchParams.plaintiff as string) || '';
  const defaultDefendant = (resolvedSearchParams.defendant as string) || '';

  // La présence d'une convocation ouvre la cour de justice (CanopyTribunal)
  const isTribunalSummoned = Boolean(reportUid || defaultPlaintiff || defaultDefendant);

  return (
    <div className="space-y-16">
      {/* ⚡ Section d'Action : Exécution du Jugement (Conditionnelle) */}
      {isTribunalSummoned && (
        <section className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800 p-5 flex items-start gap-4 text-slate-300 shadow-xl">
            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-400 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1 text-sm font-mono">
              <p className="font-bold uppercase tracking-wide text-slate-200">Protocole de Justice Karmique</p>
              <p className="text-slate-400 leading-relaxed text-xs">
                Toute sentence prononcée ici est définitive et interroge le Graphe Neo4j pour vérifier l'intégrité du Bouclier Karmique de l'accusé. Assurez-vous de la véracité du rapport avant de faire tomber le sceau.
              </p>
            </div>
          </div>

          <div className="w-full">
            <CanopyTribunal 
              reportUid={reportUid || 'report_general_session'}
              defaultPlaintiffId={defaultPlaintiff}
              defaultDefendantId={defaultDefendant}
            />
          </div>
        </section>
      )}

      {/* 📖 Section Publique : Registre de Justice */}
      <section id="registre" className="scroll-mt-12">
        <DemopraxyRegisterView />
      </section>
    </div>
  );
}