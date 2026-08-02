'use client';

import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { ecommerce } from '../../../lib/apiClient';

export function BarterForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [receiverUid, setReceiverUid] = useState('');
  const [offeredUid, setOfferedUid] = useState('');
  const [requestedUid, setRequestedUid] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerce.proposeBarter({
        receiverUid: receiverUid || undefined,
        offeredProductUids: [offeredUid],
        requestedProductUids: [requestedUid]
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("🔥 Échec de la proposition de troc :", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Repeat size={16} className="text-cyan-400" /> Proposer un Troc
        </h2>
        <button type="button" onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">UID de l'Oiseau Cible (Optionnel)</label>
        <input 
          type="text" 
          value={receiverUid} 
          onChange={(e) => setReceiverUid(e.target.value)}
          placeholder="ex: bird-beta" 
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Artefact proposé (UID)</label>
        <input 
          type="text" 
          value={offeredUid} 
          onChange={(e) => setOfferedUid(e.target.value)}
          placeholder="ex: prod-1" 
          required
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Artefact demandé (UID)</label>
        <input 
          type="text" 
          value={requestedUid} 
          onChange={(e) => setRequestedUid(e.target.value)}
          placeholder="ex: prod-2" 
          required
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
        />
      </div>

      <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all">
        Sceller l'Offre de Troc
      </button>
    </form>
  );
}