// apps/hub-central/components/users/UserUploadZone.tsx
'use client';

import { useState } from 'react';
import { Upload, Loader2, FileImage, AlertCircle, CheckCircle } from 'lucide-react';

interface UserUploadZoneProps {
  imageType: 'avatarUrl' | 'coverPicture';
  onSuccess?: (url: string) => void;
}

export function UserUploadZone({ imageType, onSuccess }: UserUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const processFile = async (file: File) => {
    // 🛡️ LE BOUCLIER DES FORMATS & POIDS (Synchronisé avec l'API)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      setStatusMsg({ type: 'error', text: `La Silice attend une image, pas du ${file.type}.` });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: "La brindille est trop lourde (Max 5 Mo)." });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', imageType);

    try {
      const res = await fetch('/api/users/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors du téléversement.");

      setStatusMsg({ type: 'success', text: "L'apparence a muté avec succès !" });
      if (onSuccess) onSuccess(data.publicUrl);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "Le chaos a frappé la matrice." });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-48 relative overflow-hidden ${
          isDragActive 
            ? 'border-[#E5484D] bg-[#E5484D]/5 text-[#E5484D]' 
            : 'border-white/10 bg-black/20 hover:border-white/20 text-slate-500'
        }`}
      >
        <input
          type="file"
          id="file-upload-zone"
          className="hidden"
          disabled={loading}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          accept="image/jpeg,image/png,image/webp,image/gif"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in">
            <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Alchimie mémorielle S3 / R2...</p>
          </div>
        ) : (
          <label htmlFor="file-upload-zone" className="cursor-pointer flex flex-col items-center gap-3 w-full h-full justify-center">
            <FileImage className={`w-10 h-10 transition-colors ${isDragActive ? 'text-[#E5484D]' : 'text-slate-600'}`} />
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-tight">
                Dépose ton image ici ou clique pour parcourir
              </p>
              <p className="text-[9px] font-mono text-slate-600 uppercase mt-1 tracking-wider">
                JPEG, PNG, WEBP, GIF (Max 5 Mo) • Type: {imageType === 'avatarUrl' ? 'Avatar' : 'Bannière'}
              </p>
            </div>
          </label>
        )}
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in text-xs font-mono uppercase tracking-wider ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/5 border-red-500/20 text-red-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}