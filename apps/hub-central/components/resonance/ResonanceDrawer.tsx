'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';
import ResonancePanel from './ResonancePanel';
import { FollowButton } from './FollowButton';

interface ResonanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  entityId?: string;
}

export default function ResonanceDrawer({
  isOpen,
  onClose,
  targetUid,
  entityId,
}: ResonanceDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-slate-100 font-black uppercase tracking-wider text-sm">
              <Sparkles size={16} className="text-[#E5484D]" />
              <span>Tiroir de Résonance</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Section abonnement rapide (géré par FollowButton[cite: 14]) */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-300">Souveraineté de l'Oiseau</h4>
              <p className="text-[10px] font-mono text-slate-500">Tisser un lien direct avec cet auteur.</p>
            </div>
            <FollowButton targetUid={targetUid} targetType="USER" />
          </div>

          {/* Panneau de résonance et d'échos (géré par ResonancePanel[cite: 16]) */}
          <ResonancePanel entityUid={entityId || targetUid} entityLabel="Artefact Typographique" />
        </div>

        <div className="pt-6 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">Îlot Zoizos • Maillage de la Canopée</p>
        </div>
      </div>
    </div>
  );
}