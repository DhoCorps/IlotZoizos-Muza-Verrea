// apps/hub-central/components/kontakt/cv-editor/cv.registry.tsx
'use client';

import React from 'react';
import { BlockRegistry } from '@ilot/shared-core'; // Ou ton chemin relatif vers le noyau
import { Shield, Sparkles, Briefcase, Cpu, Award } from 'lucide-react';

export const cvRegistry: BlockRegistry = {
  'cv-header': {
    label: 'Identité & Classe JDR',
    defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
    defaultData: {
      name: 'Oiseau Inconnu',
      title: 'Mage Fullstack & Sceaux Neo4j',
      alignment: 'CHAOTIC_GOOD',
      level: 10,
      email: 'oiseau@ilotzoizos.net',
      location: 'La Matrice (Distante)'
    },
    renderView: ({ data }) => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
            Niv. {data.level || 1}
          </span>
          <span className="text-[10px] font-mono text-[#E5484D] font-bold">{data.alignment}</span>
        </div>
        <h3 className="text-xl font-black uppercase text-white">{data.name}</h3>
        <p className="text-xs font-mono text-[#E5484D]">{data.title}</p>
        <p className="text-[10px] font-mono text-slate-400">{data.email} • {data.location}</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Nom / Surnom</label>
          <input 
            type="text" 
            value={data.name || ''} 
            onChange={e => onChange({ ...data, name: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Titre Professionnel</label>
          <input 
            type="text" 
            value={data.title || ''} 
            onChange={e => onChange({ ...data, title: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
      </div>
    )
  },

  'cv-summary': {
    label: 'Résumé & Lore',
    defaultLayout: { x: 0, y: 2, w: 12, h: 2 },
    defaultData: {
      lore: 'Ancien vagabond du code, architecte des flux de données entre MongoDB et Neo4j.'
    },
    renderView: ({ data }) => (
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Parchemin de Légende</span>
        <p className="text-xs text-slate-300 italic leading-relaxed">« {data.lore} »</p>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div>
        <label className="text-[10px] font-mono text-slate-400 uppercase">Légende / Biographie</label>
        <textarea 
          rows={3}
          value={data.lore || ''} 
          onChange={e => onChange({ ...data, lore: e.target.value })}
          className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
        />
      </div>
    )
  },

  'cv-skills': {
    label: 'Compétences & Sorts',
    defaultLayout: { x: 0, y: 4, w: 6, h: 3 },
    defaultData: {
      skillsList: ['Next.js', 'TypeScript', 'Neo4j', 'MongoDB', 'Tailwind']
    },
    renderView: ({ data }) => (
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Arsenal Technique</span>
        <div className="flex flex-wrap gap-1.5">
          {(data.skillsList || []).map((skill: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
              {skill}
            </span>
          ))}
        </div>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => {
      const skillsStr = (data.skillsList || []).join(', ');
      return (
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase">Compétences (séparées par des virgules)</label>
          <input 
            type="text" 
            value={skillsStr} 
            onChange={e => onChange({ ...data, skillsList: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
      );
    }
  }
};