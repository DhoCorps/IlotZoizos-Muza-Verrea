'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageCircle, ShoppingBag, Share2, RefreshCcw, ArrowRightLeft, Send, Search, Check } from 'lucide-react';
import { IUniversalMediaItem } from '@ilot/types';

interface OmniActionWidgetProps {
  media: IUniversalMediaItem;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'RESONANCE' | 'COMMERCE' | 'SHARE' | 'WHISPER';
  onProposeBarter?: (media: IUniversalMediaItem) => void;
  onAcquire?: (media: IUniversalMediaItem) => void;
}

export const OmniActionWidget: React.FC<OmniActionWidgetProps> = ({ 
  media, 
  isOpen, 
  onClose, 
  defaultTab = 'RESONANCE',
  onProposeBarter,
  onAcquire
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* HEADER : Métadonnées du média */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-800/30">
          <div className="flex gap-4">
            {media.thumbnailUrl ? (
              <img src={media.thumbnailUrl} alt={media.title} className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
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
          <button 
            data-testid="close-widget-btn" 
            onClick={onClose} 
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION : Les Onglets d'Action */}
        <div className="flex border-b border-slate-800 overflow-x-auto">
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
              label="Acquérir" 
            />
          )}
          <TabButton 
            active={activeTab === 'WHISPER'} 
            onClick={() => setActiveTab('WHISPER')} 
            icon={<Send size={16} />} 
            label="Murmurer" 
          />
          <TabButton 
            active={activeTab === 'SHARE'} 
            onClick={() => setActiveTab('SHARE')} 
            icon={<Share2 size={16} />} 
            label="Droits" 
          />
        </div>

        {/* BODY : Le contenu dynamique selon l'onglet */}
        <div className="p-4 overflow-y-auto flex-1 text-slate-300">
          {activeTab === 'RESONANCE' && <ResonanceModule mediaId={media.mediaId} />}
          {activeTab === 'COMMERCE' && <CommerceModule media={media} onProposeBarter={onProposeBarter} onAcquire={onAcquire} />}
          {activeTab === 'WHISPER' && <WhisperModule media={media} />}
          {activeTab === 'SHARE' && <ShareModule media={media} />}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 text-xs font-medium transition-all whitespace-nowrap ${
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
  </div>
);

const CommerceModule = ({ media, onProposeBarter, onAcquire }: { media: IUniversalMediaItem; onProposeBarter?: (media: IUniversalMediaItem) => void; onAcquire?: (media: IUniversalMediaItem) => void }) => {
  const priceFormatted = media.priceCents !== undefined ? (media.priceCents / 100).toFixed(2) : '0.00';
  const allowBarter = (media as any).rights?.allowBarter ?? true;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
        <span className="text-slate-400">Valeur d'acquisition</span>
        <span className="text-2xl font-mono text-slate-100">{priceFormatted} €</span>
      </div>

      {allowBarter && (
        <div className="p-3 bg-slate-800/30 border border-slate-700/60 rounded-xl flex items-center gap-3 text-xs text-slate-400">
          <ArrowRightLeft size={16} className="text-emerald-400 shrink-0" />
          <span>Cet ouvrage est éligible au moteur de troc (<strong className="text-slate-200">Barter</strong>) pour l'échange de chapitres ou le prêt souverain.</span>
        </div>
      )}

      <div className="flex gap-4">
        <button 
          onClick={() => onAcquire?.(media)}
          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
        >
          <ShoppingBag size={18} /> Acquérir
        </button>
        <button 
          onClick={() => onProposeBarter?.(media)}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2"
        >
          <RefreshCcw size={18} /> Proposer un Troc
        </button>
      </div>
    </div>
  );
};

// 🌬️ MODULE MURMURER À LA NUÉE (Share to Network)
const WhisperModule = ({ media }: { media: IUniversalMediaItem }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Array<{ uid: string; matchPseudo: string; avatarUrl?: string }>>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setFriends([]);
        return;
      }
      try {
        const res = await fetch(`/api/network/search-friends?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setFriends(data.data || []);
        }
      } catch (err) {
        console.error("Erreur de recherche d'oiseaux :", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleSelectFriend = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSendWhisper = async () => {
    if (selectedUids.length === 0) return;
    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/network/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUids: selectedUids,
          artifactUrl: media.mediaUrl || window.location.href,
          message: message.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de la transmission du murmure.");
      }

      setFeedback({ success: true, text: "Murmure transmis avec succès dans la Canopée !" });
      setSelectedUids([]);
      setMessage('');
    } catch (err: any) {
      setFeedback({ success: false, text: err.message || "Erreur lors de l'envoi." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400">Rechercher des Oiseaux</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par pseudo..."
            className="w-full bg-slate-800/60 border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-red-500 font-mono"
          />
        </div>
      </div>

      {friends.length > 0 && (
        <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-800/40 border border-slate-700/60 rounded-xl p-2">
          {friends.map(friend => {
            const isSelected = selectedUids.includes(friend.uid);
            return (
              <div 
                key={friend.uid}
                onClick={() => toggleSelectFriend(friend.uid)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-red-500/20 border border-red-500/40 text-white' : 'hover:bg-slate-700/50 text-slate-300'}`}
              >
                <span className="text-xs font-medium">@{friend.matchPseudo}</span>
                {isSelected && <Check size={14} className="text-red-400" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400">Message optionnel ({selectedUids.length} cible(s))</label>
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ajouter un mot doux ou une résonance..."
          rows={2}
          className="w-full bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-xs text-slate-200 outline-none focus:border-red-500"
        />
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs font-mono ${feedback.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {feedback.text}
        </div>
      )}

      <button
        onClick={handleSendWhisper}
        disabled={selectedUids.length === 0 || isSending}
        className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold uppercase text-xs rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
      >
        <Send size={16} /> {isSending ? 'Transmission...' : 'Murmurer à la Nuée'}
      </button>
    </div>
  );
};

const ShareModule = ({ media }: { media: IUniversalMediaItem }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
      <div>
        <h4 className="text-sm font-bold text-slate-200">Diaporama Universel</h4>
        <p className="text-xs text-slate-400">Autoriser la diffusion dans le flux public.</p>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${media.consentForShowcase ? 'bg-red-500' : 'bg-slate-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${media.consentForShowcase ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  </div>
);