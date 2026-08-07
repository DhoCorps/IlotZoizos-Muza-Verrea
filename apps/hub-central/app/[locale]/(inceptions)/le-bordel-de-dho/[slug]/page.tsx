// apps/hub-central/app/[locale]/(inceptions)/ecommerce/[slug]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { UniversalGridCanvas, useCartStore } from '@ilot/shared-core';
import { storeRegistry } from '@/components/ecommerce/stores/StoreRegistry';
import { AddToWishlistButton } from '@/components/ecommerce/wishlist/AddWishListButton';
import { ShoppingBag, Loader2, ArrowLeft, Coins, ShieldCheck, Box } from 'lucide-react';
import { Link } from '@/navigation';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addItem, setCurrency } = useCartStore();

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      fetch(`/api/ecommerce/products/${p.slug}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setProduct(data);
        })
        .catch(err => console.error("🔥 Erreur de lecture de l'artefact :", err))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-4">
        <Box className="w-12 h-12 mx-auto text-slate-600" />
        <h2 className="text-xl font-black uppercase text-white">Artefact introuvable</h2>
        <p className="text-xs font-mono text-slate-400">Cet objet a peut-être été dissous dans les abîmes de la matrice.</p>
        <Link href="/marketplace" className="inline-block mt-4 px-6 py-3 bg-white/5 text-white font-mono text-xs rounded-xl border border-white/10">
          Retour au Grand Bazar
        </Link>
      </div>
    );
  }

  const priceFormatted = (product.priceCents / 100).toFixed(2);

  const handleAddToCart = () => {
    addItem({
      uid: product.uid,
      title: product.title,
      priceEUR: product.priceCents / 100,
      priceShards: Math.round(product.priceCents / 10), // Conversion symbolique en éclats si non défini
      category: product.category
    });
    alert("✨ Artefact ajouté à votre panier.");
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

      {/* Rendu dynamique du canevas modulaire s'il existe, sinon vue classique */}
      {product.blocks && product.blocks.length > 0 ? (
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
            <span>{priceFormatted} {product.currency || 'EUR'}</span>
            <span className="text-xs font-mono text-slate-500 font-normal">| Stock : {product.stock}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleAddToCart}
            className="flex-1 sm:flex-initial px-8 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag size={16} /> Acquérir l'Artefact
          </button>
        </div>
      </div>

    </div>
  );
}