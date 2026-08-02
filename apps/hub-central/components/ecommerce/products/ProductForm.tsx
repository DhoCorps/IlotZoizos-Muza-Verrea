'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ecommerce } from '../../../lib/apiClient';

export function ProductForm({ stores, onSuccess, onClose }: { stores: any[]; onSuccess: () => void; onClose: () => void }) {
  const [storeUid, setStoreUid] = useState(stores[0]?.uid || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [category, setCategory] = useState('FONT_SPRITE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerce.createProduct({
        storeUid,
        title,
        description,
        priceCents: Math.round(parseFloat(priceCents) * 100),
        category
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("🔥 Échec de la création de l'artefact :", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Plus size={16} className="text-cyan-400" /> Déposer un Artefact
        </h2>
        <button type="button" onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Boutique de Rattachement</label>
        <select 
          value={storeUid} 
          onChange={(e) => setStoreUid(e.target.value)}
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500"
        >
          {stores.map((s) => (
            <option key={s.uid} value={s.uid}>{s.storeName}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Titre de l'Artefact</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex: Police Cyberpunk V1" 
          required
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Description</label>
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Caractéristiques..." 
          rows={3}
          required
          className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Prix (€)</label>
          <input 
            type="number" 
            step="0.01" 
            value={priceCents} 
            onChange={(e) => setPriceCents(e.target.value)}
            placeholder="15.00" 
            required
            className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Catégorie</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-500"
          >
            <option value="FONT_SPRITE">Police / Sprite</option>
            <option value="DIGITAL_GOOD">Bien Numérique</option>
            <option value="PHYSICAL_ARTIFACT">Objet Physique</option>
            <option value="LORE_SCROLL">Parchemin / Lore</option>
          </select>
        </div>
      </div>

      <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all">
        Ajouter au Catalogue
      </button>
    </form>
  );
}