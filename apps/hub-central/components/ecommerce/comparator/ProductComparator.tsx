// apps/hub-central/components/ecommerce/ProductComparator.tsx
'use client';

import React from 'react';
import { Scale, X, ShoppingBag } from 'lucide-react';

interface Product {
  uid: string;
  title: string;
  description?: string;
  priceCents: number;
  category: string;
  style?: string;
  author?: string;
  currency?: string;
}

interface ProductComparatorProps {
  products: Product[];
  onClose: () => void;
  onRemove: (uid: string) => void;
}

export function ProductComparator({ products, onClose, onRemove }: ProductComparatorProps) {
  if (products.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-950 border border-emerald-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <Scale size={20} /> Comparateur d'Artefacts ({products.length}/3)
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto py-6 custom-scrollbar">
          <div className="flex gap-4 min-w-max">
            {products.map((product) => (
              <div key={product.uid} className="w-80 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col relative group">
                <button 
                  onClick={() => onRemove(product.uid)}
                  className="absolute top-3 right-3 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>

                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/50 self-start mb-3">
                  {product.category}
                </span>

                <h3 className="text-lg font-bold text-white mb-4 pr-6 leading-tight">{product.title}</h3>
                
                <div className="space-y-4 flex-1">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Valeur</span>
                    <span className="text-xl font-black text-amber-400">
                      {(product.priceCents / 100).toFixed(2)} {product.currency || 'EUR'}
                    </span>
                  </div>
                  
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Créateur</span>
                    <span className="text-sm text-slate-200">{product.author || 'Inconnu'}</span>
                  </div>

                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Style / Résonance</span>
                    <span className="text-sm text-slate-200">{product.style || 'Non spécifié'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Description</span>
                    <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed">
                      {product.description || 'Aucune description fournie.'}
                    </p>
                  </div>
                </div>

                <button className="mt-6 w-full py-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                  <ShoppingBag size={14} /> Acquérir
                </button>
              </div>
            ))}

            {/* Emplacement vide pour inciter à ajouter */}
            {products.length < 3 && (
              <div className="w-80 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 p-6 opacity-50">
                <Scale size={32} className="mb-4" />
                <p className="text-xs font-mono uppercase text-center tracking-widest">
                  Ajoutez un autre artefact pour comparer
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}