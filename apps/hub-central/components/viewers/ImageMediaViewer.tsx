import React from 'react';

interface ImageMediaViewerProps {
  src: string;
  title: string;
}

export const ImageMediaViewer: React.FC<ImageMediaViewerProps> = ({ src, title }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <img 
        src={src} 
        alt={title} 
        className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 animate-in fade-in zoom-in-95 duration-500" 
      />
    </div>
  );
};