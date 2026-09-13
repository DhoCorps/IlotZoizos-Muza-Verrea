// src/components/tribunal/CanopyTribunal.tsx
'use client';

import React, { useState } from 'react';
import { summonJurors, executeJudgment } from '@ilot/infrastructure';

interface CanopyTribunalProps {
  reportUid: string;
  defaultPlaintiffId?: string;
  defaultDefendantId?: string;
}

export const CanopyTribunal: React.FC<CanopyTribunalProps> = ({
  reportUid,
  defaultPlaintiffId = '',
  defaultDefendantId = '',
}) => {
  const [plaintiffId, setPlaintiffId] = useState(defaultPlaintiffId);
  const [defendantId, setDefendantId] = useState(defaultDefendantId);
  
  const [jurors, setJurors] = useState<string[]>([]);
  const [isLoadingJurors, setIsLoadingJurors] = useState(false);
  
  const [judgmentLevel, setJudgmentLevel] = useState<1 | 2 | 3>(1);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'grace'; message: string } | null>(null);

  // 1. Convocation des jurés impartiaux
  const handleSummon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!plaintiffId || !defendantId) {
      setFeedback({ type: 'error', message: "Veuillez renseigner l'ID du plaignant et de l'accusé." });
      return;
    }

    setIsLoadingJurors(true);
    try {
      const res = await summonJurors(plaintiffId, defendantId);
      setJurors(res.jurors || []);
      if (res.jurors.length === 0) {
        setFeedback({ type: 'error', message: "Aucun juré impartial n'a pu être trouvé dans le maillage." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsLoadingJurors(false);
    }
  };

  // 2. Exécution de la sentence
  const handleExecuteJudgment = async () => {
    setFeedback(null);
    setIsExecuting(true);

    try {
      const res = await executeJudgment({
        targetIdentifier: defendantId,
        reportUid,
        judgmentLevel,
      });

      if (res.data?.usedGrace) {
        setFeedback({ 
          type: 'grace', 
          message: res.message || "✨ Le Bouclier Karmique a absorbé le choc !" 
        });
      } else {
        setFeedback({ 
          type: 'success', 
          message: res.message || "⚡ La sentence a été exécutée avec succès." 
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-slate-200">
      
      {/* En-tête */}
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-bold tracking-wide text-slate-100">
          ⚖️ Tribunal de la Canopée
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Espace de justice souveraine lié au signalement : <span className="font-mono text-slate-300">{reportUid}</span>
        </p>
      </div>

      {/* Formulaire de convocation */}
      <form onSubmit={handleSummon} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              UID / Slug du Plaignant
            </label>
            <input
              type="text"
              value={plaintiffId}
              onChange={(e) => setPlaintiffId(e.target.value)}
              placeholder="ex: bird_plaignant"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              UID / Slug de l'Accusé
            </label>
            <input
              type="text"
              value={defendantId}
              onChange={(e) => setDefendantId(e.target.value)}
              placeholder="ex: bird_accuse"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors text-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoadingJurors}
          className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors disabled:opacity-50"
        >
          {isLoadingJurors ? 'Recherche des jurés dans la matrice...' : 'Convoquer les Jurés Impartiaux'}
        </button>
      </form>

      {/* Affichage des jurés tirés du Graphe */}
      {jurors.length > 0 && (
        <div className="mb-6 rounded-lg bg-slate-950 p-4 border border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3">
            Collège de Justice désigné ({jurors.length} jurés)
          </h3>
          <div className="flex flex-wrap gap-2">
            {jurors.map((jurorUid, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                {jurorUid}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Zone de prononcé de la sentence */}
      {jurors.length > 0 && (
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Prononcer la Sentence
          </h3>
          
          <div className="flex items-center space-x-4">
            <label className="text-sm text-slate-400">Niveau de sanction :</label>
            <select
              value={judgmentLevel}
              onChange={(e) => setJudgmentLevel(Number(e.target.value) as 1 | 2 | 3)}
              className="rounded-lg bg-slate-950 border border-slate-800 py-2 px-3 text-sm text-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            >
              <option value={1}>Niveau 1 : Avertissement & Frappe légère</option>
              <option value={2}>Niveau 2 : Sanction modérée / Restriction</option>
              <option value={3}>Niveau 3 : Sceau d'exil / Bannissement</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExecuteJudgment}
            disabled={isExecuting}
            className="w-full py-3 px-4 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 font-medium text-sm border border-rose-800/60 transition-all shadow-lg disabled:opacity-50"
          >
            {isExecuting ? 'Le Sceau s\'abat...' : 'Faire tomber le Jugement'}
          </button>
        </div>
      )}

      {/* Retours de feedback */}
      {feedback && (
        <div className={`mt-6 rounded-lg p-4 border text-sm ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' :
          feedback.type === 'grace' ? 'bg-amber-950/40 border-amber-800 text-amber-200' :
          'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          <p>{feedback.message}</p>
        </div>
      )}

    </div>
  );
};