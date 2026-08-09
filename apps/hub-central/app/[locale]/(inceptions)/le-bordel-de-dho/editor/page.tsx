// apps/hub-central/app/[locale]/(inceptions)/ecommerce/editor/page.tsx
'use client';

import React from 'react';
import { useBlockEngine, UniversalGridCanvas } from '@ilot/shared-core';
import { storeRegistry } from '@/components/ecommerce/stores/StoreRegistry';
import { Sparkles, Save, ArrowLeft, Plus, Box, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

const INITIAL_PRODUCT_BLOCKS = [
  {
    id: 'block-product-hero',
    type: 'product-hero',
    title: 'En-tête Produit',
    enabled: true,
    layout: { x: 0, y: 0, w: 12, h: 2 },
    data: {
      title: 'Artefact Souverain de l’Îlot',
      subtitle: 'Création originale prête à être diffusée dans la matrice.',
      priceEUR: 25,
      priceShards: 80,
      category: 'CV_TEMPLATE'
    }
  },
  {
    id: 'block-product-details',
    type: 'product-details',
    title: 'Spécifications',
    enabled: true,
    layout: { x: 0, y: 2, w: 12, h: 3 },
    data: {
      description: 'Détails techniques de l’artefact et compatibilité avec les flux synaptiques.'
    }
  }
];

export default function EcommerceEditorPage() {
  const {
    blocks,
    selectedBlock,
    selectedBlockId,
    setSelectedBlockId,
    updateLayout,
    updateData,
    addBlock,
    toggleBlock
  } = useBlockEngine(INITIAL_PRODUCT_BLOCKS);

  // 🌀 SUTURE REACT QUERY : Mutation pour la sédimentation du produit
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/ecommerce/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Échec de la sédimentation');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("✨ Artefact e-commerce sédimenté avec succès dans le catalogue !");
    },
    onError: (err: any) => {
      console.error("🔥 Fracture lors de la sédimentation du produit :", err);
      toast.error(`🔥 Erreur : ${err.message}`);
    }
  });

  const handleSaveProduct = () => {
    const heroBlock = blocks.find(b => b.type === 'product-hero');
    const detailsBlock = blocks.find(b => b.type === 'product-details');

    const payload = {
      title: heroBlock?.data.title || 'Artefact sans nom',
      description: detailsBlock?.data.description || '',
      priceEUR: Number(heroBlock?.data.priceEUR) || 0,
      priceShards: Number(heroBlock?.data.priceShards) || 0,
      category: heroBlock?.data.category || 'PHYSICAL',
      rawLayoutBlocks: blocks
    };

    saveProductMutation.mutate(payload);
  };

  const handleAddModule = (type: string) => {
    const newBlock = {
      id: `block-${type}-${Date.now()}`,
      type,
      title: storeRegistry[type]?.label || 'Nouveau Bloc',
      enabled: true,
      layout: storeRegistry[type]?.defaultLayout || { x: 0, y: 0, w: 12, h: 3 },
      data: { ...storeRegistry[type]?.defaultData }
    };
    addBlock(newBlock);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE DE L'ÉDITEUR E-COMMERCE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="space-y-2">
          <Link 
            href="/[locale]/marketplace"
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Retour au Grand Bazar
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Forge d'Artefacts & Produits
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">
            Éditeur Modulaire de Vitrine
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleAddModule('product-details')}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-mono text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> + Spécifications
          </button>

          <button 
            onClick={handleSaveProduct}
            disabled={saveProductMutation.isPending}
            className="px-6 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saveProductMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            Sédimenter l'Artefact
          </button>
        </div>
      </div>

      {/* 📐 LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-8">
          <UniversalGridCanvas 
            blocks={blocks}
            registry={storeRegistry}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateLayout={updateLayout}
            onToggleBlock={toggleBlock}
          />
        </div>

        {/* Panneau latéral de configuration */}
        <div className="lg:col-span-4 sticky top-6">
          {selectedBlock ? (
            <div className="p-6 bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  Config : {storeRegistry[selectedBlock.type]?.label}
                </span>
                <button 
                  onClick={() => setSelectedBlockId(null)}
                  className="text-xs font-mono text-slate-500 hover:text-white"
                >
                  [ Fermer ]
                </button>
              </div>
              {React.createElement(storeRegistry[selectedBlock.type].renderEditForm, {
                data: selectedBlock.data,
                onChange: (newData: any) => updateData(selectedBlock.id, newData)
              })}
            </div>
          ) : (
            <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl text-center space-y-3">
              <Box className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
              <p className="text-xs font-mono text-slate-400">
                Sélectionne un bloc sur le canevas pour configurer son contenu ou son prix.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}