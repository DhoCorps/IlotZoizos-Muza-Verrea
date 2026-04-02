import React from 'react';
import { RoleBuilder } from '../../../../components/roles/RoleBuilder';
import { Shield } from 'lucide-react';

export default function RolesSettingsPage() {
  return (
    <div className="min-h-screen bg-[#05070A] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* En-tête harmonisé avec le Nexus */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
          {/* Effet de halo rouge en arrière-plan */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#E5484D]/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Shield className="text-[#E5484D]" size={32} />
              Atelier des Rôles
            </h1>
            <p className="text-slate-400 mt-2 font-mono text-sm uppercase tracking-widest">
              Architecture de la hiérarchie Zoizos
            </p>
            <p className="text-slate-500 mt-4 max-w-2xl text-sm italic">
              Définissez les grades et les permissions par défaut pour maintenir l'équilibre de l'Îlot. 
              Chaque rôle forgé ici devient une brique de la matrice sociale.
            </p>
          </div>
        </div>

        {/* Le RoleBuilder doit lui aussi adopter un thème sombre pour être cohérent */}
        <div className="bio-card p-1">
           <RoleBuilder />
        </div>
        
      </div>
    </div>
  );
}