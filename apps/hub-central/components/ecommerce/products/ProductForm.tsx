// apps/hub-central/components/ecommerce/products/ProductForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ecommerce } from '../../../lib/apiClient';

export function ProductForm({ stores, onSuccess, onClose }: { stores: any[]; onSuccess: () => void; onClose: () => void }) {
  const [storeUid, setStoreUid] = useState(stores[0]?.uid || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [category, setCategory] = useState('FONT_SPRITE');
  const [visibility, setVisibility] = useState('PUBLIC');
  
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([
    { value: 'FONT_SPRITE', label: 'Police / Sprite' },
    { value: 'DIGITAL_GOOD', label: 'Bien Numérique' },
    { value: 'PHYSICAL_ARTIFACT', label: 'Objet Physique' },
    { value: 'LORE_SCROLL', label: 'Parchemin / Lore' }
  ]);

  useEffect(() => {
    fetch('/api/taxonomy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerce.createProduct({
        storeUid,
        title,
        description,
        priceCents: Math.round(parseFloat(priceCents) * 100),
        category,
        visibility
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
          <Plus size={16} className="text-[#E5484D]" /> Déposer un Artefact
        </h2>
        <button type="button" onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Boutique de Rattachement</label>
        <select 
          value={storeUid} 
          onChange={(e) => setStoreUid(e.target.value)}
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
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
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
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
          className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
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
            className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Catégorie</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Visibilité & Souveraineté</label>
        <select 
          value={visibility} 
          onChange={(e) => setVisibility(e.target.value)}
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
        >
          <option value="PUBLIC">🌍 Public</option>
          <option value="EXCHANGEABLE">🔄 Échangeable (Marketplace / Troc)</option>
          <option value="VISIBLE">👁️ Visible (Hors marché)</option>
          <option value="PRIVATE">🔒 Privé</option>
        </select>
      </div>

      <button type="submit" className="w-full py-4 bg-[#E5484D] hover:bg-[#d43b40] text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all">
        Ajouter au Catalogue
      </button>
    </form>
  );
}