// src/components/mediation/MediationModal.tsx
'use client';

import React, { useState } from 'react';
import { initiateMediation } from '@ilot/infrastructure';

interface MediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  targetPseudo: string;
}

export const MediationModal: React.FC<MediationModalProps> = ({ 
  isOpen, 
  onClose, 
  targetUid, 
  targetPseudo 
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const MAX_CHARS = 1000;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Le motif de la dissonance ne peut être vide.");
      return;
    }

    setIsSubmitting(true);

    try {
      await initiateMediation({
        targetIdentifier: targetUid,
        reason: reason.trim(),
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Réinitialisation des états à la fermeture
    setReason('');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 p-6 shadow-2xl border border-slate-700">
        
        {!isSuccess ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                Ouvrir une Médiation
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Vous êtes sur le point de signaler une dissonance concernant <span className="font-semibold text-indigo-400">@{targetPseudo}</span>. Un sas de médiation sera ouvert pour restaurer l'harmonie.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-300 mb-1">
                  Motif du signalement
                </label>
                <textarea
                  id="reason"
                  rows={5}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 p-3 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
                  placeholder="Décrivez avec justesse ce qui a brisé le lien..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={MAX_CHARS}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${reason.length >= MAX_CHARS ? 'text-red-400' : 'text-slate-500'}`}>
                    {reason.length} / {MAX_CHARS}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-900/50 p-3 border border-red-800">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reason.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Transmission...' : 'Sceller le signalement'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-900/50 mb-4">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-medium text-slate-100 mb-2">Médiation Ouverte</h3>
            <p className="text-sm text-slate-400 mb-6">
              Le signalement a été transmis. Le processus de justice karmique est en marche.
            </p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};