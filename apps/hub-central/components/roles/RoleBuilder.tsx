'use client';

import React, { useState } from 'react';
import { PermissionForm } from '../permissions/PermissionForm';

export const RoleBuilder = () => {
  const [intitule, setIntitule] = useState('');
  const [caps, setCaps] = useState<string[]>([]);
  const [isForging, setIsForging] = useState(false);

  const handleToggleCapability = (capId: string) => {
    setCaps((prev) =>
      prev.includes(capId) ? prev.filter((c) => c !== capId) : [...prev, capId]
    );
  };

  const handleCreateRole = async () => {
    if (!intitule.trim()) {
      alert("⚠️ L'intitulé du rôle est obligatoire.");
      return;
    }

    setIsForging(true);
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intitule: intitule.toUpperCase(), 
          permissions: caps 
        }),
      });

      if (response.ok) {
        alert(`Le rôle ${intitule} a été forgé avec succès !`);
        setIntitule('');
        setCaps([]); 
      } else {
        const data = await response.json();
        alert(`Erreur: ${data.error || 'La forge a échoué.'}`);
      }
    } catch (error: any) {
      console.error("Erreur de création:", error);
      alert("Le serveur n'a pas répondu.");
    } finally {
      setIsForging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-slate-900/50 rounded-2xl shadow-2xl border border-emerald-500/30 backdrop-blur-xl nexus-card">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-8 uppercase tracking-wider">
        🔨 Atelier de Forge
      </h2>
      
      <div className="mb-8">
        <label className="block text-sm font-medium text-emerald-400 mb-2">
          Intitulé du rôle (ex: MODERATEUR, CREATEUR_NID)
        </label>
        <input 
          type="text" 
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
          placeholder="Saisissez le nom du rôle..."
          className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
        />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-emerald-300 mb-4">Permissions par défaut associées :</h3>
        <PermissionForm 
          selectedCaps={caps} 
          onToggleCapability={handleToggleCapability} 
        />
      </div>

      <div className="flex justify-end mt-8 border-t border-slate-800/50 pt-6">
        <button
          onClick={handleCreateRole}
          disabled={isForging || !intitule.trim()}
          className={`py-3 px-8 rounded-lg text-white font-bold transition-all shadow-lg ${
            isForging || !intitule.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-900/40 hover:shadow-cyan-900/40 border border-emerald-500/50'
          }`}
        >
          {isForging ? 'Forge en cours...' : 'Créer le Rôle'}
        </button>
      </div>
    </div>
  );
};