import React from 'react';
import { BookOpen } from 'lucide-react';

interface TextMediaViewerProps {
  title: string;
  excerpt?: string;
  content?: string;
  ownerSlug: string;
}

export const TextMediaViewer: React.FC<TextMediaViewerProps> = ({ title, excerpt, content, ownerSlug }) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase tracking-widest">
        <BookOpen size={14} /> Pensée de l'Abysse
      </div>
      <h2 className="text-3xl font-black uppercase tracking-tight text-slate-100 leading-tight">{title}</h2>
      <div className="w-12 h-0.5 bg-red-600" />
      <p className="text-sm font-mono text-slate-300 leading-relaxed max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
        {content || excerpt || "Une réflexion tissée dans le silence de la Canopée..."}
      </p>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
        <span>Par @{ownerSlug}</span>
        <span>AbyssBlog</span>
      </div>
    </div>
  );
};