// apps/hub-central/app/[locale]/(inceptions)/poetrik/[slug]/page.tsx
export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { PoemModel } from '@ilot/infrastructure';
import { PoemCard } from '@/components/poetrik/PoemCard';
import { UniversalComment } from '@/components/global/UniversalComment'; // 🪶 Chemin ajusté selon ta structure
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function PublicPoemDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug, locale } = resolvedParams;

  // Recherche du poème par son UID ou son slug/titre normalisé
  const poem = await PoemModel.findOne({ 
    $or: [{ uid: slug }, { 'seo.metaTitle': new RegExp(slug, 'i') }] 
  }).lean();

  if (!poem) {
    notFound();
  }

  const safePoem = JSON.parse(JSON.stringify(poem));
  const catharsisActive = safePoem.settings?.catharsisVeil === true;

  // Récupération éventuelle du poème source (Tissage des Muses / Inspiration)
  let inspiredPoem: any = null;
  if (safePoem.inspiredByUid) {
    const rawInspired = await PoemModel.findOne({ uid: safePoem.inspiredByUid }).lean();
    if (rawInspired) {
      inspiredPoem = JSON.parse(JSON.stringify(rawInspired));
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href={`/${locale}/poetrik`} className="hover:text-emerald-400 transition-colors">
          ← Retour à l&apos;Atelier Poetrik
        </Link>
        <span>/</span>
        <span className="text-slate-200 truncate">{safePoem.title}</span>
      </div>

      {/* La Carte Poétique principale (Galerie des Visages & Sceau) */}
      <PoemCard
        uid={safePoem.uid}
        title={safePoem.title}
        content={safePoem.content}
        format={safePoem.format || 'FREE_VERSE'}
        author={{
          uid: safePoem.authorUid,
          pseudo: safePoem.authorPseudo || 'Oiseau Anonyme',
          avatarUrl: safePoem.authorAvatarUrl,
        }}
        catharsisVeil={catharsisActive}
        onTransferToArena={(uid) => {
          console.log(`Transfert vers LyriKa du poème : ${uid}`);
        }}
      />

      {/* Le Tissage des Muses (Poèmes inspirateurs) */}
      {inspiredPoem && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>🌌 Tissage des Muses (Inspiration originelle)</span>
          </h3>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-1">
            <span className="text-sm font-serif font-bold text-slate-200">{inspiredPoem.title}</span>
            <p className="text-xs text-slate-400 font-serif italic line-clamp-2">{inspiredPoem.content}</p>
          </div>
        </div>
      )}

      {/* Module de Commentaires (UniversalComment) - Masqué si le Voile de Catharsis est actif */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {catharsisActive ? (
          <div className="text-center py-6 flex flex-col items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h4 className="text-sm font-semibold text-indigo-300">Sanctuaire sous le Voile de Catharsis</h4>
            <p className="text-xs text-slate-500 max-w-md">
              L&apos;auteur a choisi de préserver ce poème du tumulte des voix. Seul le résonnement des vers subsiste.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">
              💬 Échos & Commentaires de la Canopée
            </h3>
            {/* 🪶 Correction des propriétés transmises au composant UniversalComment */}
            <UniversalComment 
              targetUid={safePoem.uid} 
              targetType={'POEM' as any} 
              currentAuthorUid={safePoem.authorUid}
            />
          </div>
        )}
      </div>
    </div>
  );
}