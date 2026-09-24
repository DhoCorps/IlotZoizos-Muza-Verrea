// apps/hub-central/components/bibliotek/ScriptoriumEditor.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { CopyrightBanner } from '@/components/global/CopyrightBanner'; // 🚀 Import du composant DRY de Copyright
import { CopyrightMetadata } from '@ilot/types';

interface ScriptoriumEditorProps {
  bookUid?: string; // Nécessaire pour isoler la salle de document Yjs partagée
  initialTitle?: string;
  initialContent?: string;
  initialWritingType?: string;
  initialStyle?: string;
  initialCopyrightMetadata?: CopyrightMetadata;
  onSave: (data: { title: string; content: string; writingType: string; style: string; copyrightMetadata: CopyrightMetadata }) => Promise<void>;
}

const PREDEFINED_TYPES = ['roman', 'essai', 'biographie', 'poesie', 'manifeste', 'journal-intime', 'nouvelle'];
const PREDEFINED_STYLES = ['philosophie', 'science-fiction', 'cyberpunk', 'aventure', 'historique', 'experimental', 'poetique'];

export const ScriptoriumEditor: React.FC<ScriptoriumEditorProps> = ({
  bookUid = 'sanctuaire-brouillon-libre',
  initialTitle = '',
  initialContent = '',
  initialWritingType = 'roman',
  initialStyle = 'philosophie',
  initialCopyrightMetadata = { role: 'CREATOR', isExclusiveIlot: false },
  onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isConnected, setIsConnected] = useState(false);
  const [activePeers, setActivePeers] = useState<number>(1);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [writingType, setWritingType] = useState(initialWritingType);
  const [customType, setCustomType] = useState('');
  const [isCustomTypeMode, setIsCustomTypeMode] = useState(false);

  const [style, setStyle] = useState(initialStyle);
  const [customStyle, setCustomStyle] = useState('');
  const [isCustomStyleMode, setIsCustomStyleMode] = useState(false);

  // 🚀 État pour la bannière de copyright et d'exclusivité Îlot
  const [copyrightMetadata, setCopyrightMetadata] = useState<CopyrightMetadata>(initialCopyrightMetadata);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 🔌 Initialisation de la synchronisation Yjs & WebSockets
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yTextContent = ydoc.getText('scriptorium-content');
    const yTextTitle = ydoc.getText('scriptorium-title');

    if (initialContent && yTextContent.length === 0) {
      yTextContent.insert(0, initialContent);
    }
    if (initialTitle && yTextTitle.length === 0) {
      yTextTitle.insert(0, initialTitle);
    }

    setContent(yTextContent.toString());
    setTitle(yTextTitle.toString());

    const wsEndpoint = process.env.NEXT_PUBLIC_WS_URL || 'wss://demos.yjs.dev';
    const provider = new WebsocketProvider(wsEndpoint, `ilot-zoizos-scriptorium-${bookUid}`, ydoc);
    providerRef.current = provider;

    if (provider && typeof provider.on === 'function') {
      provider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });
    }

    if (provider?.awareness && typeof provider.awareness.on === 'function') {
      provider.awareness.on('change', () => {
        const states = provider.awareness.getStates();
        setActivePeers(states.size || 1);
      });
    }

    const observerContent = () => setContent(yTextContent.toString());
    const observerTitle = () => setTitle(yTextTitle.toString());

    yTextContent.observe(observerContent);
    yTextTitle.observe(observerTitle);

    return () => {
      yTextContent.unobserve(observerContent);
      yTextTitle.unobserve(observerTitle);
      provider?.destroy?.();
      ydoc.destroy();
    };
  }, [bookUid, initialContent, initialTitle]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const ydoc = ydocRef.current;
    if (ydoc) {
      const yText = ydoc.getText('scriptorium-content');
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, val);
      });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const ydoc = ydocRef.current;
    if (ydoc) {
      const yText = ydoc.getText('scriptorium-title');
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, val);
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalType = isCustomTypeMode ? customType.trim() || 'roman' : writingType;
      const finalStyle = isCustomStyleMode ? customStyle.trim() || 'philosophie' : style;

      await onSave({ 
        title, 
        content, 
        writingType: finalType, 
        style: finalStyle, 
        copyrightMetadata 
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error("Échec de la sédimentation du texte :", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121417] text-[#E1E4E8] p-6 md:p-12 font-serif selection:bg-[#E5484D] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* En-tête de l'Atelier avec indicateur temps réel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#2A2E39] pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-wide text-[#F0F3F6]">Le Scriptorium</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1D24] border border-[#2A2E39] text-[10px] font-sans">
                {isConnected ? (
                  <span className="flex items-center gap-1 text-emerald-400"><Wifi size={12} /> Synchro Yjs Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400"><WifiOff size={12} /> Mode Hors-ligne / Local</span>
                )}
                <span className="text-[#8B949E] flex items-center gap-1 ml-2 pl-2 border-l border-[#2A2E39]">
                  <Users size={12} /> {activePeers} Oiseau{activePeers > 1 ? 'x' : ''}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#8B949E] font-sans mt-1">Sanctuaire d'écriture collaborative — Sceau SHA-256 en attente</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-sans text-[#8B949E]">
            {lastSaved && <span>Enregistré à {lastSaved.toLocaleTimeString()}</span>}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2A2E39] hover:bg-[#383F52] text-[#F0F3F6] px-5 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 disabled:opacity-50"
              data-testid="seal-work-btn"
            >
              {isSaving ? 'Sédimentation...' : 'Sceller l’œuvre'}
            </button>
          </div>
        </div>

        {/* Formulaire de classification ouverte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs">
          
          {/* Type d'écrit */}
          <div className="bg-[#1A1D24] p-4 rounded-xl border border-[#2A2E39]">
            <label className="block text-[#8B949E] mb-2 font-semibold">Type d'écrit</label>
            {!isCustomTypeMode ? (
              <div className="flex gap-2">
                <select
                  value={writingType}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomTypeMode(true);
                    } else {
                      setWritingType(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121417] border border-[#2A2E39] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none focus:border-[#E5484D]"
                >
                  {PREDEFINED_TYPES.map((t) => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                  <option value="CUSTOM">✨ Autre (Libre inventé par l'Oiseau)...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: poeme-cyber-alchimique"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full bg-[#121417] border border-[#E5484D] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none"
                />
                <button
                  onClick={() => setIsCustomTypeMode(false)}
                  className="text-[#8B949E] hover:text-white px-2 py-1 text-xs"
                >
                  Retour
                </button>
              </div>
            )}
          </div>

          {/* Style / Thématique */}
          <div className="bg-[#1A1D24] p-4 rounded-xl border border-[#2A2E39]">
            <label className="block text-[#8B949E] mb-2 font-semibold">Style ou Thématique</label>
            {!isCustomStyleMode ? (
              <div className="flex gap-2">
                <select
                  value={style}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomStyleMode(true);
                    } else {
                      setStyle(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121417] border border-[#2A2E39] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none focus:border-[#E5484D]"
                >
                  {PREDEFINED_STYLES.map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                  <option value="CUSTOM">✨ Autre (Style libre)...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: cyber-philosophie-sauvage"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full bg-[#121417] border border-[#E5484D] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none"
                />
                <button
                  onClick={() => setIsCustomStyleMode(false)}
                  className="text-[#8B949E] hover:text-white px-2 py-1 text-xs"
                >
                  Retour
                </button>
              </div>
            )}
          </div>

        </div>

        {/* 🚀 Bannière de Copyright et Exclusivité Îlot (DRY) */}
        <CopyrightBanner 
          mode="edit" 
          metadata={copyrightMetadata} 
          onChange={setCopyrightMetadata} 
        />

        {/* Zone de Rédaction Principale (Yjs Synced) */}
        <div className="bg-[#1A1D24] rounded-2xl border border-[#2A2E39] p-6 md:p-10 shadow-2xl flex flex-col gap-6">
          <input
            type="text"
            placeholder="Titre de l'ouvrage ou du chapitre..."
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent text-3xl md:text-4xl font-bold placeholder-[#484F58] text-[#F0F3F6] focus:outline-none border-b border-[#2A2E39] pb-4"
          />

          <textarea
            placeholder="Écris ta substance ici... Les mots s'écoulent en silence."
            value={content}
            onChange={handleContentChange}
            rows={18}
            className="w-full bg-transparent text-lg leading-relaxed placeholder-[#484F58] text-[#E1E4E8] focus:outline-none resize-none font-serif"
          />
        </div>

      </div>
    </div>
  );
};