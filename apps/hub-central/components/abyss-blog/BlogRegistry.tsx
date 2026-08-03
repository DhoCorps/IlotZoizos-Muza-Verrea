// apps/hub-central/components/abyss/blog.registry.tsx
'use client';

import React from 'react';
import { BlockRegistry } from '@ilot/shared-core';

export const blogRegistry: BlockRegistry = {
  'blog-header': {
    label: 'En-tête de l’Article',
    defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
    defaultData: {
      title: 'Chronique des Profondeurs',
      subtitle: 'Réflexions sur les flux asynchrones et l’architecture des graphes.',
      author: 'Oiseau des Abysses',
      category: 'Architecture'
    },
    renderView: ({ data }) => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 uppercase font-bold">
            {data.category || 'Général'}
          </span>
          <span className="text-[10px] font-mono text-slate-500">Par {data.author}</span>
        </div>
        <h3 className="text-2xl font-black uppercase text-white tracking-tight">{data.title}</h3>
        <p className="text-xs font-mono text-slate-400 italic">« {data.subtitle} »</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Titre de l'Article</label>
          <input 
            type="text" 
            value={data.title || ''} 
            onChange={e => onChange({ ...data, title: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Sous-titre / Accroche</label>
          <input 
            type="text" 
            value={data.subtitle || ''} 
            onChange={e => onChange({ ...data, subtitle: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Catégorie</label>
          <input 
            type="text" 
            value={data.category || ''} 
            onChange={e => onChange({ ...data, category: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
      </div>
    )
  },

  'blog-markdown': {
    label: 'Paragraphe de Prose',
    defaultLayout: { x: 0, y: 2, w: 12, h: 3 },
    defaultData: {
      content: 'Rédigez votre prose ici. Le noyau s’occupe de structurer le flux textuel...'
    },
    renderView: ({ data }) => (
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Paragraphe</span>
        <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{data.content}</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div>
        <label className="text-[10px] font-mono text-slate-400 uppercase">Contenu (Markdown supporté)</label>
        <textarea 
          rows={6}
          value={data.content || ''} 
          onChange={e => onChange({ ...data, content: e.target.value })}
          className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
        />
      </div>
    )
  },

  'blog-code': {
    label: 'Bloc de Code / Sceau',
    defaultLayout: { x: 0, y: 5, w: 12, h: 3 },
    defaultData: {
      language: 'typescript',
      snippet: '// Exemple de sceau asynchrone\nasync function syncMatrix() {\n  await connectNeo4j();\n}'
    },
    renderView: ({ data }) => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-amber-400 uppercase">{data.language || 'code'}</span>
        </div>
        <pre className="p-3 bg-black/80 border border-white/5 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto">
          <code>{data.snippet}</code>
        </pre>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Langage</label>
          <input 
            type="text" 
            value={data.language || ''} 
            onChange={e => onChange({ ...data, language: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Code Source</label>
          <textarea 
            rows={5}
            value={data.snippet || ''} 
            onChange={e => onChange({ ...data, snippet: e.target.value })}
            className="w-full bg-black/80 border border-white/10 p-2.5 rounded-xl text-xs text-emerald-400 font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
      </div>
    )
  }
};