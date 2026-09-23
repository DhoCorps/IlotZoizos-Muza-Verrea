'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ResonanceButton from '@/components/resonance/ResonanceButton'; 
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { Scale, Loader2, Share2, Tag as TagIcon } from 'lucide-react';
import { ProductComparator } from '@/components/ecommerce/comparator/ProductComparator';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { IUniversalMediaItem } from '@ilot/types';
import { useRouter, usePathname } from 'next/navigation';

export interface Product {
  uid: string;
  title: string;
  description?: string;
  priceCents: number;
  category: string;
  style?: string;
  author?: string;
  authorSlug?: string; 
  currency?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  tags?: string[];
}

interface MarketPlaceInteractiveProps {
  initialProducts: Product[];
  initialFilters: {
    category: string;
    style: string;
    author: string;
    tagQuery: string;
  };
}

export function MarketPlaceInteractive({ initialProducts, initialFilters }: MarketPlaceInteractiveProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Initialisation des états avec les filtres venus du Serveur (SSR)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilters.category || 'ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>(initialFilters.style || 'ALL');
  const [selectedAuthor, setSelectedAuthor] = useState<string>(initialFilters.author || 'ALL');
  const [tagQuery, setTagQuery] = useState<string>(initialFilters.tagQuery || '');

  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [activeMediaForWidget, setActiveMediaForWidget] = useState<IUniversalMediaItem | null>(null);

  // 🌐 Synchronisation permanente avec l'URL pour rendre les recherches partageables
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (selectedStyle !== 'ALL') params.set('style', selectedStyle);
    if (selectedAuthor !== 'ALL') params.set('author', selectedAuthor);
    if (tagQuery.trim()) params.set('tag', tagQuery.trim());

    const queryStr = params.toString();
    const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedCategory, selectedStyle, selectedAuthor, tagQuery, pathname, router]);

  usePageChapeauContext({
    recipientUid: 'canopy_marketplace_treasury',
    recipientPseudo: 'Le Grand Bazar',
    targetTitle: 'Place de marché ouverte',
  });

  // 🌀 L'astuce SSR parfaite : initialData prend le relai instantanément avant que React Query ne fetch
  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['marketplace', selectedCategory, selectedStyle, selectedAuthor, tagQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStyle !== 'ALL') params.append('style', selectedStyle);
      if (selectedAuthor !== 'ALL') params.append('author', selectedAuthor);
      if (tagQuery.trim()) params.append('tag', tagQuery.trim());

      const res = await fetch(`/api/ecommerce/marketPlace?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error("Échec de la synchronisation");
      return json.data as Product[];
    },
    initialData: initialProducts
  });

  const { categories, styles, authors } = useMemo(() => ({
    categories: Array.from(new Set(products.map((p: Product) => p.category).filter(Boolean))),
    styles: Array.from(new Set(products.map((p: Product) => p.style).filter(Boolean))),
    authors: Array.from(new Set(products.map((p: Product) => p.author).filter(Boolean)))
  }), [products]);

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const isAlreadyIn = prev.some(p => p.uid === product.uid);
      if (isAlreadyIn) return prev.filter(p => p.uid !== product.uid);
      if (prev.length >= 3) {
        toast.error("Limite de comparaison : 3 artefacts max.");
        return prev;
      }
      return [...prev, product];
    });
  };

  const handleOpenWidget = (product: Product) => {
    setActiveMediaForWidget({
      mediaId: product.uid,
      sourceApp: 'GALLERY',
      ownerUid: product.authorSlug || product.author || '',
      ownerSlug: product.author || 'marchand-inconnu',
      title: product.title,
      mediaUrl: product.thumbnailUrl || '', 
      thumbnailUrl: product.thumbnailUrl,
      priceCents: product.priceCents,
      consentForShowcase: true,
      consentForMusicSync: false,
      createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
    });
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Barre de Filtres Multicritères incluant la recherche par Tag */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TagIcon size={12} className="text-emerald-400" /> Recherche par Tag
          </label>
          <input 
            type="text"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="ex: cyberpunk, synth..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {[
          { label: 'Catégorie', value: selectedCategory, setter: setSelectedCategory, list: categories, all: 'Toutes' },
          { label: 'Style / Résonance', value: selectedStyle, setter: setSelectedStyle, list: styles, all: 'Tous' },
          { label: 'Auteur', value: selectedAuthor, setter: setSelectedAuthor, list: authors, all: 'Tous' }
        ].map(filter => (
          <div key={filter.label}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{filter.label}</label>
            <select
              value={filter.value}
              onChange={(e) => filter.setter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">{filter.all}</option>
              {filter.list.map((item: any) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Grille des Produits */}
      {loading && products.length === 0 ? (
        <div className="text-center py-20 text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Recensement des artefacts dans la silice...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-slate-800/50">
          <p className="text-slate-400">Aucun artefact ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const targetSlug = product.authorSlug || product.author?.toLowerCase().replace(/\s+/g, '-') || 'marchand-inconnu';
            const isComparing = compareList.some(p => p.uid === product.uid);

            return (
              <div 
                key={product.uid}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all shadow-lg relative ${isComparing ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-800 hover:border-emerald-500/50'}`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-mono uppercase bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-800/50">
                      {product.category}
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      {(product.priceCents / 100).toFixed(2)} {product.currency || 'EUR'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 mb-1 pr-8">{product.title}</h3>
                  
                  {product.author && (
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs text-slate-400">Par <span className="text-slate-300 font-medium">{product.author}</span></p>
                      <div className="scale-75 origin-left">
                        <ResonanceButton targetSlug={targetSlug} type="FOLLOWS_GLOBAL" variant="icon" />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-slate-400 line-clamp-3 mb-4">{product.description || '...'}</p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleCompare(product)}
                      title="Comparer"
                      className={`p-2.5 rounded-lg transition-colors border ${isComparing ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}
                    >
                      <Scale size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenWidget(product)}
                      title="Interagir & Partager"
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-sky-500/50 transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                  <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors shadow-sm text-center">
                    Examiner l'Artefact
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparateur */}
      {compareList.length > 0 && !isComparatorOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-emerald-500/50 p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <span className="text-xs font-bold text-white uppercase tracking-widest">{compareList.length} Artefact(s) prêt(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsComparatorOpen(true)} className="px-4 py-2 bg-emerald-600 text-slate-950 text-xs font-black uppercase rounded-xl">Comparer</button>
            <button onClick={() => setCompareList([])} className="px-3 py-2 text-[10px] text-slate-400 uppercase">Vider</button>
          </div>
        </div>
      )}

      {isComparatorOpen && (
        <ProductComparator 
          products={compareList} 
          onClose={() => setIsComparatorOpen(false)} 
          onRemove={(uid) => setCompareList(prev => prev.filter(p => p.uid !== uid))}
        />
      )}

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