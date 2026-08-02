// apps/hub-central/app/[locale]/(inceptions)/marchand/components/BarterCard.tsx
import { Repeat, Check, X } from 'lucide-react';

export function BarterCard({ offer, onResolve }: { offer: any; onResolve: (uid: string, status: 'ACCEPTED' | 'REJECTED') => void }) {
  return (
    <div className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/25">
          Troc En Attente
        </span>
        <Repeat className="text-cyan-400" size={18} />
      </div>

      <div className="space-y-2 text-xs font-mono text-slate-300">
        <p><strong className="text-white">Initiateur :</strong> {offer.initiatorUid}</p>
        <p><strong className="text-white">Offre :</strong> {offer.offeredProductUids.join(', ')}</p>
        <p><strong className="text-white">Demande :</strong> {offer.requestedProductUids.join(', ')}</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button 
          onClick={() => onResolve(offer.uid, 'ACCEPTED')}
          className="flex-1 py-2.5 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-400 hover:text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> Accepter
        </button>
        <button 
          onClick={() => onResolve(offer.uid, 'REJECTED')}
          className="flex-1 py-2.5 bg-red-500/20 border border-red-500/30 hover:bg-red-600 text-red-400 hover:text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <X size={14} /> Refuser
        </button>
      </div>
    </div>
  );
}