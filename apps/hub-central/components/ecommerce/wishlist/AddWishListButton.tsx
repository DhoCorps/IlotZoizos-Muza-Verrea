// apps/hub-central/components/ecommerce/AddToWishlistButton.tsx
'use client';

import React, { useState } from 'react';
import { Heart, Check, Plus, FolderHeart } from 'lucide-react';
import { useWishlistStore } from '@ilot/shared-core';

export function AddToWishlistButton({ productUid }: { productUid: string }) {
  const { wishlists, createWishlist, toggleItemInWishlist, isInWishlist } = useWishlistStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createWishlist(newListName.trim());
    setNewListName('');
    setCreating(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-red-400 rounded-2xl border border-white/10 transition-all flex items-center gap-2"
        title="Ajouter aux wishlists"
      >
        <Heart size={16} className="text-red-400 fill-red-400/20" />
        <span className="text-[10px] font-mono uppercase font-bold">Wishlist</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0A0D14] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 space-y-3 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <FolderHeart size={14} className="text-[#E5484D]" /> Mes Wishlists
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {wishlists.map((wl) => {
              const inThisList = isInWishlist(wl.id, productUid);
              return (
                <button
                  key={wl.id}
                  onClick={() => toggleItemInWishlist(wl.id, productUid)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all ${
                    inThisList 
                      ? 'bg-[#E5484D]/10 text-white border border-[#E5484D]/30' 
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{wl.name}</span>
                  {inThisList && <Check size={14} className="text-[#E5484D]" />}
                </button>
              );
            })}
          </div>

          {creating ? (
            <form onSubmit={handleCreateList} className="space-y-2 pt-2 border-t border-white/5">
              <input
                type="text"
                placeholder="Nom de la nouvelle liste..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-1.5 bg-[#E5484D] text-white text-[10px] uppercase font-bold rounded-lg">Créer</button>
                <button type="button" onClick={() => setCreating(false)} className="px-2 py-1.5 bg-white/5 text-slate-400 text-[10px] rounded-lg">Annuler</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono uppercase font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus size={12} /> Nouvelle liste
            </button>
          )}
        </div>
      )}
    </div>
  );
}