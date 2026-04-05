'use client';

import { useState } from 'react';
import { Camera, Save, ArrowLeft, Shield, MapPin, Feather } from 'lucide-react';
import Link from 'next/link';

export function UserProfile({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [signature, setSignature] = useState(user?.signature || "");

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in duration-500">
      
      {/* 🧭 BARRE DE NAVIGATION PROFIL */}
      <div className="flex justify-between items-center mb-10">
        <Link 
          href="/fr/tom-hat-toes" 
          className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-500 hover:text-nexus-red transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Reprendre sa Route
        </Link>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-nexus-red/10 border border-nexus-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-nexus-red hover:bg-nexus-red/20 transition-all"
        >
          {isEditing ? "Abandonner" : "Modifier le Profil"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* 📸 ZONE AVATAR & R2 STORAGE */}
        <div className="bio-card p-8 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-nexus-red shadow-[0_0_20px_rgba(229,72,77,0.2)]">
              <img 
                src={user?.avatarUrl || "/default-bird.png"} 
                alt="Avatar de l'oiseau" 
                className="w-full h-full object-cover"
              />
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
              <Camera className="text-white w-8 h-8" />
              <input type="file" className="hidden" /> {/* TODO: Relier à ton API /api/users/upload */}
            </label>
          </div>
          <h2 className="mt-4 text-2xl font-black uppercase tracking-tighter italic">{user?.username}</h2>
          <span className="text-[10px] text-nexus-red uppercase tracking-[0.3em] font-bold">{user?.role}</span>
        </div>

        {/* 📜 ZONE INFOS & SIGNATURE */}
        <div className="md:col-span-2 space-y-6">
          <div className="bio-card p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Feather className="w-4 h-4" /> Signature de l'Oiseau
            </h3>
            {isEditing ? (
              <textarea 
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Rédige ta trace dans la Silice..."
                className="bio-input h-32 resize-none"
              />
            ) : (
              <p className="text-slate-300 italic font-serif leading-relaxed">
                "{signature || "Cet oiseau n'a pas encore laissé sa trace..."}"
              </p>
            )}
          </div>

          {isEditing && (
            <button className="w-full py-4 bg-nexus-red rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-transform">
              <Save className="w-5 h-5" /> Enregistrer dans le Nexus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}