// src/components/pantheon/PantheonPraises.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchPraises, createPraise, PraiseItem } from '@ilot/infrastructure';

interface PantheonPraisesProps {
  targetUid: string;
  targetPseudo: string;
}

export const PantheonPraises: React.FC<PantheonPraisesProps> = ({ targetUid, targetPseudo }) => {
  const [praises, setPraises] = useState<PraiseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_CHARS = 500;

  const loadPraises = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPraises(targetUid);
      setPraises(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetUid) {
      loadPraises();
    }
  }, [targetUid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await createPraise({
        targetIdentifier: targetUid,
        text: text.trim(),
        type: 'gratitude'
      });
      setText('');
      await loadPraises(); // Recharge la liste des éloges
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-slate-200">
      
      {/* En-tête */}
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-bold tracking-wide text-slate-100">
          🌟 Le Panthéon des Éloges
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Parchemins de gratitude dédiés à <span className="font-semibold text-amber-400">@{targetPseudo}</span>
        </p>
      </div>

      {/* Formulaire de dépôt d'éloge */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        <div>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Déposez un éloge lumineux..."
            maxLength={MAX_CHARS}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none text-sm"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${text.length >= MAX_CHARS ? 'text-red-400' : 'text-slate-500'}`}>
              {text.length} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-rose-950/50 p-3 border border-rose-900 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="py-2 px-4 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-medium text-sm transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Gravure en cours...' : 'Graver l’éloge'}
          </button>
        </div>
      </form>

      {/* Liste des éloges */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-sm text-slate-500 py-4">Lecture du grand livre des éloges...</p>
        ) : praises.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-4 italic">Aucun éloge gravé pour le moment. Soyez le premier à illuminer cet oiseau.</p>
        ) : (
          praises.map((praise) => (
            <div key={praise.uid} className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-400">
                  @{praise.author?.pseudo || 'Anonyme'}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(praise.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {praise.text}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
};