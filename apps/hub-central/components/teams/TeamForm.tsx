// apps/hub-central/components/teams/TeamForm.tsx
'use client';

import { useState } from 'react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types';
import { Network, PenTool, Globe, Lock, Palette } from 'lucide-react';

interface TeamFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  userCapabilities: string[];
  initialData?: any; // 🛡️ SUTURE : Support pour la mutation du Nid
}

export function TeamForm({ 
  onSuccess, 
  onCancel, 
  userCapabilities = [], // 🪡 SUTURE : Valeur par défaut pour éviter le crash
  initialData 
}: TeamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🛡️ Détermination du mode (Fondation vs Mutation)
  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    // 🔍 SONDE DE RÉSONANCE : On vérifie les droits avant l'envol
    console.log("🛡️ Vérification de l'Aura pour l'opération :", userCapabilities);
    
    const formData = new FormData(e.currentTarget);
    
    // 🛡️ HARMONISATION : Conversion explicite en String pour la Silice
    const data = {
      name: formData.get('name')?.toString(),
      description: formData.get('description')?.toString(),
      category: formData.get('category')?.toString(), 
      isPrivate: formData.get('isPrivate') === 'true', 
      frequency: formData.get('frequency')?.toString() || '#8b9dc3' // Gris Bleuté bionique [cite: 2026-03-27]
    };

    try {
      // 🛡️ SUTURE : Bascule dynamique de l'URL et de la Méthode
      const url = isEdit ? `/api/teams/${initialData.uid}` : '/api/teams';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errData = await response.json();
        // 🪡 Si l'erreur est liée aux droits, on le précise
        const customError = response.status === 403 
          ? "Le Nexus refuse cette fréquence (Droits insuffisants sur le serveur)." 
          : (errData.error || "Échec de l'opération sur le Nid");
        throw new Error(customError);
      }
      
      onSuccess();
    } catch (err: any) {
      console.error("🚨 Brèche lors de l'opération sur le nid:", err);
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs font-mono uppercase tracking-widest animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {/* 🏷️ IDENTITÉ DU NID */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <Network size={12} /> {isEdit ? "Mutation de l'Escouade" : "Fondation d'une Escouade"}
        </h4>
        <input 
          name="name" 
          defaultValue={initialData?.name}
          placeholder="Nom de l'Escouade (L'Identité)" 
          required 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-lg text-white outline-none focus:border-[#E5484D]/50 transition-all font-bold" 
        />
        <textarea 
          name="description" 
          defaultValue={initialData?.description}
          placeholder="Définis la mission de ce nid..." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-lg h-32 text-white outline-none focus:border-[#E5484D]/50 transition-all text-sm resize-none" 
        />
      </div>
      
      {/* 🧭 PARAMÈTRES & FRÉQUENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Globe size={10} /> Catégorie
          </label>
          <select 
            name="category" 
            defaultValue={initialData?.category || "SOCIAL"}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-xs text-slate-300 outline-none focus:border-[#E5484D]/30"
          >
             <option value="SOCIAL">Fréquence Sociale</option>
             <option value="DAWN">Aube (Dawn)</option>
             <option value="SYSTEM">Système (Nexus)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Lock size={10} /> Visibilité
          </label>
          <select 
            name="isPrivate" 
            defaultValue={initialData?.isPrivate ? "true" : "false"}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-xs text-slate-300 outline-none focus:border-[#E5484D]/30"
          >
             <option value="true">Nid Privé (Invisible)</option>
             <option value="false">Nid Public (Ouvert)</option>
          </select>
        </div>
      </div>

      {/* 🎨 SUTURE : Choix de la Fréquence HEX */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Palette size={10} /> Teinte du Nid [cite: 2026-03-27]
        </label>
        <div className="flex items-center gap-4">
          <input 
            type="color" 
            name="frequency" 
            defaultValue={initialData?.frequency || '#8b9dc3'} 
            className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-full" 
          />
          <p className="text-[8px] text-slate-600 uppercase">La signature chromatique du territoire.</p>
        </div>
      </div>

      {/* 🏁 ACTIONS DE SCELLEMENT */}
      <div className="pt-4 flex flex-col gap-4">
        {/* 🛡️ SUTURE : Adaptation de l'Aura requise */}
        <RequireCapability 
          capabilities={userCapabilities} 
          need={isEdit ? CAPABILITIES.TEAM.UPDATE : CAPABILITIES.TEAM.CREATE}
        >
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white shadow-[0_0_20px_rgba(229,72,77,0.2)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <>Sédimentation...</>
            ) : (
              <>{isEdit ? "Appliquer la Mutation" : "Confirmer la Fondation"}</>
            )}
          </button>
        </RequireCapability>
        
        <button 
          type="button" 
          onClick={onCancel} 
          className="text-[10px] text-slate-500 uppercase font-mono hover:text-slate-300 transition-colors py-2 text-center"
        >
          Abandonner
        </button>
      </div>
    </form>
  );
}