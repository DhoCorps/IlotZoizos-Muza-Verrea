// apps/hub-central/app/[locale]/(inceptions)/marchand/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Store, Plus, Repeat, ShieldCheck } from 'lucide-react';
import { useEcommerce } from './useEcommerce';
import { ecommerce } from '@/lib/apiClient'; // 🔥 Import de notre client API

// Import de nos composants modulaires (Vérifie bien les majuscules sur tes fichiers physiques !)
import { StoreCard } from '../../../../components/ecommerce/stores/StoreCard';
import { StoreForm } from '../../../../components/ecommerce/stores/StoreForm';
import { ProductCard } from '../../../../components/ecommerce/products/ProductCard';
import { ProductForm } from '../../../../components/ecommerce/products/ProductForm';
import { BarterCard } from '../../../../components/ecommerce/barter/BarterCard';
import { BarterForm } from '../../../../components/ecommerce/barter/BarterForm';
import ResonanceButton from '../../../../components/resonance/ResonanceButton'; // 🕸️ NOUVEAU : Le tisseur de liens

export default function MarchandDashboard() {
  const { products, stores, wishlist, loading, activeTab, setActiveTab, refreshEcommerce } = useEcommerce();
  
  // États des modales d'action
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);

  // État local pour les offres de troc en attente
  const [barterOffers, setBarterOffers] = useState<any[]>([]);

  // 🔥 Utilisation du client API pour récupérer les offres
  const fetchBarterOffers = useCallback(async () => {
    try {
      const data = await ecommerce.getBarterOffers();
      setBarterOffers(data);
    } catch (err) {
      console.error("🌊 Erreur lors de la lecture des offres de troc :", err);
    }
  }, []);

  useEffect(() => {
    fetchBarterOffers();
  }, [fetchBarterOffers]);

  // 🔥 Utilisation du client API pour la wishlist
  const toggleWishlist = async (productUid: string) => {
    try {
      await ecommerce.toggleWishlist(productUid);
      refreshEcommerce();
    } catch (err) {
      console.error("Erreur wishlist :", err);
    }
  };

  // 🔥 Utilisation du client API pour résoudre le troc
  const handleResolveBarter = async (barterUid: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await ecommerce.resolveBarter(barterUid, status);
      fetchBarterOffers();
    } catch (err) {
      console.error("Erreur résolution troc :", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE SOUVERAIN DU MARCHAND */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingBag size={12} /> Le Marchand de l'Îlot
            </span>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={12} /> Stripe Connect & Troc Direct
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Boutiques, Artefacts & Échanges
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Explore le catalogue d'artefacts, gère tes propres comptoirs de vente sécurisés ou propose un troc direct d'actifs numériques entre créateurs de la matrice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button 
            onClick={() => setIsStoreModalOpen(true)}
            className="px-5 py-3.5 bg-black/60 border border-white/10 hover:border-white/30 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
          >
            <Store size={16} className="text-cyan-400" /> Ouvrir une Boutique
          </button>
          <button 
            onClick={() => setIsProductModalOpen(true)}
            className="px-5 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Déposer un Artefact
          </button>
        </div>
      </div>

      {/* 🎛️ BARRE DE NAVIGATION INTERACTIVE */}
      <div className="flex items-center justify-center gap-3 bg-black/30 p-2 border border-white/5 rounded-2xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'catalog' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag size={16} /> Catalogue ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('my-store')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my-store' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Store size={16} /> Mes Boutiques ({stores.length})
        </button>

        <button
          onClick={() => setActiveTab('barter')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'barter' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Repeat size={16} /> Comptoir de Troc ({barterOffers.length})
        </button>
      </div>

      {/* 📦 CONTENU : CATALOGUE DES PRODUITS */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {products.map((product: any) => {
            const isWishlisted = wishlist.includes(product.uid);
            return (
              <ProductCard 
                key={product.uid} 
                product={product} 
                isWishlisted={isWishlisted} 
                onToggleWishlist={toggleWishlist} 
              />
            );
          })}

          {products.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucun artefact disponible dans le catalogue pour l'instant.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🏪 CONTENU : GESTION DES BOUTIQUES */}
      {activeTab === 'my-store' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stores.map((store: any) => (
              <div key={store.uid} className="relative group">
                <StoreCard store={store} />
                
                {/* 🕸️ NOUVEAU : Bouton de Résonance pour la Boutique */}
                {/* Il est positionné en absolute pour s'intégrer discrètement sur la carte de la boutique */}
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ResonanceButton 
                    targetSlug={store.ownerSlug || store.ownerUid || 'marchand'} // Le slug du créateur de la boutique
                    type="FOLLOWS_SPECIFIC"
                    entityId={store.uid}
                    variant="icon"
                    initialIsFollowing={store.isFollowedByMe} // Mettre à jour depuis l'API plus tard
                  />
                </div>
              </div>
            ))}
          </div>

          {stores.length === 0 && !loading && (
            <div className="py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Store className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Tu ne possèdes encore aucune boutique active dans la matrice.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🔄 CONTENU : COMPTOIR DE TROC */}
      {activeTab === 'barter' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase text-white">Offres d'Échange Actives</h2>
              <p className="text-xs font-mono text-slate-400">Propose ou réponds aux requêtes de troc des autres créateurs.</p>
            </div>
            <button 
              onClick={() => setIsBarterModalOpen(true)}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Repeat size={14} /> Proposer un Troc
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {barterOffers.map((offer: any) => (
              <BarterCard key={offer.uid} offer={offer} onResolve={handleResolveBarter} />
            ))}
          </div>

          {barterOffers.length === 0 && (
            <div className="py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Repeat className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucune offre de troc en attente pour le moment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🪟 MODALE : CRÉATION DE BOUTIQUE */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <StoreForm 
              onSuccess={() => refreshEcommerce()} 
              onClose={() => setIsStoreModalOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* 🪟 MODALE : AJOUT DE PRODUIT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <ProductForm 
              stores={stores} 
              onSuccess={() => refreshEcommerce()} 
              onClose={() => setIsProductModalOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* 🪟 MODALE : PROPOSITION DE TROC */}
      {isBarterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <BarterForm 
              onSuccess={() => fetchBarterOffers()} 
              onClose={() => setIsBarterModalOpen(false)} 
            />
          </div>
        </div>
      )}

    </div>
  );
}