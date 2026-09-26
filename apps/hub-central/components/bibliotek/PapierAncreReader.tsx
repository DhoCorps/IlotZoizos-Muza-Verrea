// apps/hub-central/components/bibliotek/PapierAncreReader.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Star, MessageSquarePlus, X, Loader2, Share2, Play, Pause, Square, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FollowButton } from '@/components/resonance/FollowButton';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { TextSelectionWrapper } from '@/components/resonance/annotations/TextSelectionWrapper'; // 🌟 Import du wrapper universel
import { IUniversalMediaItem } from '@ilot/types';

interface PapierAncreReaderProps {
  book?: {
    uid: string;
    title: string;
    authorSlug?: string;
    authorUid: string;
    fileUrl?: string;
    content?: string;
    writingType?: string;
    style?: string;
    coverUrl?: string;
    createdAt?: string | Date;
    economy?: {
      priceCents?: number;
    };
  };
  bookUid?: string;
  title?: string;
  author?: string;
  authorUid?: string;
  content?: string;
  writingType?: string;
  style?: string;
  coverUrl?: string;
  createdAt?: string;
  priceCents?: number;
  availableFonts?: { name: string; fontFamily: string }[];
  onProgress?: (progressPercentage: number) => void;
}

type PaletteMode = 'encre-chine' | 'crepuscule';

export const PapierAncreReader: React.FC<PapierAncreReaderProps> = (props) => {
  const bookUid = props.book?.uid || props.bookUid || 'unknown_uid';
  const title = props.book?.title || props.title || 'Titre inconnu';
  const author = props.book?.authorSlug || props.author || props.book?.authorUid || props.authorUid || 'Anonyme';
  const authorUid = props.book?.authorUid || props.authorUid || '';
  const content = props.book?.content || props.content || "Ce manuscrit est encore silencieux...";
  const writingType = props.book?.writingType || props.writingType || 'roman';
  const style = props.book?.style || props.style || 'philosophie';
  const coverUrl = props.book?.coverUrl || props.coverUrl;
  const createdAt = props.book?.createdAt || props.createdAt;
  const priceCents = props.book?.economy?.priceCents || props.priceCents || 0;
  const availableFonts = props.availableFonts || [];
  const onProgress = props.onProgress;

  const [palette, setPalette] = useState<PaletteMode>('encre-chine');
  const [selectedFont, setSelectedFont] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [isDeepImmersion, setIsDeepImmersion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const [isWidgetOpen, setWidgetOpen] = useState<boolean>(false);
  const [widgetDefaultTab, setWidgetDefaultTab] = useState<'RESONANCE' | 'COMMERCE' | 'SHARE'>('RESONANCE');

  // Synthèse Vocale Neurale
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isPausedAudio, setIsPausedAudio] = useState<boolean>(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlaySpeech = () => {
    if (!isSpeechSupported) {
      toast.error("La synthèse vocale n'est pas supportée par ce navigateur.");
      return;
    }
    const synth = window.speechSynthesis;
    if (isPausedAudio) {
      synth.resume();
      setIsPausedAudio(false);
      setIsPlayingAudio(true);
      return;
    }
    if (isPlayingAudio) {
      synth.pause();
      setIsPlayingAudio(false);
      setIsPausedAudio(true);
      return;
    }
    synth.cancel();
    const utteranceText = `${title}, par ${author}. ${content}`;
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.lang = 'fr-FR';
    utterance.onend = () => { setIsPlayingAudio(false); setIsPausedAudio(false); };
    utterance.onerror = () => { setIsPlayingAudio(false); setIsPausedAudio(false); toast.error("Erreur lors de la lecture audio."); };
    synth.speak(utterance);
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
    toast.success("🔊 Lecture audio du manuscrit en cours...");
  };

  const handleStopSpeech = () => {
    if (!isSpeechSupported) return;
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    toast.info("Lecture audio interrompue.");
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      const currentProgress = (target.scrollTop / totalHeight) * 100;
      setScrollProgress(Math.round(currentProgress));
      if (onProgress) onProgress(Math.round(currentProgress));
    }
  };

  const themeStyles = {
    'encre-chine': { bg: 'bg-[#181A1F]', text: 'text-[#C9D1D9]', card: 'bg-[#21262D]', border: 'border-[#30363D]', accent: 'text-[#E5484D]', subtle: 'text-[#8B949E]' },
    'crepuscule': { bg: 'bg-[#1C1412]', text: 'text-[#E6D5C3]', card: 'bg-[#2A1F1B]', border: 'border-[#3D2C27]', accent: 'text-[#E06D53]', subtle: 'text-[#A38A75]' },
  }[palette];

  const universalMediaItem: IUniversalMediaItem = useMemo(() => ({
    mediaId: bookUid,
    sourceApp: 'BIBLIOTEK',
    ownerUid: authorUid,
    ownerSlug: author,
    title: title,
    mediaUrl: coverUrl || '',
    thumbnailUrl: coverUrl,
    priceCents: priceCents,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    consentForShowcase: false,
    consentForMusicSync: false,
    rights: { allowBarter: true, allowLending: true },
  } as any), [bookUid, authorUid, author, title, coverUrl, createdAt, priceCents]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} flex flex-col relative`}>
      {!isDeepImmersion && (
        <header className={`w-full ${themeStyles.card} border-b ${themeStyles.border} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans shadow-md z-10`}>
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-bold tracking-wide">{title}</h1>
            <div className={`flex items-center gap-2 ${themeStyles.subtle}`}>
              <span>Par {author}</span>
              {authorUid && <FollowButton targetUid={authorUid} targetType="USER" />}
              <span>• <span className="uppercase">{writingType}</span> / <span className="uppercase">{style}</span></span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {isSpeechSupported && (
              <div className={`flex items-center gap-1 bg-black/30 border ${themeStyles.border} rounded-lg p-1`}>
                <button onClick={handlePlaySpeech} data-testid="tts-play-btn" className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all font-bold ${isPlayingAudio ? 'bg-amber-500 text-black shadow-lg animate-pulse' : 'hover:bg-white/10 text-white'}`} title={isPlayingAudio ? "Mettre en pause la lecture" : isPausedAudio ? "Reprendre la lecture" : "Écouter le manuscrit"}>
                  {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlayingAudio ? 'Pause' : isPausedAudio ? 'Reprendre' : 'Écouter'}</span>
                </button>
                {(isPlayingAudio || isPausedAudio) && (
                  <button onClick={handleStopSpeech} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-all" title="Arrêter l'écoute">
                    <Square size={14} />
                  </button>
                )}
              </div>
            )}
            <div className={`flex rounded-lg border ${themeStyles.border} overflow-hidden p-0.5`}>
              <button onClick={() => setPalette('encre-chine')} className={`px-3 py-1.5 rounded-md transition-all ${palette === 'encre-chine' ? 'bg-[#30363D] text-white font-semibold' : themeStyles.subtle}`}>Encre de Chine</button>
              <button onClick={() => setPalette('crepuscule')} className={`px-3 py-1.5 rounded-md transition-all ${palette === 'crepuscule' ? 'bg-[#3D2C27] text-white font-semibold' : themeStyles.subtle}`}>Crépuscule</button>
            </div>
            {availableFonts.length > 0 && (
              <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className={`bg-transparent border ${themeStyles.border} rounded-lg px-2.5 py-1.5 focus:outline-none`}>
                <option value="sans-serif">Police Standard</option>
                {availableFonts.map((f) => <option key={f.fontFamily} value={f.fontFamily}>{f.name} (Letr'in)</option>)}
              </select>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize((prev) => Math.max(14, prev - 2))} className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}>A-</button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize((prev) => Math.min(28, prev + 2))} className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}>A+</button>
            </div>
            <button onClick={() => { setWidgetDefaultTab('RESONANCE'); setWidgetOpen(true); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${themeStyles.border} hover:bg-white/5 transition-all`}>
              <Share2 size={14} /> Actions
            </button>
            <button onClick={() => setIsDeepImmersion(true)} className="bg-[#E5484D] hover:bg-[#D43D42] text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow">
              Immersion Profonde 🕯️
            </button>
          </div>
        </header>
      )}

      <div className="w-full h-1 bg-transparent relative">
        <div className="h-full bg-[#E5484D] transition-all duration-200" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* 🌟 Intégration du TextSelectionWrapper pour unifier l'annotation universelle sur le livre */}
      <main onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-12 md:py-20 flex justify-center relative select-text" role="main">
        <TextSelectionWrapper targetUid={bookUid} targetType="BOOK" targetTitle={title}>
          <article className="w-full max-w-2xl leading-relaxed space-y-6 transition-all duration-300" style={{ fontFamily: selectedFont, fontSize: `${fontSize}px` }}>
            {isDeepImmersion && (
              <button onClick={() => setIsDeepImmersion(false)} className="fixed top-6 right-6 opacity-30 hover:opacity-100 bg-[#21262D] text-white px-3 py-1.5 rounded-full text-xs font-sans transition-all z-50 shadow-lg">Quitter l'immersion ✕</button>
            )}
            <div className="whitespace-pre-wrap font-serif opacity-95">{content}</div>
          </article>
        </TextSelectionWrapper>
      </main>

      <OmniActionWidget 
        media={universalMediaItem}
        isOpen={isWidgetOpen}
        onClose={() => setWidgetOpen(false)}
        defaultTab={widgetDefaultTab}
      />
    </div>
  );
};