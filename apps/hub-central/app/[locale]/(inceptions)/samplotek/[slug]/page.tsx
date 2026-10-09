export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { SampleModel } from '@ilot/infrastructure';
import { UniversalComment } from '@/components/global/UniversalComment';
import { CopyrightBanner } from '@/components/global/CopyrightBanner';
import { Disc, Play, Shield, Activity, Network } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function PublicSampleDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug, locale } = resolvedParams;

  // 1. Recherche du sample par son UID ou son slug/titre normalisé
  const sample = await SampleModel.findOne({ 
    $or: [{ uid: slug }, { 'seo.metaTitle': new RegExp(slug, 'i') }] 
  }).lean();

  if (!sample) {
    notFound();
  }

  // 2. Assainissement des données pour éviter les avertissements de sérialisation React
  const safeSample = JSON.parse(JSON.stringify(sample));
  
  // 3. Vérification du Voile de Catharsis (si activé dans les paramètres du sample)
  const catharsisActive = safeSample.settings?.catharsisVeil === true;

  // 4. Le Tissage des Muses : Récupération des dépendances si c'est un projet (Graphe Neo4j)
  let usedSamplesDetails: any[] = [];
  if (safeSample.usedSamples && safeSample.usedSamples.length > 0) {
    const rawUsedSamples = await SampleModel.find({ 
      uid: { $in: safeSample.usedSamples } 
    }).lean();
    usedSamplesDetails = JSON.parse(JSON.stringify(rawUsedSamples));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href={`/${locale}/samplotek`} className="hover:text-red-400 transition-colors">
          ← Retour au Studio SamploTek
        </Link>
        <span>/</span>
        <span className="text-slate-200 truncate">{safeSample.title}</span>
      </div>

      {/* HEADER DE L'ŒUVRE */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Disc className="text-red-500 animate-[spin_10s_linear_infinite]" size={32} />
            <h1 className="text-3xl font-black uppercase tracking-wider text-slate-100">{safeSample.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="bg-slate-900 px-2 py-1 rounded-md border border-slate-800">{safeSample.style || 'Générique'}</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">{safeSample.tempoBpm || 120} BPM</span>
            <span>•</span>
            <span>{safeSample.musicalKey || 'Clé Inconnue'}</span>
          </div>
        </div>

        {/* LECTEUR AUDIO NATIF */}
        <div className="w-full md:w-auto bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-4 shadow-lg">
          <button className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <Play size={18} className="ml-1" />
          </button>
          <div className="flex-1 min-w-[200px]">
            {/* Visualiseur d'onde natif décoratif */}
            <div className="h-6 flex items-center gap-0.5 opacity-50">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="w-1 bg-red-500 rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE PRINCIPALE (Gauche) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 🛡️ ROADMAP : Bandeau de Copyright (Correction du nom de la prop pour TypeScript) */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
              <Shield size={16} className="text-emerald-500" /> Sceau & Droits
            </h2>
            <CopyrightBanner 
              metadata={safeSample.copyrightMetadata} 
              digitalSignature={safeSample.digitalSignature} 
              authorUid={safeSample.authorUid}
            />
          </section>

          {/* 💬 ROADMAP : Espace de Commentaires (Avec Voile de Catharsis) */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {catharsisActive ? (
              <div className="text-center py-6 flex flex-col items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <h4 className="text-sm font-semibold text-indigo-300">Sanctuaire sous le Voile de Catharsis</h4>
                <p className="text-xs text-slate-500 max-w-md">
                  L&apos;auteur a choisi de préserver cette œuvre du tumulte des voix. Seule la musique résonne.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Activity size={16} className="text-red-500" /> Échos & Retours
                </h3>
                <UniversalComment 
                  targetUid={safeSample.uid} 
                  targetType={'AUDIO_SAMPLE' as any} 
                  currentAuthorUid={safeSample.authorUid}
                />
              </div>
            )}
          </section>
        </div>

        {/* COLONNE LATÉRALE (Droite) */}
        <aside className="space-y-6">
          
          {/* 🕸️ ROADMAP : Le Tissage des Muses (Neo4j) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2 mb-4">
              <Network size={16} /> Le Tissage des Muses
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mb-4 leading-relaxed">
              Arborescence des dépendances générée par la Matrice Neo4j.
            </p>
            
            {usedSamplesDetails && usedSamplesDetails.length > 0 ? (
              <ul className="space-y-3">
                {usedSamplesDetails.map((usedSample: any, idx: number) => (
                  <li key={idx} className="flex items-center gap-3 text-xs font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                    <Disc size={12} className="text-slate-500" />
                    <Link href={`/${locale}/samplotek/${usedSample.slug || usedSample.uid}`} className="truncate hover:text-amber-400 transition-colors">
                      {usedSample.title || `Sample #${idx + 1}`}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center p-4 border border-dashed border-slate-700 rounded-xl bg-slate-950/50">
                <p className="text-[10px] font-mono text-slate-500">Aucune dépendance détectée. Cette œuvre est une racine pure.</p>
              </div>
            )}
          </div>
          
        </aside>
      </div>
    </div>
  );
}