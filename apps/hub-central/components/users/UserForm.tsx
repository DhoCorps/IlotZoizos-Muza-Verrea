// apps/hub-central/components/UserForm.tsx
'use client';

import React, { useState } from 'react';

export default function UserForm({ initialData = null }: { initialData?: any }) {
  // État initial basé sur ton modèle complexe
  const [formData, setFormData] = useState(initialData || {
    username: '',
    email: '',
    password: '',
    signature: '',
    characterSheet: {
      jobTitle: '',
      alignment: 'neutral',
      mood: '😐'
    },
    identity: {
      biography: '',
      location: ''
    }
  });

  const [loading, setLoading] = useState(false);

  // Gestion des changements dans les objets imbriqués (CharacterSheet, Identity)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Ici, on appellera ta route de création/update standard
    console.log("🚀 Envoi du Zoizo vers la base de données...", formData);
    
    // Simulation d'inception réussie
    setTimeout(() => {
      setLoading(false);
      alert("Zoizo matérialisé avec succès !");
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl space-y-6">
      <h2 className="text-2xl font-bold text-emerald-400 mb-6">⚙️ Configuration du Zoizo</h2>

      {/* --- SECTION IDENTITÉ --- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-500">Nom d'utilisateur</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required
            className="w-full bg-zinc-800 border border-zinc-700 p-2 rounded focus:border-emerald-500 outline-none" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-500">Email (Nexus Id)</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required
            className="w-full bg-zinc-800 border border-zinc-700 p-2 rounded focus:border-emerald-500 outline-none" />
        </div>
      </div>

      {/* --- SECTION CHARACTER SHEET (La Gamification) --- */}
      <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-900/30 space-y-4">
        <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-widest">Fiche de Personnage</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Alignement</label>
            <select name="characterSheet.alignment" value={formData.characterSheet.alignment} onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 p-1 rounded text-sm">
              <option value="lawfull">Loyal</option>
              <option value="neutral">Neutre</option>
              <option value="chaotic">Chaotique</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Mood</label>
            <input type="text" name="characterSheet.mood" value={formData.characterSheet.mood} onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 p-1 rounded text-center" placeholder="😐" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Job Title</label>
            <input type="text" name="characterSheet.jobTitle" value={formData.characterSheet.jobTitle} onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 p-1 rounded text-sm" placeholder="Code Alchemist" />
          </div>
        </div>
      </div>

      {/* --- SIGNATURE & BIO --- */}
      <div className="space-y-2">
        <label className="text-xs uppercase text-zinc-500">Signature</label>
        <input type="text" name="signature" value={formData.signature} onChange={handleChange}
          className="w-full bg-zinc-800 border border-zinc-700 p-2 rounded italic text-emerald-400" placeholder="Hisse et haut..." />
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50">
        {loading ? 'SUTURE EN COURS...' : 'SCELLER LE ZOIZO'}
      </button>
    </form>
  );
}