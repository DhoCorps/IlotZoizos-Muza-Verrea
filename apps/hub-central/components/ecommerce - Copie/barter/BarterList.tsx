// apps/hub-central/components/ecommerce/barter/BarterList.tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, X, Loader2, Sparkles, Package } from 'lucide-react';

export function BarterList() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/ecommerce/barter');
      const data = await res.json();
      if (Array.isArray(data)) {
        setOffers(data);
      }
    } catch (err) {
      console.error("🔥 Erreur lors du chargement des trocs :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleResolveBarter = async (barterUid: string, status: 'ACCEPTED' | 'REJECTED') => {
    setProcessingUid(barterUid);
    try {
      const res = await fetch('/api/ecommerce/barter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barterUid, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchOffers();
      }
    } catch (err) {
      console.error("🔥 Erreur lors de la résolution du troc :", err);
    } finally {
      setProcessingUid(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
        <Loader2 className="animate-spin text-[#E5484D]" size={16} /> Recensement des ondes de troc en cours...
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="p-12 text-center bg-white/[0.01] border border-white/5 rounded-3xl space-y-3">
        <Package className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Aucune proposition de troc en attente dans la Silice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="text-[#E5484D]" size={16} />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Flux des Troc Actifs</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {offers.map((offer) => (
          <div key={offer.uid} className="p-6 bg-black/40 border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-white/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase px-2.5 py-1 bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 rounded-lg">
                  {offer.status}
                </span>
                <span className="text-[9px] font-mono text-slate-500">Initié par : {offer.initiatorUid}</span>
              </div>
              <div className="text-xs font-mono text-slate-300 space-y-1">
                <p>🎁 <span className="text-white">Propose :</span> {offer.offeredProductUids.join(', ')}</p>
                <p>🎯 <span className="text-white">Recherche :</span> {offer.requestedProductUids.join(', ')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => handleResolveBarter(offer.uid, 'ACCEPTED')}
                disabled={processingUid === offer.uid}
                className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingUid === offer.uid ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Accepter</>}
              </button>
              <button
                onClick={() => handleResolveBarter(offer.uid, 'REJECTED')}
                disabled={processingUid === offer.uid}
                className="flex-1 md:flex-none px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingUid === offer.uid ? <Loader2 size={12} className="animate-spin" /> : <><X size={12} /> Rejeter</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}