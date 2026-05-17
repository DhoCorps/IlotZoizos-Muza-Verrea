// apps/hub-central/components/teams/TeamCard.tsx
'use client';

import { Network, UserPlus, ShieldCheck, FolderPlus } from 'lucide-react';

interface TeamCardProps {
  team: any;
  onRecruit: (uid: string) => void;
  onFocus: (uid: string) => void;
  onCreateProject: (uid: string) => void; // 🪡 SUTURE : Lien direct pour la Matrioshka
  isActive?: boolean;
}

export function TeamCard({ team, onRecruit, onFocus, onCreateProject, isActive }: TeamCardProps) {
  return (
    <section 
      className={`bio-card p-6 border-l-4 transition-all duration-500 group ${
        isActive ? 'border-l-emerald-500 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 'border-l-[#E5484D] hover:border-l-emerald-500/50'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => onFocus(team.uid)}>
          <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500 group-hover:text-emerald-400'}`}>
            <Network size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">{team.name}</h2>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">
              {isActive ? "Nid Focalisé" : "Cliquer pour focaliser le Nexus"}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* 🪡 SUTURE : Bouton de création de Chantier intégré au Nid */}
          <button 
            onClick={() => onCreateProject(team.uid)} 
            className="p-2 hover:bg-[#E5484D]/10 rounded-lg text-slate-400 hover:text-[#E5484D] transition-all"
            title="Sceller un Chantier dans ce Nid"
          >
            <FolderPlus size={18} />
          </button>

          <button 
            onClick={() => onRecruit(team.uid)} 
            className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"
            title="Recruter un oiseau"
          >
            <UserPlus size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.members?.map((member: any) => (
          <div key={member.uid} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">{member.pseudo}</span>
              <span className="text-[10px] text-[#E5484D] uppercase tracking-widest">
                {member.signature || "Oiseau Libre"}
              </span>
            </div>
            <ShieldCheck size={14} className="text-slate-600" />
          </div>
        ))}
      </div>
    </section>
  );
}