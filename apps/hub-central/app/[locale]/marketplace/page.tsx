// apps/hub-central/app/[locale]/marketplace/page.tsx
import { BarterMatchmakerCard } from '@/components/ecommerce/barter/BarterMatchModelCard';
import { BarterList } from '@/components/ecommerce/barter/BarterList';
import { Sparkles, ShoppingBag, Compass } from 'lucide-react';

export default async function MarketplacePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      
      {/* En-tête de la Place de Marché */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-[#E5484D]" size={20} />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5484D]">Îlot Zoizos — Économie Organique</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Marketplace & Barter Harmonique</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono max-w-sm">
          Échangez des artefacts, partagez des ressources et laissez le graphe Neo4j tisser les ponts invisibles entre vos envies.
        </p>
      </div>

      {/* 🔮 LE MATCHMAKER PAR GRAPHE : Suggestions magiques de troc */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[#E5484D]" size={18} />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Résonances et Affinités de Troc</h2>
        </div>
        <BarterMatchmakerCard />
      </section>

      {/* 🔄 LES OFFRES DE TROC EN COURS */}
      <section className="space-y-6 pt-6 border-t border-white/5">
        <BarterList />
      </section>

    </div>
  );
}