// apps/hub-central/components/ecommerce/barter/BarterMatchmakerCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ArrowLeftRight, Loader2, User } from 'lucide-react';

export function BarterMatchmakerCard() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ecommerce/barter/matchmaker')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatches(data.matches);
        }
      })
      .catch(err => console.error("Erreur chargement matchmaker:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
        <Loader2 className="animate-spin text-[#E5484D]" size={14} /> Calcul des résonances du Barter...
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-[#E5484D]" size={16} />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Ponts de Troc Suggérés par le Graphe</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((match) => (
          <div key={match.matchUid} className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-300">
                <User size={12} />
              </div>
              <span className="text-xs font-bold text-white">{match.matchPseudo}</span>
            </div>

            <div className="text-[10px] font-mono text-slate-400 space-y-1">
              {match.itemsTheyHaveThatYouWant.length > 0 && (
                <p className="text-emerald-400">✨ Possède ce que tu recherches ({match.itemsTheyHaveThatYouWant.length})</p>
              )}
              {match.itemsYouHaveThatTheyWant.length > 0 && (
                <p className="text-[#E5484D]">🎯 Recherche ce que tu proposes ({match.itemsYouHaveThatTheyWant.length})</p>
              )}
            </div>

            <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono uppercase text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2">
              <ArrowLeftRight size={12} /> Proposer un échange harmonique
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}