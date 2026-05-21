// apps/hub-central/components/users/UserCard.tsx
'use client';

import { useState } from 'react';
import { Shield, Palette, Upload, Loader2, Edit3, MapPin, Trash2 } from 'lucide-react';

interface UserCardProps {
  user: any; // L'objet oiseau (IOiseau)
  currentUserCapabilities?: string[];
  onEditProfile?: (uid: string) => void;
  onUploadSuccess?: () => void;
}

const [isDeleting, setIsDeleting] = useState<string | null>(null);

export function UserCard({ user, currentUserCapabilities = [], onEditProfile, onUploadSuccess }: UserCardProps) {
  const [uploadingTarget, setUploadingTarget] = useState<'avatarUrl' | 'coverPicture' | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'avatarUrl' | 'coverPicture') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(targetType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', targetType);

    try {
      const res = await fetch('/api/users/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "La mutation de l'apparence a échoué.");
      }

      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      alert(`🚨 Friction d'upload : ${err.message}`);
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleDeleteImage = async (imageType: 'avatarUrl' | 'coverPicture') => {
  const urlToDelete = user[imageType];
  if (!urlToDelete) return; // Rien à supprimer
  
  if (!confirm("Anéantir définitivement cette image ?")) return;

  setIsDeleting(imageType); // Feedback visuel

  try {
    // 🌐 APPEL DE LA ROUTE DELETE (C'est ici qu'on appelle la porte)
    const res = await fetch('/api/users/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        imageType: imageType, 
        url: urlToDelete 
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "La désintégration a échoué.");
    }

    // Succès : Rafraîchir l'interface (si tu as un callback)
    if (onUploadSuccess) onUploadSuccess();
    
  } catch (err: any) {
    console.error("❌ Fracture lors de la purge :", err);
    alert(`Ineptie technique : ${err.message}`);
  } finally {
    setIsDeleting(null);
  }
};

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#05070A]/90 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative group/user">
      
      {/* 🖼️ COUVERTURE / BANNIÈRE */}
      <div 
        className="w-full h-36 relative bg-slate-900 border-b border-white/5 transition-all duration-500 bg-cover bg-center"
        style={{ 
          backgroundImage: user?.coverPicture ? `url(${user.coverPicture})` : 'none',
          backgroundColor: user?.frequenceHEX || '#8b9dc3' 
        }}
      >
        <label className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 rounded-xl border border-white/10 cursor-pointer text-slate-400 hover:text-white transition-all text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md opacity-0 group-hover/user:opacity-100">
          {uploadingTarget === 'coverPicture' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Bannière
          <input 
            type="file" 
            className="hidden" 
            disabled={!!uploadingTarget} 
            onChange={(e) => handleImageUpload(e, 'coverPicture')} 
          />
        </label>
      </div>

      {/* 🕊️ CORPS DU PROFIL */}
      <div className="px-8 pb-8 relative">
        
        {/* AVATAR D'OISEAU */}
        <div className="absolute -top-14 left-8 group/avatar">
          <div 
            className="w-24 h-24 rounded-2xl border-4 border-[#05070A] shadow-2xl relative overflow-hidden flex items-center justify-center font-black text-2xl text-white bg-cover bg-center"
            style={{ 
              backgroundColor: user?.frequenceHEX || '#8b9dc3',
              backgroundImage: user?.avatarUrl ? `url(${user.avatarUrl})` : 'none'
            }}
          >
            {!user?.avatarUrl && (user?.pseudo?.substring(0, 2).toUpperCase() || 'OZ')}
            
            {/* Overlay d'upload d'avatar */}
            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer text-white text-[9px] font-black uppercase tracking-wider transition-all">
              {uploadingTarget === 'avatarUrl' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={14} />}
              <span className="mt-1">Changer</span>
              <input 
                type="file" 
                className="hidden" 
                disabled={!!uploadingTarget} 
                onChange={(e) => handleImageUpload(e, 'avatarUrl')} 
              />
              <button 
                onClick={() => handleDeleteImage('avatarUrl')}
                className="absolute top-0 right-0 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </label>
          </div>
        </div>

        {/* CONTENU & COORDONNÉES */}
        <div className="pt-14 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-100">{user?.pseudo}</h3>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400" title="Signature de l'oiseau">
                {user?.signature || '<(:<'}
              </span>
            </div>
            
            {user?.sanctuaire?.localisation && (
              <p className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-[#E5484D]" /> {user.sanctuaire.localisation}
              </p>
            )}
          </div>

          {/* Bouton d'édition rapide */}
          <button
            onClick={() => onEditProfile?.(user?.uid)}
            className="px-4 py-2 bg-white/5 hover:bg-[#E5484D]/20 border border-white/10 hover:border-[#E5484D]/30 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <Edit3 size={12} /> Ajuster mon Essence
          </button>
        </div>

        {/* BIOGRAPHIE DU SANCTUAIRE */}
        {user?.sanctuaire?.biographie && (
          <div className="mt-6 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
            <p className="text-sm text-slate-400 leading-relaxed font-sans">{user.sanctuaire.biographie}</p>
          </div>
        )}

        {/* 🎨 INDICATEURS TECHNIQUES (Fréquence HEX & Capabilities) */}
        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 font-mono">
            <div className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: user?.frequenceHEX || '#8b9dc3' }} />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Fréquence</span>
              <span className="text-xs text-slate-300">{(user?.frequenceHEX || '#8B9DC3').toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <Shield size={16} className="text-slate-600" />
            <div className="flex flex-col truncate w-full">
              <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Plumes (Droits)</span>
              <span className="text-xs text-slate-400 truncate">
                {Array.isArray(user?.capabilities) ? user.capabilities.join(', ') : 'Aucune capacité'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}