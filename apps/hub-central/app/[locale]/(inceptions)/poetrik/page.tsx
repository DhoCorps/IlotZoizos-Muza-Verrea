// apps/hub-central/app/[locale]/(inceptions)/poetrik/page.tsx
'use client';

import React, { useState } from 'react';
import { PoetrikCanvas } from '@/components/poetrik/PoetrikCanvas';
import { LexicalOracle } from '@/components/poetrik/LexicalOracle';
import { PoetrikToolbar } from '@/components/poetrik/PoetrikToolbar';
import { RhymeGraphView } from '@/components/poetrik/RhymeGraphView';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { toast } from 'sonner';

export default function PoetrikPage() {
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [activeView, setActiveView] = useState<'canvas' | 'graph'>('canvas');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [centerWordUid, setCenterWordUid] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisation avec le Chapeau Flottant
  usePageChapeauContext({
    recipientUid: 'canopy_poetrik_treasury',
    recipientPseudo: "L'Atelier Poetrik",
    targetTitle: title || 'Poème sans titre',
  });

  // Sauvegarde et Plantation automatique d'une Balise sur l'Agora d'Univers'Hall
  const handleSaveAndPlantBeacon = async () => {
    if (!content.trim() || !title.trim()) {
      toast.error("Le poème nécessite un titre et des vers avant d'être scellé.");
      return;
    }

    setIsSaving(true);
    try {
      const entityUid = `poet_${Date.now()}`;
      
      // 1. Sauvegarde du poème (appel API générique ou spécifique Poetrik)
      // 2. Plantation de la balise sur l'Agora d'Univers'Hall
      const beaconRes = await fetch('/api/univershall/beacons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceModule: 'POETRIK',
          entityUid: entityUid,
          title: title.trim(),
          summary: content.substring(0, 120) + '...',
          tags: ['poesie', currentLanguage, 'vers'],
          resonanceScore: 10,
          metadata: { language: currentLanguage }
        })
      });

      const beaconJson = await beaconRes.json();
      if (!beaconRes.ok) throw new Error(beaconJson.error || "Échec de la plantation sur l'Agora.");

      toast.success("🪶 Poème scellé et balise plantée avec succès sur l'Agora d'Univers'Hall !");
    } catch (err: any) {
      toast.error(`Erreur d'alchimie : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Barre d'outils Poetrik */}
      <PoetrikToolbar
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        activeView={activeView}
        onViewChange={setActiveView}
        onSave={handleSaveAndPlantBeacon}
        isSaving={isSaving}
      />

      {/* Saisie du Titre du Poème */}
      <div className="max-w-6xl mx-auto px-4">
        <input
          type="text"
          placeholder="Titre de votre chant poétique..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xl font-serif text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
        />
      </div>

      {/* Vues Dynamiques : Canevas d'écriture ou Observatoire Graphe */}
      {activeView === 'canvas' ? (
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto px-4">
          <div className="flex-1">
            <PoetrikCanvas
              initialContent={content}
              onContentChange={setContent}
              onWordSelect={(word) => {
                setSelectedWord(word);
                setCenterWordUid(`lex_${currentLanguage}_${word.toLowerCase()}`);
              }}
            />
          </div>
          <div>
            <LexicalOracle
              selectedWord={selectedWord}
              onSelectRhyme={(rhymeWord) => {
                setContent((prev) => prev + ' ' + rhymeWord);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4">
          <RhymeGraphView
            centerWordUid={centerWordUid}
            onNodeClick={(node) => {
              setSelectedWord(node.name);
              setCenterWordUid(node.id);
            }}
          />
        </div>
      )}
    </div>
  );
}