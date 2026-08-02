// apps/hub-central/app/[locale]/(inceptions)/marchand/components/StoreCard.tsx
import { Store, ShieldCheck } from 'lucide-react';

export function StoreCard({ store }: { store: any }) {
  return (
    <div className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-4 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
          <ShieldCheck size={12} /> {store.isVerified ? 'Vérifiée' : 'En attente'}
        </span>
        <Store className="text-cyan-400" size={20} />
      </div>
      <div>
        <h3 className="text-xl font-black uppercase text-white">{store.storeName}</h3>
        <p className="text-xs text-slate-400 font-sans mt-1">{store.description || "Aucune description renseignée."}</p>
      </div>
      <div className="pt-4 border-t border-white/5 space-y-1">
        <span className="text-[10px] font-mono text-slate-500 block">Stripe Connect :</span>
        <code className="text-[10px] font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 text-cyan-400 block truncate">
          {store.stripeAccountId || 'Non lié (Paiement direct requis)'}
        </code>
      </div>
    </div>
  );
}