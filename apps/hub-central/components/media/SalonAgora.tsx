// apps/hub-central/components/media/SalonAgora.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';

interface MediaItem {
  uid: string;
  title: string;
  author: string;
  fileUrl?: string; // URL du média (image ou audio)
  category: string;
}

export default function SalonAgora() {
  const [visuals, setVisuals] = useState<MediaItem[]>([]);
  const [tracks, setTracks] = useState<MediaItem[]>([]);
  
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Charger le flux au montage
  useEffect(() => {
    fetch('/api/media/stream-feed')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setVisuals(json.data.visuals || []);
          setTracks(json.data.tracks || []);
        }
      })
      .catch(err => console.error("Erreur chargement agora :", err));
  }, []);

  // Diaporama automatique des visuels toutes les 8 secondes
  useEffect(() => {
    if (visuals.length === 0) return;
    const interval = setInterval(() => {
      setCurrentVisualIndex(prev => (prev + 1) % visuals.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [visuals]);

  const activeVisual = visuals[currentVisualIndex];
  const activeTrack = tracks[currentTrackIndex];

  const handleTrackEnded = () => {
    // Passer à la piste suivante au hasard ou en boucle
    setCurrentTrackIndex(prev => (prev + 1) % tracks.length);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
      
      {/* 1. Arrière-plan : Le Diaporama Visuel */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 transition-opacity duration-1000">
        {activeVisual ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Si c'est une image ou un rendu graphique */}
            <div className="text-center p-8 max-w-2xl bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 mb-2 block">
                [ Œuvre Visuelle : {activeVisual.category} ]
              </span>
              <h2 className="text-4xl font-extrabold text-white mb-4">{activeVisual.title}</h2>
              <p className="text-lg text-emerald-300 font-medium">Créé par {activeVisual.author || "Oiseau Anonyme"}</p>
            </div>
          </div>
        ) : (
          <div className="text-slate-600 animate-pulse">Silence visuel dans la matrice...</div>
        )}
      </div>

      {/* 2. En-tête : Titre de l'espace */}
      <header className="relative z-10 p-6 flex justify-between items-center bg-gradient-to-b from-slate-950/80 to-transparent">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">📻 L'Agora des Ondes (Salon Audiovisuel)</h1>
          <p className="text-xs text-slate-400">Diffusion continue & diaporamas souverains</p>
        </div>
      </header>

      {/* 3. Panneau Flottant : L'Auteur Actif (Le Crédit permanent) */}
      <div className="relative z-10 self-end mr-8 mb-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 p-4 rounded-xl shadow-2xl max-w-sm">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-mono">En ce moment à l'écran :</div>
        <div className="font-bold text-slate-100 text-base">{activeVisual?.title || "..."}</div>
        <div className="text-sm text-emerald-400 font-semibold mb-3">Par {activeVisual?.author || "Inconnu"}</div>
        <a 
          href={`/kontakt/profiles/${activeVisual?.author}`} 
          className="inline-block text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          Visiter le profil de l'auteur
        </a>
      </div>

      {/* 4. Barre de Contrôle Audio Inférieure */}
      <footer className="relative z-10 bg-slate-900/90 border-t border-slate-800 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center transition-transform active:scale-95 shadow-lg"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div>
            <div className="text-xs text-slate-400 font-mono">Piste Audio en cours :</div>
            <div className="text-sm font-bold text-slate-200">
              {activeTrack ? `${activeTrack.title} — ${activeTrack.author}` : "Chargement des ondes..."}
            </div>
          </div>
        </div>

        {/* Élément Audio HTML5 caché ou piloté */}
        {activeTrack?.fileUrl && (
          <audio 
            ref={audioRef}
            src={activeTrack.fileUrl}
            autoPlay={isPlaying}
            onEnded={handleTrackEnded}
          />
        )}

        <div className="text-xs text-slate-500 italic">
          Chaque note et chaque pixel appartiennent à leurs créateurs respectifs.
        </div>
      </footer>

    </div>
  );
}