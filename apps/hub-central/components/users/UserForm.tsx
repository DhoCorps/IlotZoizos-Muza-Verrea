// apps/hub-central/components/UserForm.tsx
'use client';

import React, { useState } from 'react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types';
import { Loader2, Save, Palette, Shield, User, Briefcase } from 'lucide-react';
import { CvProfileEditor } from './CvProfileEditor';

interface BirdProfileFormProps { 
  initialData?: any;
  userCapabilities?: string[];
}

export default function BirdProfileForm({ 
  initialData = null,
  userCapabilities = [] 
}: BirdProfileFormProps) {
  
  const [formData, setFormData] = useState({
    pseudo: initialData?.pseudo || '',
    signature: initialData?.signature || '<(:<',
    frequenceHEX: initialData?.frequenceHEX || '#8b9dc3',
    capabilities: Array.isArray(initialData?.capabilities) ? initialData.capabilities.join(', ') : (initialData?.capabilities || ''),
    sanctuaire: {
      biographie: initialData?.sanctuaire?.biographie || '',
      localisation: initialData?.sanctuaire?.localisation || ''
    },
    cvProfile: {
      professionalStatus: initialData?.cvProfile?.professionalStatus || 'EMPLOYEE',
      remotePreference: initialData?.cvProfile?.remotePreference || 'FLEXIBLE',
      freelanceDailyRateCents: initialData?.cvProfile?.freelanceDailyRateCents ? initialData.cvProfile.freelanceDailyRateCents / 100 : 0,
      experiences: initialData?.cvProfile?.experiences || [],
      educations: initialData?.cvProfile?.educations || []
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('sanctuaire.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        sanctuaire: { ...prev.sanctuaire, [field]: value }
      }));
    } else if (name.startsWith('cvProfile.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        cvProfile: { ...prev.cvProfile, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const targetIdentifier = initialData?.slug || initialData?.uid;
    if (!targetIdentifier) {
      setMessage({ type: 'error', text: "Identifiant de l'Oiseau introuvable pour la synchronisation." });
      setLoading(false);
      return;
    }

    const payload = {
      pseudo: formData.pseudo,
      frequenceHEX: formData.frequenceHEX,
      capabilities: formData.capabilities 
        ? formData.capabilities.split(',').map((item: string) => item.trim()).filter(Boolean) 
        : [],
      cvProfile: {
        ...formData.cvProfile,
        freelanceDailyRateCents: Number(formData.cvProfile.freelanceDailyRateCents) * 100
      }
    };

    try {
      const response = await fetch(`/api/users/${targetIdentifier}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Désynchronisation lors de l'étalonnage.");
      }

      setMessage({ type: 'success', text: "Le Sanctuaire et le profil CV ont été synchronisés avec succès." });
    } catch (err: any) {
      console.error("🔥 Erreur d'étalonnage :", err);
      setMessage({ type: 'error', text: err.message || "L'onde n'a pas pu être scellée." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-[#05070A]/80 border border-white/10 rounded-3xl shadow-2xl space-y-8 backdrop-blur-xl relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: formData.frequenceHEX }} />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <User className="w-6 h-6 text-[#E5484D]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-100">Calibrage du Sanctuaire</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Édition de l'Essence & Profil CV (SSOT)</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-white/5 shadow-inner" style={{ backgroundColor: formData.frequenceHEX }} />
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'} text-xs font-mono uppercase tracking-widest`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="pseudo-input" className="text-[10px] uppercase font-black text-[#E5484D] tracking-[0.2em] ml-1">Pseudonyme</label>
          <input 
            id="pseudo-input"
            type="text" 
            name="pseudo" 
            value={formData.pseudo} 
            onChange={handleChange} 
            required
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all" 
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="signature-input" className="text-[10px] uppercase font-black text-[#E5484D] tracking-[0.2em] ml-1">Signature de l'Oiseau</label>
          <input 
            id="signature-input"
            type="text" 
            name="signature" 
            value={formData.signature} 
            onChange={handleChange}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all" 
          />
        </div>
      </div>

      {/* 💼 SECTION PROFIL CV / MATCHMAKING (KONTAKT) */}
      <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Briefcase className="w-4 h-4 text-[#E5484D]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Paramètres de Matchmaking RH (Kontakt)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="professionalStatus-select" className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Statut Professionnel</label>
            <select
              id="professionalStatus-select"
              name="cvProfile.professionalStatus"
              value={formData.cvProfile.professionalStatus}
              onChange={handleChange}
              className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-200 outline-none focus:border-[#E5484D]/50"
            >
              <option value="FREELANCE">Freelance</option>
              <option value="EMPLOYEE">Salarié (Employé)</option>
              <option value="JOB_SEEKER">En recherche</option>
              <option value="STUDENT">Étudiant</option>
              <option value="ENTREPRENEUR">Entrepreneur</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="remotePreference-select" className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Préférence Télétravail</label>
            <select
              id="remotePreference-select"
              name="cvProfile.remotePreference"
              value={formData.cvProfile.remotePreference}
              onChange={handleChange}
              className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-200 outline-none focus:border-[#E5484D]/50"
            >
              <option value="FULL_REMOTE">Full Remote</option>
              <option value="HYBRID">Hybride</option>
              <option value="ON_SITE">Sur site</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="rate-input" className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">TJM indicatif (€)</label>
            <input 
              id="rate-input"
              type="number"
              name="cvProfile.freelanceDailyRateCents"
              value={formData.cvProfile.freelanceDailyRateCents}
              onChange={handleChange}
              placeholder="ex: 450"
              className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-200 outline-none focus:border-[#E5484D]/50"
            />
          </div>
        </div>

        {/* 📋 INTÉGRATION DU CvProfileEditor POUR LES EXPÉRIENCES ET FORMATIONS */}
        <div className="pt-4 border-t border-white/5">
          <CvProfileEditor 
            cvProfile={formData.cvProfile}
            onChange={(updatedCv) => setFormData(prev => ({ ...prev, cvProfile: updatedCv }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="biographie-textarea" className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Biographie du Sanctuaire</label>
          <textarea 
            id="biographie-textarea"
            name="sanctuaire.biographie" 
            value={formData.sanctuaire.biographie} 
            onChange={handleChange}
            placeholder="Décrivez votre fréquence..."
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl h-32 focus:border-[#E5484D]/50 outline-none text-sm text-slate-100 transition-all resize-none" 
          />
        </div>
      </div>

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
            <label htmlFor="capabilities-input" className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Capabilities (Plumes)</label>
          </div>
          <input 
            id="capabilities-input"
            type="text" 
            name="capabilities" 
            value={formData.capabilities} 
            onChange={handleChange} 
            placeholder="ex: project:create, team:invite"
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300 outline-none focus:border-[#E5484D]/30" 
          />
        </div>
      </div>

      <div className="pt-4">
        <RequireCapability capabilities={userCapabilities} need={CAPABILITIES.MEMBER.UPDATE}>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(229,72,77,0.2)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'CALIBRAGE EN COURS...' : 'SCELLER LE PROFIL & CV'}
          </button>
        </RequireCapability>
      </div>
    </form>
  );
}