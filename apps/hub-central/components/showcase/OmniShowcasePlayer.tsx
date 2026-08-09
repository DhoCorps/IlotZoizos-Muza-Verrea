// apps/hub-central/components/showcase/OmniShowcasePlayer.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Play, Pause, SkipForward, Settings2, Share2, Music, Volume2, VolumeX } from 'lucide-react';
import { IUniversalMediaItem, UniversalMediaType } from '@ilot/types';
import { OmniActionWidget } from '../widget/OmniActionWidget';
import { toast } from 'sonner';

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

export const OmniShowcasePlayer: React.FC<OmniShowcasePlayerProps> = ({ userUid }) => {
  // --- ÉTATS DU LECTEUR ---
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- ÉTATS DES FILTRES & WIDGET ---
  const [selectedApps, setSelectedApps] = useState<UniversalMediaType[]>([]);
  const [onlyTradable, setOnlyTradable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isWidgetOpen, setWidgetOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // 🌀 SUTURE REACT QUERY : Appel à notre route de diffusion
  const { data: playlist = [], isLoading, isError, refetch } = useQuery({
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
    enabled: hasStarted, // Ne charge que lorsque l'oiseau lance l'expérience
  });

  const currentItem = playlist[currentIndex];

  // ⏱️ GESTION DU TIMING ET DE LA PROGRESSION
  useEffect(() => {
    if (!isPlaying || !currentItem || isWidgetOpen) return;

    // Durée adaptative : 15s pour du texte (Abyss), 8s pour le reste
    const slideDuration = currentItem.sourceApp === 'ABYSS' ? 15000 : 8000;
    const updateInterval = 50; // Mise à jour fluide toutes les 50ms

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

  // 🎵 GESTION DE L'AUDIO D'AMBIANCE
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

  // --- CONTRÔLES ---
  const handleNext = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const toggleFilter = (app: UniversalMediaType) => {
    setSelectedApps(prev => 
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  // --- RENDU : ÉCRAN D'ACCUEIL ---
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

  // --- RENDU : LECTEUR ACTIF ---
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

        {/* ShowcaseFilterBar Intégrée */}
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

      {/* ZONE CENTRALE : AFFICHAGE DU MÉDIA */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        {isLoading ? (
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
        ) : isError || playlist.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-sm font-mono text-slate-400 uppercase tracking-widest">Le flux est vide avec ces paramètres.</p>
            <button onClick={() => { setSelectedApps([]); setOnlyTradable(false); }} className="text-red-400 text-xs font-bold underline">Réinitialiser les filtres</button>
          </div>
        ) : currentItem ? (
          <div className="w-full max-w-4xl max-h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
            
            {/* Rendu dynamique selon le type d'app */}
            {currentItem.thumbnailUrl ? (
              <img src={currentItem.thumbnailUrl} alt={currentItem.title} className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl" />
            ) : currentItem.sourceApp === 'ABYSS' ? (
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm max-w-2xl text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-200 uppercase">{currentItem.title}</h2>
                <p className="text-sm font-mono text-slate-400 line-clamp-6">{currentItem.metadata?.excerpt || "Une pensée gravée dans l'Abysse..."}</p>
              </div>
            ) : (
              <div className="w-64 h-64 bg-slate-900 border border-slate-800 rounded-full flex flex-col items-center justify-center space-y-4 shadow-2xl animate-pulse">
                 <Music size={40} className="text-slate-500" />
              </div>
            )}

            {/* Méta-informations de l'oeuvre */}
            <div className="mt-8 text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-100">{currentItem.title}</h3>
              <p className="text-xs font-mono text-slate-400">
                Par <span className="text-slate-300">@{currentItem.ownerSlug}</span> • <span className="uppercase text-red-400">{currentItem.sourceApp}</span>
              </p>
              
              {/* Affichage de la piste d'ambiance si présente */}
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
          
          {/* Barre de progression */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all ease-linear duration-50" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
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

            {/* Le Prisme d'Interaction */}
            <button
              onClick={() => {
                setIsPlaying(false); // Met le diaporama en pause
                setWidgetOpen(true);
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg"
            >
              <Share2 size={16} /> Interagir
            </button>
          </div>
        </div>
      )}

      {/* 🧩 Rendu de l'OmniActionWidget en surimpression */}
      {currentItem && (
        <OmniActionWidget 
          media={currentItem}
          isOpen={isWidgetOpen}
          onClose={() => {
            setWidgetOpen(false);
            setIsPlaying(true); // Reprise automatique
          }}
        />
      )}
    </div>
  );
};