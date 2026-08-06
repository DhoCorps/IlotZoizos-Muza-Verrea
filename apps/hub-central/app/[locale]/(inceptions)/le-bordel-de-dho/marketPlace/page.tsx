// apps/hub-central/app/[locale]/(inceptions)/marketPlace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import ResonanceButton from '../../../../../components/resonance/ResonanceButton'; // 🕸️ NOUVEAU : Import du tisseur

interface Product {
  uid: string;
  title: string;
  description?: string;
  priceCents: number;
  category: string;
  style?: string;
  author?: string;
  authorSlug?: string; // 🕸️ NOUVEAU : Nécessaire pour la Résonance
  currency?: string;
}

export default function MarketPlacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // États des filtres
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('ALL');

  // Listes dynamiques pour les sélecteurs de filtres
  const [categories, setCategories] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  useEffect(() => {
    fetchMarketplaceData();
  }, [selectedCategory, selectedStyle, selectedAuthor]);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStyle !== 'ALL') params.append('style', selectedStyle);
      if (selectedAuthor !== 'ALL') params.append('author', selectedAuthor);

      const res = await fetch(`/api/ecommerce/marketPlace?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        const data: Product[] = json.data;
        setProducts(data);

        // Extraction unique pour les filtres si non initialisés
        if (categories.length === 0) {
          const uniqueCats = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
          setCategories(uniqueCats as string[]);
        }
        if (styles.length === 0) {
          const uniqueStyles = Array.from(new Set(data.map(p => p.style).filter(Boolean)));
          setStyles(uniqueStyles as string[]);
        }
        if (authors.length === 0) {
          const uniqueAuthors = Array.from(new Set(data.map(p => p.author).filter(Boolean)));
          setAuthors(uniqueAuthors as string[]);
        }
      }
    } catch (err) {
      console.error("Erreur de synchronisation du Marketplace :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-400">
            🕊️ Le Grand Marché des Artefacts (Marketplace)
          </h1>
          <p className="text-slate-400 mt-2">
            Explorez, filtrez et échangez les créations souveraines de la volière.
          </p>
        </div>

        {/* Barre de Filtres Multicritères */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          
          {/* Filtre par Catégorie */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Catégorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filtre par Style / Vibe */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Style / Résonance
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tous les styles</option>
              {styles.map((sty) => (
                <option key={sty} value={sty}>{sty}</option>
              ))}
            </select>
          </div>

          {/* Filtre par Auteur / Autrice */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Auteur / Autrice (Oiseau)
            </label>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tous les créateurs</option>
              {authors.map((aut) => (
                <option key={aut} value={aut}>{aut}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Grille des Produits */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse">
            Recensement des artefacts en cours dans la silice...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-slate-800/50">
            <p className="text-slate-400">Aucun artefact ne correspond à ces critères dans la matrice.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              // Fallback : Si l'API ne renvoie pas encore authorSlug, on utilise le nom formaté en attendant.
              // Il faudra t'assurer que ton endpoint /api/ecommerce/marketPlace peuple bien 'authorSlug' ou 'ownerUid'
              const targetSlug = product.authorSlug || product.author?.toLowerCase().replace(/\s+/g, '-') || 'marchand-inconnu';

              return (
                <div 
                  key={product.uid}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-lg group relative"
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
                        
                        {/* 🕸️ NOUVEAU : Bouton de Résonance vers l'auteur */}
                        <div className="scale-75 origin-left">
                          <ResonanceButton 
                            targetSlug={targetSlug}
                            type="FOLLOWS_GLOBAL" 
                            variant="icon"
                          />
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-400 line-clamp-3 mb-4">
                      {product.description || 'Artefact souverain sans description textuelle.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    {product.style && (
                      <span className="text-xs text-slate-500 italic">Style : {product.style}</span>
                    )}
                    <button 
                      onClick={() => alert(`Demande d'échange / acquisition initiée pour : ${product.title}`)}
                      className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                    >
                      Examiner l'Artefact
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}