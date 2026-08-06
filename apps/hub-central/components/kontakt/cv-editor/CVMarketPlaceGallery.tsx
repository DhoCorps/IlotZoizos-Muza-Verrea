// apps/hub-central/components/kontakt/cv-editor/CVMarketplaceGallery.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Download, Shield, Coins, Image as ImageIcon } from 'lucide-react';

export function CVMarketplaceGallery({ onSelectTemplate }: { onSelectTemplate: (template: any) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kontakt/templates')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTemplates(data.data);
      })
      .catch(err => console.error("Erreur chargement templates :", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-xs font-mono text-slate-400">Recherche des parchemins dans la matrice...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((tmpl) => (
        <div key={tmpl.uid || tmpl.slug} className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-[#E5484D]/40 transition-all">
          <div className="space-y-3">
            {/* Aperçu visuel R2 si disponible */}
            {tmpl.previewUrl && (
              <div className="w-full h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative">
                <img src={tmpl.previewUrl} alt={tmpl.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 uppercase font-bold">
                Font: {tmpl.letrinFontFamily || 'Standard'}
              </span>
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Coins size={12} /> {tmpl.priceShards === 0 ? 'Gratuit / Troc' : `${tmpl.priceShards} Éclats`}
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-white">{tmpl.title}</h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed">{tmpl.description}</p>
            <p className="text-[10px] font-mono text-slate-500">Forgé par : <span className="text-white">{tmpl.authorName || 'Inconnu'}</span></p>
          </div>

          <button
            onClick={() => onSelectTemplate(tmpl)}
            className="w-full py-3 bg-white/5 hover:bg-[#E5484D] text-white font-black uppercase text-xs rounded-2xl border border-white/10 hover:border-transparent transition-all flex items-center justify-center gap-2"
          >
            <Download size={14} /> Importer ce Modèle
          </button>
        </div>
      ))}

      {templates.length === 0 && (
        <div className="col-span-full py-16 text-center space-y-2 bg-black/20 border border-white/5 rounded-3xl">
          <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Aucun modèle public partagé pour l'instant.</p>
        </div>
      )}
    </div>
  );
}