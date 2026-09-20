import React, { useState } from 'react';
import { PropagationScope } from '@ilot/types';

export interface PropagationPanelProps {
  artifactUid: string;
  artifactType: 'BLOG' | 'PROJECT' | 'FONT' | 'SPRITE' | 'PROFILE' | 'GAME' | 'LYRIKA' | 'SAMPLOTEK' | 'BIBLIOTEK' | 'POETRIK';
  contacts?: Array<{ uid: string; pseudo: string; avatarUrl?: string }>;
  onPropagate: (payload: { scope: PropagationScope; receiverUids: string[]; customMessage?: string }) => Promise<void>;
  onCancel?: () => void;
}

export const PropagationPanel: React.FC<PropagationPanelProps> = ({
  contacts = [],
  onPropagate,
  onCancel,
}) => {
  const [scope, setScope] = useState<PropagationScope>('GLOBAL');
  const [selectedReceivers, setSelectedReceivers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleReceiver = (uid: string) => {
    setSelectedReceivers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scope === 'TARGETED' && selectedReceivers.length === 0) return;

    setIsSubmitting(true);
    try {
      await onPropagate({
        scope,
        receiverUids: scope === 'TARGETED' ? selectedReceivers : [],
        customMessage: customMessage.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>🌊</span> Propager l'Écho
        </h3>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Retour
          </button>
        )}
      </div>

      {/* Sélecteur de Portée (Scope) */}
      <div className="flex rounded-md bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setScope('GLOBAL')}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
            scope === 'GLOBAL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Diffusion Globale
        </button>
        <button
          type="button"
          onClick={() => setScope('TARGETED')}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
            scope === 'TARGETED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Partage Ciblé
        </button>
      </div>

      <form onSubmit={handleSubmission} className="space-y-4">
        {/* Message d'accompagnement facultatif */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Mot d'accompagnement (optionnel)
          </label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Regarde cette pépite..."
            maxLength={500}
            className="w-full p-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Section conditionnelle selon le Scope */}
        {scope === 'TARGETED' ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              Choisir les destinataires ({selectedReceivers.length} sélectionnés)
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded border border-slate-800">
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-2">Aucun contact disponible.</p>
              ) : (
                contacts.map(contact => {
                  const isSelected = selectedReceivers.includes(contact.uid);
                  return (
                    <div
                      key={contact.uid}
                      onClick={() => toggleReceiver(contact.uid)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-950/50 border border-emerald-800' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-xs text-slate-200">{contact.pseudo}</span>
                      <span className={`text-xs ${isSelected ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                        {isSelected ? '✓' : '+'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded text-center space-y-1">
            <p className="text-xs text-emerald-300 font-medium">Diffusion à l'ensemble du réseau</p>
            <p className="text-[10px] text-slate-400">L'écho se propagera à travers la canopée et incrémentera la portée globale.</p>
          </div>
        )}

        {/* Bouton d'action principal */}
        <button
          type="submit"
          disabled={isSubmitting || (scope === 'TARGETED' && selectedReceivers.length === 0)}
          className="w-full py-2 px-4 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 rounded shadow transition-colors"
        >
          {isSubmitting ? 'Propagation en cours...' : scope === 'GLOBAL' ? 'Diffuser au Réseau' : 'Transmettre aux contacts'}
        </button>
      </form>
    </div>
  );
};