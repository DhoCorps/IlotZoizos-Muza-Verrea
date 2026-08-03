// apps/hub-central/components/ecommerce/stores/StoreForm.tsx
'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';
import { ecommerce } from '../../../lib/apiClient';

export function StoreForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerce.createStore({ storeName, description, stripeAccountId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("🔥 Échec de la création de la boutique :", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Store size={16} className="text-[#E5484D]" /> Ouvrir une Boutique
        </h2>
        <button type="button" onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Nom de la Boutique</label>
        <input 
          type="text" 
          value={storeName} 
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="ex: La Forge Typographique" 
          required
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Description</label>
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décris tes créations..." 
          rows={3}
          className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Stripe Connect ID (Optionnel)</label>
        <input 
          type="text" 
          value={stripeAccountId} 
          onChange={(e) => setStripeAccountId(e.target.value)}
          placeholder="acct_..." 
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <button type="submit" className="w-full py-4 bg-[#E5484D] hover:bg-[#d43b40] text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all">
        Sceller la Boutique
      </button>
    </form>
  );
}