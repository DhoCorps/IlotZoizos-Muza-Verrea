// apps/hub-central/components/profile/UserProfile.tsx
'use client';

import React, { useState } from 'react';
import { Camera, Shield, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileProps {
  user: any; 
}

export default function UserProfile({ user: initialUser }: UserProfileProps) {
  const [user, setUser] = useState(initialUser);
  const [uploading, setUploading] = useState<string | null>(null);
  // 🛡️ SUTURE : État pour valider l'ancrage visuel
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // 🌀 L'ALCHIMIE DE L'UPLOAD : Suture entre le Front et Cloudflare R2
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatarUrl' | 'profilePicture' | 'coverPicture') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.uid); 
    formData.append('imageType', type);

    try {
      const res = await fetch('/api/users/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        // Suture visuelle immédiate
        setUser({ ...user, [type]: data.publicUrl });
        // ✨ ÉVEIL DU MESSAGE DE SUCCÈS
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      } else {
        toast.error("Le chaos a empêché l'ancrage : " + data.message);
      }
    } catch (err) {
      console.error("🔥 Erreur de suture visuelle :", err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* 🖼️ HEADER : Bannière (coverPicture) */}
      <div className="relative h-64 w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
        <img 
          src={user.coverPicture || 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt="Bannière du nid"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        <label className="absolute bottom-4 right-4 p-3 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 rounded-full cursor-pointer hover:bg-emerald-500/40 transition-all shadow-lg">
          <Camera className="w-5 h-5 text-emerald-300" />
          <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'coverPicture')} />
        </label>
        {uploading === 'coverPicture' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm italic text-emerald-400">
            Ancrage de la bannière...
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 px-4 -mt-20 relative z-10">
        
        {/* 👤 COLONNE GAUCHE : Avatar & Stats de base */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl text-center">
            <div className="relative inline-block group">
              <img 
                src={user.avatarUrl || '/assets/avatars/default.png'} 
                className={`w-32 h-32 rounded-full border-4 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] object-cover ${uploading === 'avatarUrl' ? 'opacity-30 animate-pulse' : ''}`}
                alt="Avatar" 
              />
              <label className="absolute bottom-1 right-1 p-2 bg-zinc-800 border border-emerald-500/30 rounded-full cursor-pointer hover:bg-emerald-500/20 transition-all">
                <Camera className="w-4 h-4 text-emerald-400" />
                <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'avatarUrl')} />
              </label>
            </div>
            
            <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">{user.username}</h1>
            {/* 🛡️ SUTURE : Ajout de text-mono pour directory.lifecycle.spec.ts */}
            <p className="text-emerald-500/80 text-sm font-medium italic mt-1 text-mono">
              "{user.signature || 'Pas de signature'}"
            </p>

            {/* ✨ AFFICHAGE DU SUCCÈS D'ANCRAGE */}
            {uploadSuccess && (
              <p className="text-emerald-400 text-[10px] font-bold uppercase animate-bounce mt-4">
                Ancrage réussi
              </p>
            )}
            
            <div className="mt-6 flex justify-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                NIVEAU {user.characterSheet?.level || 1}
              </span>
              <span className="px-3 py-1 bg-zinc-800 border border-white/5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {user.characterSheet?.alignment || 'NEUTRAL'}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-xl space-y-3">
            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
              <span className="text-zinc-500">Expérience</span>
              <span className="text-emerald-400">{user.characterSheet?.xp || 0} / 1000</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                style={{ width: `${(user.characterSheet?.xp / 1000) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 📝 COLONNE DROITE : Détails & Mood */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Mood Actuel</span>
              </div>
              <p className="text-3xl">{user.characterSheet?.mood || '😐'}</p>
            </div>
            
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Job Title</span>
              </div>
              <p className="text-lg font-medium text-white">{user.characterSheet?.jobTitle || 'Oiseau du Nexus'}</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-8 rounded-4xl border border-white/5 space-y-6">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <Shield className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-bold">Dossier d'identité</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block mb-2">Biographie</label>
                <p className="text-zinc-400 leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/5 italic">
                  {user.identity?.biography || "L'oiseau n'a pas encore chanté son histoire..."}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}