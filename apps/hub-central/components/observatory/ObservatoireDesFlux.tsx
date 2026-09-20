import React from 'react';
import { Compass, Sparkles, Award, HeartHandshake, TrendingUp } from 'lucide-react';

export interface PropagatedArtifactSummary {
  uid: string;
  title: string;
  type: string;
  merciCount: number;
  propagatedAt: string;
}

export interface ObservatoireDesFluxProps {
  returnRatio: number; // Ex: 0.85 (85%)
  eliteProgress: number; // Ex: 75 (75% vers le grade d'élite)
  propagatedArtifacts?: PropagatedArtifactSummary[];
}

export const ObservatoireDesFlux: React.FC<ObservatoireDesFluxProps> = ({
  returnRatio = 0,
  eliteProgress = 0,
  propagatedArtifacts = [],
}) => {
  // Calcul du pourcentage de retour pour affichage
  const returnRatioPercent = Math.round(returnRatio * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* En-tête de l'Observatoire */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase text-slate-100 flex items-center gap-2">
            <Compass className="text-emerald-400" size={24} />
            <span>Observatoire des Flux</span>
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Tableau de bord du Passeur : mesure de la résonance et de l'impact de vos diffusions.
          </p>
        </div>
      </div>

      {/* Cartes Métriques (Ratio & Progression Élite) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Le Ratio de Retour */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Ratio de Retour</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-slate-100">{returnRatioPercent}%</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">Qualité organique</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Reflète la proportion de vos partages ayant déclenché un écho ou un retour de résonance dans le réseau.
          </p>
        </div>

        {/* 2. Jauge vers Passeur d'Élite */}
        <div className="p-6 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Award size={14} /> Passeur d'Élite
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">{eliteProgress}%</span>
          </div>

          {/* Barre de progression de la jauge */}
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-amber-500/20">
            <div 
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, eliteProgress))}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {eliteProgress >= 100 
              ? "🌟 Félicitations ! Le titre de Passeur d'Élite est débloqué." 
              : "Continuez à propager des œuvres de qualité pour atteindre le rang d'Élite et débloquer les récompenses du Kosmos."}
          </p>
        </div>
      </div>

      {/* 3. Liste des Œuvres Propagées & Mercis Reçus */}
      <section className="space-y-4" aria-labelledby="œuvres-propagées-title">
        <div className="flex items-center justify-between">
          <h3 id="œuvres-propagées-title" className="text-sm font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <span>Œuvres Propagées & Mercis ({propagatedArtifacts.length})</span>
          </h3>
        </div>

        <div className="space-y-3">
          {propagatedArtifacts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <HeartHandshake className="mx-auto text-slate-600" size={32} />
              <p className="text-xs font-mono text-slate-400">Aucune œuvre propagée pour le moment. Le réseau attend vos impulsions.</p>
            </div>
          ) : (
            propagatedArtifacts.map((art) => (
              <article 
                key={art.uid}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[10px] font-mono">
                      {art.type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100">{art.title}</h4>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    Propagé le {new Date(art.propagatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl">
                  <HeartHandshake size={14} className="text-emerald-400" />
                  <span className="text-xs font-black text-emerald-300">{art.merciCount} Merci(s)</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};