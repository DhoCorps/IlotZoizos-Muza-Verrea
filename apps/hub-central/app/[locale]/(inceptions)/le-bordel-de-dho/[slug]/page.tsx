// apps/hub-central/app/[locale]/(inceptions)/ecommerce/[slug]/page.tsx
'use client';

import React, { use } from 'react';
import { UniversalGridCanvas, useCartStore } from '@ilot/shared-core';
import { storeRegistry } from '@/components/ecommerce/stores/StoreRegistry';
import { AddToWishlistButton } from '@/components/ecommerce/wishlist/AddWishListButton';
import { ShoppingBag, Loader2, ArrowLeft, Box } from 'lucide-react';
import { Link } from '@/navigation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = use(params);
  const { addItem } = useCartStore();

  // 🌀 SUTURE REACT QUERY : Récupération intelligente
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetch(`/api/ecommerce/products/${slug}`);
      if (!res.ok) throw new Error("Artefact introuvable");
      return res.json();
    },
    enabled: !!slug
  });

  // 🦅 Synchronisation du contexte de la page avec le Chapeau Flottant
  usePageChapeauContext({
    recipientUid: product?.authorUid || product?.ownerUid || 'canopy_store_treasury',
    recipientPseudo: product?.author || product?.storeName || 'le Marchand',
    targetTitle: product?.title || 'Artefact de la Canopée',
    storeUid: product?.storeUid,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-4">
        <Box className="w-12 h-12 mx-auto text-slate-600" />
        <h2 className="text-xl font-black uppercase text-white">Artefact introuvable</h2>
        <p className="text-xs font-mono text-slate-400">Cet objet a été dissous dans les abîmes de la matrice.</p>
        <Link href="/marketplace" className="inline-block mt-4 px-6 py-3 bg-white/5 text-white font-mono text-xs rounded-xl border border-white/10 hover:bg-white/10 transition-all">
          Retour au Grand Bazar
        </Link>
      </div>
    );
  }

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
    <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={14} /> Retour au Grand Bazar
        </Link>
        <AddToWishlistButton productUid={product.uid} />
      </div>

      {/* Rendu dynamique du canevas modulaire */}
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

      {/* Barre d'action et d'achat */}
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
    </div>
  );
}