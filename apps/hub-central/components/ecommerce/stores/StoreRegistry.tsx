// apps/hub-central/components/ecommerce/store.registry.tsx
'use client';

import React from 'react';
import { BlockRegistry } from '@ilot/shared-core';
import { Coins, Shield, Tag, Layers } from 'lucide-react';

export const storeRegistry: BlockRegistry = {
  'product-hero': {
    label: 'En-tête & Prix de l’Artefact',
    defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
    defaultData: {
      title: 'Parchemin Cybernétique V1',
      subtitle: 'Artefact souverain forgé dans les profondeurs de l’Îlot.',
      priceEUR: 45,
      priceShards: 120,
      category: 'CV_TEMPLATE'
    },
    renderView: ({ data }) => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 uppercase font-bold">
            {data.category || 'PRODUIT'}
          </span>
          <div className="flex items-center gap-3 text-xs font-mono font-bold">
            <span className="text-white">{data.priceEUR || 0} €</span>
            <span className="text-amber-400 flex items-center gap-1">
              <Coins size={12} /> {data.priceShards || 0} Éclats
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">{data.title}</h2>
        <p className="text-xs text-slate-400 italic">{data.subtitle}</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Titre de l'Artefact</label>
          <input 
            type="text" 
            value={data.title || ''} 
            onChange={e => onChange({ ...data, title: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Sous-titre / Accroche</label>
          <input 
            type="text" 
            value={data.subtitle || ''} 
            onChange={e => onChange({ ...data, subtitle: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Prix (€)</label>
            <input 
              type="number" 
              value={data.priceEUR || 0} 
              onChange={e => onChange({ ...data, priceEUR: Number(e.target.value) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Prix (Éclats)</label>
            <input 
              type="number" 
              value={data.priceShards || 0} 
              onChange={e => onChange({ ...data, priceShards: Number(e.target.value) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-amber-400 font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
        </div>
      </div>
    )
  },

  'product-details': {
    label: 'Description & Spécifications',
    defaultLayout: { x: 0, y: 2, w: 12, h: 3 },
    defaultData: {
      description: 'Cet artefact intègre des protocoles de synchronisation avancés entre MongoDB et Neo4j, garantissant une intégrité totale des flux de données.'
    },
    renderView: ({ data }) => (
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Spécifications</span>
        <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{data.description}</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div>
        <label className="text-[10px] font-mono text-slate-400 uppercase">Description Détaillée</label>
        <textarea 
          rows={5}
          value={data.description || ''} 
          onChange={e => onChange({ ...data, description: e.target.value })}
          className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
        />
      </div>
    )
  }
};