// apps/hub-central/app/[locale]/(inceptions)/wishlist/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderHeart, Trash2, Share2, ShoppingBag, Loader2, HeartCrack, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { IUniversalMediaItem } from '@ilot/types';
import { Link } from '@/navigation';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const [selectedListUid, setSelectedListUid] = useState<string | null>(null);
  
  // 🧩 État du widget universel
  const [activeMediaForWidget, setActiveMediaForWidget] = useState<IUniversalMediaItem | null>(null);

  // 🦅 Synchronisation du contexte
  usePageChapeauContext({
    recipientUid: 'canopy_wishlist_manager',
    recipientPseudo: 'Garde des Trésors',
    targetTitle: 'Sanctuaire des Envies',
  });

  // 🌀 SUTURE REACT QUERY : Récupération des Wishlists
  const { data: wishlists = [], isLoading: loadingWishlists } = useQuery({
    queryKey: ['wishlists'],
    queryFn: async () => {
      const res = await fetch('/api/wishlists');
      const json = await res.json();
      if (!json.success) throw new Error("Échec de la récupération des listes");
      return json.data;
    }
  });

  // 🌀 SUTURE REACT QUERY : On simule la récupération des détails des produits contenus dans les listes
  // Dans un cas réel, tu ferais un fetch vers `/api/ecommerce/products?uids=${productUids.join(',')}`
  const { data: productsMap = {}, isLoading: loadingProducts } = useQuery({
    queryKey: ['wishlist-products', wishlists],
    queryFn: async () => {
      const allProductUids = wishlists.flatMap((w: any) => w.productUids);
      if (allProductUids.length === 0) return {};
      
      const res = await fetch(`/api/ecommerce/products/batch?uids=${allProductUids.join(',')}`);
      if (!res.ok) return {}; // Fallback silencieux
      const json = await res.json();
      
      // Transforme le tableau en dictionnaire { uid: productData }
      return json.data.reduce((acc: any, prod: any) => {
        acc[prod.uid] = prod;
        return acc;
      }, {});
    },
    enabled: wishlists.length > 0
  });

  // 💥 MUTATION : Retirer un artefact de la liste
  const removeItemMutation = useMutation({
    mutationFn: async (productUid: string) => {
      const res = await fetch(`/api/wishlists/${productUid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Impossible de retirer l'artefact");
      return productUid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      toast.success("Artefact retiré du sanctuaire.");
    },
    onError: (err: any) => toast.error(err.message)
  });

  // 💥 MUTATION : Dissoudre une liste entière
  const deleteListMutation = useMutation({
    mutationFn: async (listUid: string) => {
      const res = await fetch(`/api/wishlists/${listUid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Impossible de dissoudre la liste");
      return listUid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setSelectedListUid(null);
      toast.success("Liste dissoute dans la matrice.");
    }
  });

  const activeList = useMemo(() => {
    if (!wishlists.length) return null;
    if (!selectedListUid) return wishlists[0];
    return wishlists.find((w: any) => w.uid === selectedListUid) || wishlists[0];
  }, [wishlists, selectedListUid]);

  const handleOpenWidget = (productUid: string) => {
    const product = productsMap[productUid];
    if (!product) {
      toast.error("Données de l'artefact incomplètes.");
      return;
    }

    setActiveMediaForWidget({
      mediaId: product.uid,
      sourceApp: 'DHO', 
      ownerUid: product.authorUid || product.ownerUid || '',
      ownerSlug: product.author || product.storeName || 'marchand',
      title: product.title,
      mediaUrl: product.thumbnailUrl || '', 
      thumbnailUrl: product.thumbnailUrl,
      priceCents: product.priceCents,
      consentForShowcase: true,
      consentForMusicSync: false,
      createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
    });
  };

  const isLoading = loadingWishlists || loadingProducts;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 pt-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE DU SANCTUAIRE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <FolderHeart size={12} /> Sanctuaire Personnel
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Le Trésor de l'Îlot
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Retrouve ici les artefacts, monologues et partitions que tu as gardés près de ton cœur. Navigue entre tes listes et interagis avec tes trouvailles.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
        </div>
      ) : wishlists.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-slate-900/40 border border-white/5 rounded-3xl shadow-inner">
          <HeartCrack className="w-12 h-12 mx-auto text-slate-600" />
          <h2 className="text-lg font-black uppercase text-white">Aucun Trésor</h2>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
            Ton sanctuaire est vide. Explore le Grand Bazar ou l'AbyssBlog.
          </p>
          <Link href="/marketplace" className="inline-block mt-4 px-6 py-3 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-[10px] rounded-xl transition-all shadow-[0_0_15px_rgba(229,72,77,0.3)]">
            Explorer la Matrice
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* 📁 SIDEBAR : NAVIGATION DES LISTES */}
          <div className="lg:w-1/4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Mes Listes</h3>
            <div className="space-y-2">
              {wishlists.map((list: any) => {
                const isActive = activeList?.uid === list.uid;
                return (
                  <div key={list.uid} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedListUid(list.uid)}
                      className={`flex-1 p-4 rounded-2xl text-left transition-all border ${
                        isActive 
                          ? 'bg-[#E5484D]/10 border-[#E5484D]/30 text-white shadow-lg' 
                          : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate">{list.name}</span>
                        <span className="text-[10px] font-mono bg-black/50 px-2 py-0.5 rounded-full">
                          {list.productUids?.length || 0}
                        </span>
                      </div>
                    </button>
                    
                    {list.name !== 'Favoris Principaux' && (
                      <button 
                        onClick={() => { if(confirm("Dissoudre cette liste ?")) deleteListMutation.mutate(list.uid); }}
                        className="p-4 bg-black/20 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded-2xl transition-all"
                        title="Dissoudre la liste"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 💎 CONTENU : LES ARTEFACTS DE LA LISTE ACTIVE */}
          <div className="lg:w-3/4 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#E5484D]" /> {activeList?.name}
              </h2>
            </div>

            {activeList?.productUids?.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-black/20 border border-white/5 rounded-3xl border-dashed">
                <FolderHeart className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs font-mono text-slate-500">Cette liste est vide.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activeList?.productUids.map((uid: string) => {
                  const product = productsMap[uid];
                  
                  // Fallback si le produit n'est pas encore chargé ou introuvable
                  if (!product) {
                    return (
                      <div key={uid} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-600">Artefact {uid.substring(0,8)}...</span>
                        <button onClick={() => removeItemMutation.mutate(uid)} className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
                      </div>
                    );
                  }

                  return (
                    <div key={uid} className="bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className="text-[10px] font-mono uppercase bg-slate-950 text-slate-300 px-2 py-1 rounded-full border border-slate-800">
                            {product.category || 'Objet'}
                          </span>
                          <span className="text-sm font-bold text-amber-400">
                            {((product.priceCents || 0) / 100).toFixed(2)} {product.currency || 'EUR'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 mb-1 line-clamp-1">{product.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4">{product.description || '...'}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center gap-2">
                        <button 
                          onClick={() => removeItemMutation.mutate(uid)}
                          disabled={removeItemMutation.isPending}
                          className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:text-red-400 hover:border-red-500/30 transition-colors"
                          title="Retirer de la liste"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <div className="flex gap-2 w-full">
                          <button 
                            onClick={() => handleOpenWidget(uid)}
                            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-sky-500/50 transition-colors"
                            title="Interagir & Partager"
                          >
                            <Share2 size={16} />
                          </button>
                          
                          <Link 
                            href={{
                              pathname: '/ecommerce/[slug]',
                              params: { slug: product.slug || uid }
                            }} 
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-xl text-[10px] uppercase transition-colors text-center flex items-center justify-center gap-2"
                          >
                            <ShoppingBag size={14} /> Voir l'Artefact
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🧩 Rendu du Prisme d'Interaction centralisé */}
      {activeMediaForWidget && (
        <OmniActionWidget 
          media={activeMediaForWidget}
          isOpen={!!activeMediaForWidget}
          onClose={() => setActiveMediaForWidget(null)}
        />
      )}
    </div>
  );
}