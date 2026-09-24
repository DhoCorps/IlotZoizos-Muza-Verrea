// apps/hub-central/app/[locale]/(inceptions)/kontakt/cv-editor/page.tsx
'use client';

import React, { useState } from 'react';
import { useBlockEngine, UniversalGridCanvas, } from '@ilot/shared-core';
import { cvRegistry } from '@/components/kontakt/cv-editor/cvRegistry';
import { CVSidebarPanel } from '@/components/kontakt/cv-editor/CVSideBarPanel';
import { Sparkles, Save, ArrowLeft, Plus, Loader2, Share2, Type } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const INITIAL_CV_BLOCKS = [
  {
    id: 'block-header-1',
    type: 'cv-header',
    title: 'Identité & Classe',
    enabled: true,
    layout: { x: 0, y: 0, w: 12, h: 2 },
    data: {
      name: 'Oiseau Souverain',
      title: 'Architecte Fullstack & Sceaux Graphe',
      alignment: 'CHAOTIC_GOOD',
      level: 12,
      email: 'oiseau@ilotzoizos.net',
      location: 'La Matrice Centrale'
    }
  },
  {
    id: 'block-summary-1',
    type: 'cv-summary',
    title: 'Résumé & Lore',
    enabled: true,
    layout: { x: 0, y: 2, w: 12, h: 2 },
    data: {
      lore: 'Bâtisseur de flux entre MongoDB et Neo4j, résout les bugs à coups de sorts asynchrones.'
    }
  },
  {
    id: 'block-skills-1',
    type: 'cv-skills',
    title: 'Compétences & Sorts',
    enabled: true,
    layout: { x: 0, y: 4, w: 6, h: 3 },
    data: {
      skillsList: ['Next.js', 'TypeScript', 'Neo4j', 'MongoDB', 'Tailwind', 'Vitest']
    }
  }
];

const LETRIN_FONTS = [
  { id: 'letrin-cyber-mono', name: 'Cyber Mono (Futuriste)' },
  { id: 'letrin-neo-serif', name: 'Neo Serif (Élégant)' },
  { id: 'letrin-br-grotesk', name: 'Blade Runner Grotesk' },
  { id: 'letrin-pixel-void', name: 'Pixel Void (Rétro 8-bit)' }
];

export default function KontaktCVEditorPage() {
  const { blocks, selectedBlock, selectedBlockId, setSelectedBlockId, updateLayout, updateData, addBlock, toggleBlock } = useBlockEngine(INITIAL_CV_BLOCKS);

  const [selectedFont, setSelectedFont] = useState('letrin-cyber-mono');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // 🌀 SUTURE : Mutation pour la sauvegarde
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/kontakt/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Échec de la sédimentation");
      return res;
    },
    onSuccess: () => toast.success("✨ Parchemin de CV sédimenté avec succès !"),
    onError: (err) => toast.error(`🔥 Erreur : ${err.message}`)
  });

  // 🌀 SUTURE : Mutation pour la publication
  const publishMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/kontakt/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Échec de la publication");
      return res;
    },
    onSuccess: () => {
      toast.success("✨ Modèle publié comme artefact souverain !");
      setIsPublishModalOpen(false);
      setTemplateTitle('');
      setTemplateDesc('');
    },
    onError: (err) => toast.error(`🔥 Erreur : ${err.message}`)
  });

  const handleSaveCV = () => {
    const headerBlock = blocks.find(b => b.type === 'cv-header');
    const summaryBlock = blocks.find(b => b.type === 'cv-summary');
    const skillsBlock = blocks.find(b => b.type === 'cv-skills');

    saveMutation.mutate({
      professionalTitle: headerBlock?.data.title || 'Développeur Fullstack',
      alignment: headerBlock?.data.alignment || 'CHAOTIC_GOOD',
      bio: summaryBlock?.data.lore || '',
      skills: skillsBlock?.data.skillsList || [],
      rawLayoutBlocks: blocks,
      letrinFontFamily: selectedFont
    });
  };

  const handlePublishTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    publishMutation.mutate({
      title: templateTitle,
      description: templateDesc,
      letrinFontFamily: selectedFont,
      blocks: blocks
    });
  };

  const handleAddModule = (type: string) => {
    const newBlock = {
      id: `block-${type}-${Date.now()}`,
      type,
      title: cvRegistry[type]?.label || 'Nouveau Bloc',
      enabled: true,
      layout: cvRegistry[type]?.defaultLayout || { x: 0, y: 0, w: 6, h: 2 },
      data: { ...cvRegistry[type]?.defaultData }
    };
    addBlock(newBlock);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="space-y-2">
          <Link href="/[locale]/kontakt" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors mb-2">
            <ArrowLeft size={14} /> Retour à Kontakt-RH
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Forge de CV Modulaire
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Éditeur Synaptique de Parchemin</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-2 rounded-xl">
            <Type size={14} className="text-[#E5484D]" />
            <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="bg-transparent text-xs font-mono text-white outline-none cursor-pointer">
              {LETRIN_FONTS.map(font => (
                <option key={font.id} value={font.id} className="bg-[#0A0D14] text-white">{font.name}</option>
              ))}
            </select>
          </div>

          <button onClick={() => handleAddModule('cv-skills')} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-mono text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1.5">
            <Plus size={14} /> + Compétences
          </button>

          <button onClick={() => setIsPublishModalOpen(true)} className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono text-xs rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5">
            <Share2 size={14} /> Publier Modèle
          </button>

          <button 
            onClick={handleSaveCV}
            disabled={saveMutation.isPending}
            className="px-6 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            Sédimenter le CV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <UniversalGridCanvas 
            blocks={blocks}
            registry={cvRegistry}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateLayout={updateLayout}
            onToggleBlock={toggleBlock}
            letrinFontFamily={selectedFont}
          />
        </div>

        <div className="lg:col-span-4 sticky top-6">
          <CVSidebarPanel 
            selectedBlock={selectedBlock}
            registry={cvRegistry}
            onUpdateData={updateData}
            onClose={() => setSelectedBlockId(null)}
          />
        </div>
      </div>

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A0D14] border border-[#E5484D]/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(229,72,77,0.3)] space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight">Transformer en Artefact</h3>
              <p className="text-xs font-mono text-slate-400">Publie ton agencement pour le partager, le vendre ou le troquer sur le marché.</p>
            </div>

            <form onSubmit={handlePublishTemplate} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Titre du Modèle</label>
                <input type="text" required value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Ex: Parchemin Cyber-Minimaliste" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Description / Lore</label>
                <textarea required rows={3} value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Explique la philosophie de ce design..." className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPublishModalOpen(false)} className="flex-1 py-3 bg-white/5 text-slate-300 font-black uppercase text-xs rounded-xl hover:bg-white/10 transition-all">Annuler</button>
                <button type="submit" disabled={publishMutation.isPending} className="flex-1 py-3 bg-[#E5484D] text-white font-black uppercase text-xs rounded-xl shadow-lg hover:bg-[#c43d41] transition-all flex items-center justify-center gap-2">
                  {publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                  Diffuser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}