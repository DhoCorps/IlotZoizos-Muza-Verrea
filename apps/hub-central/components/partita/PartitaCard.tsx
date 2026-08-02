'use client';

import { Link } from '../../navigation';
import { Music, BookOpen, Edit3, Trash2, Layers, ShoppingBag, Radio } from 'lucide-react';

interface PartitaCardProps {
  partition: any;
  onEdit: (partition: any) => void;
  onDelete: (uid: string) => void;
}

export function PartitaCard({ partition, onEdit, onDelete }: PartitaCardProps) {
  return (
    <div className="p-6 bg-black/30 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6 hover:border-white/20 transition-all group">
      
      <div className="space-y-4">
        {/* Badges d'état & Instrument */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
            partition.status === 'PUBLISHED' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : partition.status === 'ARCHIVED'
              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {partition.status}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/20 font-bold uppercase">
              🎸 {partition.instrument || 'BASS'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {partition.format || 'ABC'}
            </span>
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-lg font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
          {partition.title}
        </h3>

        {/* Accordage & Aperçu de la notation */}
        <div className="space-y-2">
          {partition.tuning && (
            <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Music size={10} className="text-[#E5484D]" /> Accordage : <span className="text-slate-200">{partition.tuning}</span>
            </p>
          )}
          <pre className="p-3 bg-black/50 border border-white/5 rounded-xl text-[11px] font-mono text-slate-400 line-clamp-3 overflow-hidden whitespace-pre-wrap">
            {partition.content}
          </pre>
        </div>
      </div>

      {/* Marqueurs Médias & E-commerce */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
          {partition.media?.audioTrackUrl && (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Radio size={10} /> Audio lié
            </span>
          )}
          {partition.merchLink?.productId && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <ShoppingBag size={10} /> Artefact {partition.merchLink.productId}
            </span>
          )}
          {partition.connections?.relatedProjects?.length > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <Layers size={10} className="text-[#E5484D]" /> {partition.connections.relatedProjects.length} chantier(s)
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Link 
            href={{
              pathname: '/partita/[slug]',
              params: { slug: partition.slug }
            }}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold rounded-xl border border-white/10 text-center transition-all flex items-center justify-center gap-1.5"
          >
            <BookOpen size={12} /> Jouer / Voir
          </Link>

          <button 
            onClick={() => onEdit(partition)}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all"
            title="Ajuster"
          >
            <Edit3 size={14} />
          </button>

          <button 
            onClick={() => onDelete(partition.uid)}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
            title="Dissoudre"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}