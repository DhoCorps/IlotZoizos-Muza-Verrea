import React, { useRef, useEffect } from 'react';

interface VideoMediaViewerProps {
  src: string;
  title: string;
  isPlaying: boolean;
}

export const VideoMediaViewer: React.FC<VideoMediaViewerProps> = ({ src, title, isPlaying }) => {
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
        muted // Sécurité pour l'autoplay, le son global est géré par la piste Partita/Ambiance si besoin
        className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-white/5" 
      />
    </div>
  );
};