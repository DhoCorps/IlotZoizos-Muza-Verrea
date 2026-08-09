// apps/hub-central/components/omni-widget/OmniActionWidget.tsx
'use client';

import React, { useState } from 'react';
import { X, Heart, MessageCircle, ShoppingBag, Share2, Settings2, RefreshCcw } from 'lucide-react';
import { IUniversalMediaItem } from '@ilot/types';

interface OmniActionWidgetProps {
  media: IUniversalMediaItem;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'RESONANCE' | 'COMMERCE' | 'SHARE';
}

export const OmniActionWidget: React.FC<OmniActionWidgetProps> = ({ 
  media, 
  isOpen, 
  onClose, 
  defaultTab = 'RESONANCE' 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      {/* Container principal du Widget - Teintes Slate (Gris Bleuté) et bordures discrètes */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* HEADER : Métadonnées du média */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-800/30">
          <div className="flex gap-4">
            {media.thumbnailUrl ? (
              <img src={media.thumbnailUrl} alt={media.title} className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                {media.sourceApp}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-100">{media.title}</h3>
              <p className="text-sm text-slate-400">par <span className="text-slate-300">@{media.ownerSlug}</span></p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-slate-800 text-slate-300">
                {media.sourceApp}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION : Les Onglets d'Action */}
        <div className="flex border-b border-slate-800">
          <TabButton 
            active={activeTab === 'RESONANCE'} 
            onClick={() => setActiveTab('RESONANCE')} 
            icon={<MessageCircle size={16} />} 
            label="Résonance" 
          />
          {media.priceCents !== undefined && media.priceCents >= 0 && (
            <TabButton 
              active={activeTab === 'COMMERCE'} 
              onClick={() => setActiveTab('COMMERCE')} 
              icon={<ShoppingBag size={16} />} 
              label="Acquérir / Troquer" 
            />
          )}
          <TabButton 
            active={activeTab === 'SHARE'} 
            onClick={() => setActiveTab('SHARE')} 
            icon={<Share2 size={16} />} 
            label="Partage & Droits" 
          />
        </div>

        {/* BODY : Le contenu dynamique selon l'onglet */}
        <div className="p-4 overflow-y-auto flex-1 text-slate-300">
          {activeTab === 'RESONANCE' && <ResonanceModule mediaId={media.mediaId} />}
          {activeTab === 'COMMERCE' && <CommerceModule media={media} />}
          {activeTab === 'SHARE' && <ShareModule media={media} />}
        </div>
      </div>
    </div>
  );
};

// --- Sous-composants utilitaires ---

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
      active 
        ? 'text-slate-100 border-b-2 border-red-500 bg-slate-800/50' 
        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
    }`}
  >
    {icon} {label}
  </button>
);

const ResonanceModule = ({ mediaId }: { mediaId: string }) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-400">Échos et vibrations de la canopée...</p>
    {/* Ici viendrait la liste des commentaires et le champ de saisie relié à l'API ResonanceOrchestrator */}
  </div>
);

const CommerceModule = ({ media }: { media: IUniversalMediaItem }) => (
  <div className="space-y-6">
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
      <span className="text-slate-400">Valeur d'acquisition</span>
      <span className="text-2xl font-mono text-slate-100">{(media.priceCents! / 100).toFixed(2)} €</span>
    </div>
    <div className="flex gap-4">
      <button className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
        <ShoppingBag size={18} /> Acquérir
      </button>
      <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2">
        <RefreshCcw size={18} /> Proposer un Troc
      </button>
    </div>
  </div>
);

const ShareModule = ({ media }: { media: IUniversalMediaItem }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
      <div>
        <h4 className="text-sm font-bold text-slate-200">Diaporama Universel</h4>
        <p className="text-xs text-slate-400">Autoriser la diffusion dans le flux public.</p>
      </div>
      {/* Switch Toggle */}
      <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${media.consentForShowcase ? 'bg-red-500' : 'bg-slate-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${media.consentForShowcase ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  </div>
);