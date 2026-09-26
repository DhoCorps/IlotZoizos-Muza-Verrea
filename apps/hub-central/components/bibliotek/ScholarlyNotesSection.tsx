// apps/hub-central/components/bibliotek/ScholarlyNotesSection.tsx
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Scroll, Loader2 } from 'lucide-react';

interface ScholarlyNotesSectionProps {
  bookUid: string; // 🌟 Changé de bookSlug à bookUid pour le système universel
}

export function ScholarlyNotesSection({ bookUid }: ScholarlyNotesSectionProps) {
  // 🌀 Récupération depuis la route universelle
  const { data: response, isLoading } = useQuery({
    queryKey: ['scholarly-notes', bookUid],
    queryFn: async () => {
      const res = await fetch(`/api/annotations?targetUid=${bookUid}&targetType=BOOK`);
      if (!res.ok) throw new Error("Échec de la récupération des notes.");
      return res.json();
    }
  });

  const highlights = response?.data || [];
  
  // Sécurité côté client pour s'assurer de n'afficher que le prestige public
  const sealedNotes = highlights.filter((h: any) => h.isScholarSealed);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (sealedNotes.length === 0) return null;

  return (
    <section className="my-16 p-8 bg-gradient-to-br from-[#1A1412] via-[#120E0C] to-black border border-amber-500/20 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.05)] space-y-8 animate-in fade-in duration-700">
      
      <div className="flex items-center gap-4 border-b border-amber-500/10 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner">
          <Scroll size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
            Notes d'Érudits <Sparkles size={16} className="animate-pulse" />
          </h3>
          <p className="text-xs font-mono text-amber-500/60">
            Fulgurances et vibrations validées par l'auteur pour la postérité.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sealedNotes.map((note: any) => (
          <article 
            key={note.uid}
            className="p-5 bg-amber-950/10 border border-amber-500/10 rounded-2xl space-y-4 hover:border-amber-500/30 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]"
          >
            <div className="flex justify-between items-start text-[10px] font-mono text-amber-500/50">
              {/* 🌟 L'auteur de la note (UniversalAnnotation.authorUid) */}
              <span className="font-bold text-amber-400/80">Oiseau : {note.authorUid?.substring(0, 8) || 'Anonyme'}</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded-md text-amber-400">
                {note.emotion} Vibration
              </span>
            </div>

            <blockquote className="text-sm text-amber-100/80 italic font-serif leading-relaxed border-l-2 border-amber-500/40 pl-3">
              &ldquo;{note.selectedText}&rdquo;
            </blockquote>

            {note.comment && (
              <p className="text-xs font-sans text-amber-200/60 bg-black/40 p-3 rounded-xl border border-amber-500/5">
                {note.comment}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}