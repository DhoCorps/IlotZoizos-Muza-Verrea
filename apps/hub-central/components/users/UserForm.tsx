// apps/hub-central/components/UserForm.tsx
'use client';

import React, { useState } from 'react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types';
import { Loader2, Save, Palette, Shield, User } from 'lucide-react';

interface BirdProfileFormProps { 
  initialData?: any;
  userCapabilities?: string[];
}

export default function BirdProfileForm({ 
  initialData = null,
  userCapabilities = [] 
}: BirdProfileFormProps) {
  
  // 🛡️ ÉTALONNAGE DU STATE : Aligné sur le Schéma Oiseau & Sanctuaire
  const [formData, setFormData] = useState({
    pseudo: initialData?.pseudo || '',
    email: initialData?.email || '',
    signature: initialData?.signature || '<(:<',
    frequenceHEX: initialData?.frequenceHEX || '#8b9dc3',
    capabilities: Array.isArray(initialData?.capabilities) ? initialData.capabilities.join(', ') : (initialData?.capabilities || ''),
    sanctuaire: {
      biographie: initialData?.sanctuaire?.biographie || '',
      localisation: initialData?.sanctuaire?.localisation || ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Gestion du Sanctuaire Polymorphe (Nested State)
    if (name.startsWith('sanctuaire.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        sanctuaire: { ...prev.sanctuaire, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 🕊️ TRANSFORMATION DE L'capabilities : De la string vers le tableau de capacités
    const payload = {
      ...formData,
      uid: initialData?.uid, 
      capabilities: formData.capabilities ? formData.capabilities.split(',').map((item: string) => item.trim()).filter(Boolean) : []
    };

    try {
      // 🛡️ SUTURE API : Appel à votre route de mise à jour purifiée
      const response = await fetch('/api/auth/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: "Le Sanctuaire a été calibré avec succès." });
      } else {
        throw new Error("Désynchronisation lors de l'étalonnage.");
      }
    } catch (err) {
      console.error("🔥 Erreur d'étalonnage :", err);
      setMessage({ type: 'error', text: "L'onde n'a pas pu être scellée." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-[#05070A]/80 border border-white/10 rounded-3xl shadow-2xl space-y-8 backdrop-blur-xl relative overflow-hidden">
      
      {/* Indicateur de vibration visuelle */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: formData.frequenceHEX }} />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <User className="w-6 h-6 text-[#E5484D]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-100">Calibrage du Sanctuaire</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Édition de l'Essence Digitale</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-white/5 shadow-inner" style={{ backgroundColor: formData.frequenceHEX }} />
      </div>

      {/* 👤 IDENTITÉ DE BASE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-[#E5484D] tracking-[0.2em] ml-1">Pseudonyme</label>
          <input 
            type="text" 
            name="pseudo" 
            value={formData.pseudo} 
            onChange={handleChange} 
            required
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-[#E5484D] tracking-[0.2em] ml-1">Signature de l'Oiseau</label>
          <input 
            type="text" 
            name="signature" 
            value={formData.signature} 
            onChange={handleChange}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all" 
          />
        </div>
      </div>

      {/* 🧠 SANCTUAIRE (Bio & Localisation) */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Biographie du Sanctuaire</label>
          <textarea 
            name="sanctuaire.biographie" 
            value={formData.sanctuaire.biographie} 
            onChange={handleChange}
            placeholder="Décrivez votre fréquence..."
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl h-32 focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all resize-none" 
          />
        </div>
      </div>

      {/* 🎨 VIBRATIONS & POUVOIRS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-slate-500" />
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Fréquence HEX</label>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="color" 
              name="frequenceHEX" 
              value={formData.frequenceHEX} 
              onChange={handleChange} 
              className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-lg" 
            />
            <span className="font-mono text-xs text-slate-400">{formData.frequenceHEX.toUpperCase()}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-500" />
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">capabilities (Capabilities)</label>
          </div>
          <input 
            type="text" 
            name="capabilities" 
            value={formData.capabilities} 
            onChange={handleChange} 
            placeholder="ex: project:create, team:invite"
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300 outline-none focus:border-[#E5484D]/30" 
          />
        </div>
      </div>

      {/* 🛡️ VALIDATION SOUVERAINE */}
      <div className="pt-4">
        <RequireCapability capabilities={userCapabilities} need={CAPABILITIES.MEMBER.UPDATE}>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(229,72,77,0.2)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'CALIBRAGE EN COURS...' : 'SCELLER LE PROFIL'}
          </button>
        </RequireCapability>
      </div>
    </form>
  );
}