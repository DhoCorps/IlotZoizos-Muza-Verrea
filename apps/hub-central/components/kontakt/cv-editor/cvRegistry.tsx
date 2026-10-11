// apps/hub-central/components/kontakt/cv-editor/cv.registry.tsx
'use client';

import React from 'react';
import { BlockRegistry } from '@ilot/shared-core';
import { TTRPGAlignmentEnum } from '@ilot/types';
import { Shield, Sparkles, Briefcase, Cpu, Award, Flame, Zap } from 'lucide-react';

// 🛡️ Liste SSOT des 13 alignements JDR (avec repli statique sécurisé pour les environnements de test isolés)
const TTRPG_ALIGNMENTS: readonly string[] = TTRPGAlignmentEnum?.options ?? [
  'LOYAL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD',
  'LOYAL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL',
  'LOYAL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL',
  'ANGE_INS', 'DEMON_INS', 'REPLICANT_BR', 'HUMAIN_BR'
];

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
          <label htmlFor="cv-header-name" className="text-[10px] font-mono text-slate-400 uppercase">
            Nom / Surnom
          </label>
          <input 
            id="cv-header-name"
            type="text" 
            value={data.name || ''} 
            onChange={e => onChange({ ...data, name: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label htmlFor="cv-header-title" className="text-[10px] font-mono text-slate-400 uppercase">
            Titre Professionnel
          </label>
          <input 
            id="cv-header-title"
            type="text" 
            value={data.title || ''} 
            onChange={e => onChange({ ...data, title: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cv-header-level" className="text-[10px] font-mono text-slate-400 uppercase">
              Niveau
            </label>
            <input 
              id="cv-header-level"
              type="number" 
              min={1}
              value={data.level ?? 1} 
              onChange={e => onChange({ ...data, level: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
          <div>
            <label htmlFor="cv-header-alignment" className="text-[10px] font-mono text-slate-400 uppercase">
              Alignement JDR
            </label>
            <select
              id="cv-header-alignment"
              value={data.alignment || 'TRUE_NEUTRAL'}
              onChange={e => onChange({ ...data, alignment: e.target.value })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            >
              {TTRPG_ALIGNMENTS.map((align) => (
                <option key={align} value={align} className="bg-black text-white">
                  {align}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="cv-header-email" className="text-[10px] font-mono text-slate-400 uppercase">
            Canal Email
          </label>
          <input 
            id="cv-header-email"
            type="email" 
            value={data.email || ''} 
            onChange={e => onChange({ ...data, email: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
        <div>
          <label htmlFor="cv-header-location" className="text-[10px] font-mono text-slate-400 uppercase">
            Localisation
          </label>
          <input 
            id="cv-header-location"
            type="text" 
            value={data.location || ''} 
            onChange={e => onChange({ ...data, location: e.target.value })}
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
  },

  'cv-attributes': {
    label: 'Attributs JDR & Voight-Kampff',
    defaultLayout: { x: 6, y: 4, w: 6, h: 3 },
    defaultData: {
      force: 10,
      agilite: 10,
      intelligence: 10,
      charisme: 10,
      empathieVoightKampff: 50
    },
    renderView: ({ data }) => (
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Attributs de l&apos;Oiseau</span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1"><Flame size={12} className="text-red-400" /> Force</span>
            <span className="text-white font-bold">{data.force ?? 10}/20</span>
          </div>
          <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1"><Zap size={12} className="text-amber-400" /> Agilité</span>
            <span className="text-white font-bold">{data.agilite ?? 10}/20</span>
          </div>
          <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1"><Cpu size={12} className="text-cyan-400" /> Intelligence</span>
            <span className="text-white font-bold">{data.intelligence ?? 10}/20</span>
          </div>
          <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1"><Award size={12} className="text-emerald-400" /> Charisme</span>
            <span className="text-white font-bold">{data.charisme ?? 10}/20</span>
          </div>
        </div>
        <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1"><Shield size={12} className="text-[#E5484D]" /> Empathie Voight-Kampff</span>
          <span className="text-[#E5484D] font-bold">{data.empathieVoightKampff ?? 50}%</span>
        </div>
      </div>
    ),
    renderEditForm: ({ data, onChange }) => (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cv-attr-force" className="text-[10px] font-mono text-slate-400 uppercase">
              Force (1-20)
            </label>
            <input
              id="cv-attr-force"
              type="number"
              min={1}
              max={20}
              value={data.force ?? 10}
              onChange={e => onChange({ ...data, force: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
          <div>
            <label htmlFor="cv-attr-agilite" className="text-[10px] font-mono text-slate-400 uppercase">
              Agilité (1-20)
            </label>
            <input
              id="cv-attr-agilite"
              type="number"
              min={1}
              max={20}
              value={data.agilite ?? 10}
              onChange={e => onChange({ ...data, agilite: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
          <div>
            <label htmlFor="cv-attr-intelligence" className="text-[10px] font-mono text-slate-400 uppercase">
              Intelligence (1-20)
            </label>
            <input
              id="cv-attr-intelligence"
              type="number"
              min={1}
              max={20}
              value={data.intelligence ?? 10}
              onChange={e => onChange({ ...data, intelligence: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
          <div>
            <label htmlFor="cv-attr-charisme" className="text-[10px] font-mono text-slate-400 uppercase">
              Charisme (1-20)
            </label>
            <input
              id="cv-attr-charisme"
              type="number"
              min={1}
              max={20}
              value={data.charisme ?? 10}
              onChange={e => onChange({ ...data, charisme: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="cv-attr-vk" className="text-[10px] font-mono text-slate-400 uppercase">
            Empathie Voight-Kampff (0-100%)
          </label>
          <input
            id="cv-attr-vk"
            type="number"
            min={0}
            max={100}
            value={data.empathieVoightKampff ?? 50}
            onChange={e => onChange({ ...data, empathieVoightKampff: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
          />
        </div>
      </div>
    )
  }
};