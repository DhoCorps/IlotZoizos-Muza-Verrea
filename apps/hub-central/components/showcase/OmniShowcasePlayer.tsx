// apps/hub-central/components/showcase/OmniShowcasePlayer.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Play, Pause, SkipForward, Settings2, Share2, Music, Volume2, VolumeX, BookOpen, Disc } from 'lucide-react';
import { IUniversalMediaItem, UniversalMediaType } from '@ilot/types';
import { OmniActionWidget } from '../widget/OmniActionWidget';

interface OmniShowcasePlayerProps {
  userUid: string;
}

const APPS_AVAILABLE: { id: UniversalMediaType; label: string }[] = [
  { id: 'ABYSS', label: 'AbyssBlog' },
  { id: 'PARTITA', label: 'Partita' },
  { id: 'LETRIN', label: 'Letr\'in' },
  { id: 'DHO', label: 'Bordel de Dhô' },
  { id: 'GALLERY', label: 'Galerie' },
];

// ==========================================
// 🎨 SOUS-LECTEURS SPÉCIALISÉS POUR LA CANOPÉE
// ==========================================

const ImageMediaViewer: React.FC<{ src: string; title: string }> = ({ src, title }) => (
  <div className="relative w-full h-full flex items-center justify-center p-4">
    <img 
      src={src} 
      alt={title} 
      className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 animate-in fade-in zoom-in-95 duration-500" 
    />
  </div>
);

const VideoMediaViewer: React.FC<{ src: string; title: string; isPlaying: boolean }> = ({ src, title, isPlaying }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(e => console.warn("Lecture vidéo bloquée :", e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <video 
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted
        className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-white/5" 
      />
    </div>
  );
};

const AudioMediaViewer: React.FC<{ title: string; ownerSlug: string; thumbnailUrl?: string; isPlaying: boolean }> = ({ title, ownerSlug, thumbnailUrl, isPlaying }) => (
  <div className="flex flex-col items-center justify-center space-y-6 p-8 animate-in fade-in duration-500">
    <div className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full p-2 bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 shadow-[0_0_40px_rgba(220,38,38,0.15)] ${isPlaying ? 'animate-spin duration-[10000ms]' : ''}`}>
      <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-black">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <Music size={56} className="text-red-500/50" />
        )}
        <div className="absolute w-12 h-12 bg-slate-950 border-2 border-slate-700 rounded-full flex items-center justify-center shadow-inner">
          <Disc size={16} className="text-red-500 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

const TextMediaViewer: React.FC<{ title: string; excerpt?: string; content?: string }> = ({ title, excerpt, content }) => (
  <div className="w-full max-w-2xl mx-auto p-8 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl space-y-6 animate-in fade-in duration-500">
    <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase tracking-widest">
      <BookOpen size={14} /> Pensée de l'Abysse
    </div>
    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-100 leading-tight">{title}</h2>
    <div className="w-12 h-0.5 bg-red-600" />
    <p className="text-sm font-mono text-slate-300 leading-relaxed max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
      {content || excerpt || "Une réflexion tissée dans le silence de la Canopée..."}
    </p>
  </div>
);

// ==========================================
// 🌌 COMPOSANT MAÎTRE : OMNISHOWCASEPLAYER
// ==========================================

export const OmniShowcasePlayer: React.FC<OmniShowcasePlayerProps> = ({ userUid }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedApps, setSelectedApps] = useState<UniversalMediaType[]>([]);
  const [onlyTradable, setOnlyTradable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isWidgetOpen, setWidgetOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const { data: playlist = [], isLoading, isError } = useQuery({
    queryKey: ['showcase-stream', userUid, selectedApps, onlyTradable],
    queryFn: async () => {
      const params = new URLSearchParams({ userUid });
      if (selectedApps.length > 0) params.append('apps', selectedApps.join(','));
      if (onlyTradable) params.append('onlyTradable', 'true');

      const res = await fetch(`/api/showcase/stream?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as IUniversalMediaItem[];
    },
    enabled: hasStarted,
  });

  const currentItem = playlist[currentIndex];

  // Gestion du timing et de la progression (15s pour Abyss, 8s pour le reste)
  useEffect(() => {
    if (!isPlaying || !currentItem || isWidgetOpen) return;

    const slideDuration = currentItem.sourceApp === 'ABYSS' ? 15000 : 8000;
    const updateInterval = 50;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        const nextValue = prev + (updateInterval / slideDuration) * 100;
        if (nextValue >= 100) {
          handleNext();
          return 0;
        }
        return nextValue;
      });
    }, updateInterval);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, currentItem, currentIndex, isWidgetOpen]);

  // Gestion de l'audio d'ambiance
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    if (currentItem?.metadata?.ambientTrackInfo?.mediaUrl || currentItem?.sourceApp === 'PARTITA') {
      const trackUrl = currentItem.metadata?.ambientTrackInfo?.mediaUrl || currentItem.mediaUrl;
      const audio = new Audio(trackUrl);
      audio.loop = true;
      audio.muted = isMuted;
      audioRef.current = audio;
      
      if (isPlaying) {
        audio.play().catch(e => console.warn("Lecture audio bloquée par le navigateur :", e));
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [currentItem, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleNext = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const toggleFilter = (app: UniversalMediaType) => {
    setSelectedApps(prev => 
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 z-10 space-y-8">
        <div className="text-center space-y-4 max-w-lg">
          <h1 className="text-4xl md:text-5xl font-black uppercase text-slate-100 tracking-tight">Le Diaporama Universel</h1>
          <p className="text-sm font-mono text-slate-400">
            Une exploration générative et sonore des créations de l'Îlot, tissée uniquement pour toi.
          </p>
        </div>
        
        <button 
          onClick={() => { setHasStarted(true); setIsPlaying(true); }}
          className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-all hover:scale-105 flex items-center gap-3"
        >
          <Play size={20} /> Entrer dans le Flux
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-950 flex flex-col overflow-hidden">
      
      {/* HEADER & FILTRES */}
      <div className="absolute top-0 inset-x-0 p-6 z-20 flex flex-col gap-4 bg-gradient-to-b from-slate-950/90 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Flux de la Canopée
          </span>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-all border ${showFilters ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`}>
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl animate-in slide-in-from-top-4">
            {APPS_AVAILABLE.map(app => (
              <button
                key={app.id}
                onClick={() => toggleFilter(app.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                  selectedApps.includes(app.id)
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {app.label}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <button
              onClick={() => setOnlyTradable(!onlyTradable)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                onlyTradable ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Échangeables Uniquement
            </button>
          </div>
        )}
      </div>

      {/* ZONE CENTRALE : AIGUILLAGE INTELLIGENT DES SOUS-LECTEURS */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        {isLoading ? (
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
        ) : isError || playlist.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-sm font-mono text-slate-400 uppercase tracking-widest">Le flux est vide avec ces paramètres.</p>
            <button onClick={() => { setSelectedApps([]); setOnlyTradable(false); }} className="text-red-400 text-xs font-bold underline">Réinitialiser les filtres</button>
          </div>
        ) : currentItem ? (
          <div className="w-full max-w-4xl max-h-full flex flex-col items-center justify-center">
            
            {currentItem.sourceApp === 'ABYSS' || currentItem.sourceApp === 'LETRIN' ? (
              <TextMediaViewer 
                title={currentItem.title} 
                excerpt={currentItem.metadata?.excerpt} 
                content={currentItem.metadata?.content} 
              />
            ) : currentItem.sourceApp === 'PARTITA' ? (
              <AudioMediaViewer 
                title={currentItem.title} 
                ownerSlug={currentItem.ownerSlug} 
                thumbnailUrl={currentItem.thumbnailUrl}
                isPlaying={isPlaying}
              />
            ) : currentItem.mediaUrl?.endsWith('.mp4') || currentItem.metadata?.isVideo ? (
              <VideoMediaViewer 
                src={currentItem.mediaUrl} 
                title={currentItem.title} 
                isPlaying={isPlaying} 
              />
            ) : (
              <ImageMediaViewer 
                src={currentItem.thumbnailUrl || currentItem.mediaUrl} 
                title={currentItem.title} 
              />
            )}

            {/* Méta-informations globales de l'œuvre */}
            <div className="mt-6 text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-100">{currentItem.title}</h3>
              <p className="text-xs font-mono text-slate-400">
                Par <span className="text-slate-300">@{currentItem.ownerSlug}</span> • <span className="uppercase text-red-400">{currentItem.sourceApp}</span>
              </p>
              
              {currentItem.metadata?.ambientTrackInfo && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full mt-2">
                  <Music size={10} className="text-emerald-400" />
                  <span className="text-[9px] font-mono text-slate-400">Ambiance: {currentItem.metadata.ambientTrackInfo.title}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* FOOTER & CONTRÔLES DE LECTURE */}
      {currentItem && (
        <div className="absolute bottom-0 inset-x-0 p-6 z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col gap-4">
          
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all ease-linear duration-50" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors shadow-lg"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button 
                onClick={handleNext} 
                className="w-12 h-12 flex items-center justify-center bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-full transition-colors"
              >
                <SkipForward size={20} />
              </button>
            </div>

            <button
              onClick={() => {
                setIsPlaying(false);
                setWidgetOpen(true);
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg"
            >
              <Share2 size={16} /> Interagir
            </button>
          </div>
        </div>
      )}

      {currentItem && (
        <OmniActionWidget 
          media={currentItem}
          isOpen={isWidgetOpen}
          onClose={() => {
            setWidgetOpen(false);
            setIsPlaying(true);
          }}
        />
      )}
    </div>
  );
};