'use client';

import React, { useState, useMemo } from 'react';
import { UniversalGridCanvas, useCartStore } from '@ilot/shared-core';
import { storeRegistry } from '@/components/ecommerce/stores/StoreRegistry';
import { AddToWishlistButton } from '@/components/ecommerce/wishlist/AddWishListButton';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { KarmaRouletteModal } from '@/components/ecommerce/roulette/KarmaRouletteModal';
import { RaffleDrawAnimation } from '@/components/raffle/RaffleDrawAnimation'; // 🚀 Import de l'animation dramatique
import { ShoppingBag, Share2, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { IUniversalMediaItem } from '@ilot/types';

export function ProductDetailInteractive({ product }: { product: any }) {
  const { addItem } = useCartStore();
  const [isWidgetOpen, setWidgetOpen] = useState(false);
  const [isRouletteOpen, setRouletteOpen] = useState(false);

  // 🦅 Transformation en Média Universel pour l'OmniActionWidget
  const universalMediaItem: IUniversalMediaItem = useMemo(() => ({
    mediaId: product.uid,
    sourceApp: 'DHO',
    ownerUid: product.authorUid || product.ownerUid || '',
    ownerSlug: product.author || product.storeName || 'anonyme',
    title: product.title,
    mediaUrl: product.thumbnailUrl || '', 
    thumbnailUrl: product.thumbnailUrl || undefined,
    priceCents: product.priceCents,
    consentForShowcase: !!product.settings?.consentForShowcase,
    consentForMusicSync: !!product.settings?.consentForMusicSync,
    createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
  }), [product]);

  const handleAddToCart = () => {
    addItem({
      uid: product.uid,
      title: product.title,
      priceEUR: product.priceCents / 100,
      priceShards: Math.round(product.priceCents / 10),
      category: product.category
    });
    toast.success("✨ Artefact ajouté à votre panier.");
  };

  return (
    <div className="space-y-8">
      {/* ⚡ Actions d'Interaction Secondaires */}
      <div className="flex justify-end gap-3">
        <button 
          onClick={() => setRouletteOpen(true)}
          className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 transition-all flex items-center gap-2 shadow-lg"
        >
          <Sparkles size={14} /> Roue Karmique
        </button>
        <button 
          onClick={() => setWidgetOpen(true)} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-2 shadow-lg"
        >
          <Share2 size={14} /> Interagir & Partager
        </button>
        <AddToWishlistButton productUid={product.uid} />
      </div>

      {/* 🏆 VUE DE RÉSULTAT DE LOTERIE (Si le tirage est clos et le gagnant connu) */}
      {product.isRaffle && product.raffleWinnerPseudo && (
        <div className="my-6">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-mono text-xs uppercase tracking-widest">
            <Trophy size={16} /> Résultat du Sceau de Loterie
          </div>
          <RaffleDrawAnimation winnerPseudo={product.raffleWinnerPseudo} />
        </div>
      )}

      {/* 🖼️ Rendu dynamique du canevas modulaire */}
      {product.blocks?.length > 0 ? (
        <div className="pointer-events-none">
          <UniversalGridCanvas 
            blocks={product.blocks}
            registry={storeRegistry}
            selectedBlockId={null}
            onSelectBlock={() => {}}
            onUpdateLayout={() => {}}
            onToggleBlock={() => {}}
          />
        </div>
      ) : (
        <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6">
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 uppercase font-bold">
            {product.category}
          </span>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">{product.title}</h1>
          <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* 🛒 Barre d'action et d'achat */}
      <div className="p-6 bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Valeur de l'artefact</span>
          <div className="text-2xl font-black text-white flex items-center gap-3">
            <span>{(product.priceCents / 100).toFixed(2)} {product.currency || 'EUR'}</span>
            <span className="text-xs font-mono text-slate-500 font-normal">| Stock : {product.stock}</span>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="px-8 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag size={16} /> Acquérir l'Artefact
        </button>
      </div>

      {/* 🌀 Modales d'interaction */}
      <OmniActionWidget 
        media={universalMediaItem}
        isOpen={isWidgetOpen}
        onClose={() => setWidgetOpen(false)}
      />

      <KarmaRouletteModal 
        productUid={product.uid}
        productTitle={product.title}
        isOpen={isRouletteOpen}
        onClose={() => setRouletteOpen(false)}
      />
    </div>
  );
}