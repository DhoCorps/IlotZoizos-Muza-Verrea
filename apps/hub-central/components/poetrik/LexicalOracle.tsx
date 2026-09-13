// apps/hub-central/components/poetrik/LexicalOracle.tsx

'use client';

import React, { useEffect, useState } from 'react';

interface RhymeItem {
  uid: string;
  word: string;
  languageCode: string;
  phoneticIpa: string;
  syllableCount: number;
  rhymeType: string;
}

interface LexicalData {
  uid: string;
  word: string;
  languageCode: string;
  phoneticIpa: string;
  syllableCount: number;
  definitions: Record<string, string>;
  partOfSpeech: string;
}

interface LexicalOracleProps {
  selectedWord: string | null;
  onSelectRhyme?: (rhymeWord: string) => void;
}

export const LexicalOracle: React.FC<LexicalOracleProps> = ({
  selectedWord,
  onSelectRhyme,
}) => {
  const [lexiconEntry, setLexiconEntry] = useState<LexicalData | null>(null);
  const [rhymes, setRhymes] = useState<RhymeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWord) {
      setLexiconEntry(null);
      setRhymes([]);
      return;
    }

    const fetchOracleData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Interrogation de l'API Lexicale pour récupérer la chair sémantique
        const resLex = await fetch(`/api/poetrik/lexicon?search=${encodeURIComponent(selectedWord)}`);
        const jsonLex = await resLex.json();

        if (jsonLex.success && jsonLex.data && jsonLex.data.length > 0) {
          const entry = jsonLex.data[0];
          setLexiconEntry(entry);

          // 2. Interrogation de l'API des Rimes (Neo4j) via l'UID du mot
          const resRhymes = await fetch(`/api/poetrik/rhymes?uid=${encodeURIComponent(entry.uid)}`);
          const jsonRhymes = await resRhymes.json();

          if (jsonRhymes.success) {
            setRhymes(jsonRhymes.data || []);
          }
        } else {
          setLexiconEntry(null);
          setRhymes([]);
          setError("Ce mot sommeille encore hors de l'Oracle.");
        }
      } catch (err) {
        console.error("Erreur d'invocation de l'Oracle :", err);
        setError("Interférence dans la matrice lexicale.");
      } finally {
        setLoading(false);
      }
    };

    fetchOracleData();
  }, [selectedWord]);

  if (!selectedWord) {
    return (
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-500 gap-3">
        <span className="text-3xl">👁️‍🗨️</span>
        <p className="text-sm">
          Sélectionne un mot dans ton poème pour invoquer l&apos;Oracle Lexical et révéler ses échos.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 flex flex-col gap-5 overflow-hidden">
      {/* En-tête de l'Oracle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">👁️</span>
          <h3 className="font-semibold text-slate-200">Oracle Lexical</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
          {selectedWord}
        </span>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
          L&apos;Oracle interroge les racines de la Silice...
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-amber-950/40 border border-amber-900/60 rounded-lg text-xs text-amber-300 text-center">
          {error}
        </div>
      )}

      {lexiconEntry && !loading && (
        <div className="flex flex-col gap-4">
          {/* Fiche d'identité phonétique */}
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-serif font-bold text-slate-100">{lexiconEntry.word}</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                {lexiconEntry.phoneticIpa}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-slate-400 mt-1">
              <span>Langue : <strong className="text-slate-200 uppercase">{lexiconEntry.languageCode}</strong></span>
              <span>Syllabes : <strong className="text-slate-200">{lexiconEntry.syllableCount}</strong></span>
              <span>Nature : <strong className="text-slate-200">{lexiconEntry.partOfSpeech}</strong></span>
            </div>
          </div>

          {/* Définitions Multilingues */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Définitions</h4>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              {Object.entries(lexiconEntry.definitions || {}).map(([lang, def]) => (
                <div key={lang} className="text-xs p-2 bg-slate-950/50 border border-slate-800/40 rounded">
                  <span className="font-bold text-indigo-400 uppercase mr-1.5">[{lang}]</span>
                  <span className="text-slate-300">{def}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Réseau de Rimes (Neo4j) */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Échos & Rimes ({rhymes.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/40 border border-slate-800/50 rounded-lg">
              {rhymes.length > 0 ? (
                rhymes.map((rhyme) => (
                  <button
                    key={rhyme.uid}
                    onClick={() => onSelectRhyme && onSelectRhyme(rhyme.word)}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-800 border border-slate-700 rounded text-slate-200 transition-all flex items-center gap-1"
                    title={`Rime ${rhyme.rhymeType} (${rhyme.phoneticIpa})`}
                  >
                    <span>{rhyme.word}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({rhyme.syllableCount}p)</span>
                  </button>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-4 w-full italic">
                  Aucun écho répertorié pour ce mot dans la Matrice.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};