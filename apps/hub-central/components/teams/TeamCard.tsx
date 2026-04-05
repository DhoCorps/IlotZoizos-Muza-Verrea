'use client';

import { Users, Activity, Shield } from 'lucide-react';
import { RecruitmentRadar } from './RecruitmentRadar';

// Typage strict pour garder la Silice propre
interface TeamMember {
  id: string;
  username: string;
  role: string;
  avatarUrl?: string;
}

interface TeamProps {
  team: {
    id: string;
    name: string;
    description?: string;
    members: TeamMember[];
    mentalLoadAvg?: number; // Optionnel : Moyenne de la charge mentale de l'escouade
  };
}

export function TeamCard({ team }: TeamProps) {
  return (
    // La classe .bio-card est vitale pour tes autres tests Playwright
    <section className="bio-card flex flex-col p-5 rounded-xl border border-slate-700 bg-slate-800/50 shadow-xl transition-all hover:border-emerald-500/50 relative overflow-hidden">
      
      {/* Effet lumineux de fond */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* 1. L'En-tête : Titre et Radar */}
      <div className="flex justify-between items-start mb-5 z-10">
        <div>
          <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            {team.name}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {team.description || "Escouade déployée dans le Nexus"}
          </p>
        </div>

        {/* Le fameux radar qui passera le test E2E */}
        <RecruitmentRadar teamId={team.id} />
      </div>

      {/* 2. Le HUD Bionique : Statistiques de l'équipe */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 z-10">
         <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Effectif
            </span>
            <span className="text-lg font-mono text-slate-200">{team.members?.length || 0} Zoizos</span>
         </div>
         
         <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Charge Mentale (Moyenne)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (team.mentalLoadAvg || 0) > 75 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${team.mentalLoadAvg || 0}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-300">{team.mentalLoadAvg || 0}%</span>
            </div>
         </div>
      </div>

      {/* 3. La Faction : Liste des membres */}
      <div className="mt-auto z-10">
        <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3 border-b border-slate-700/50 pb-1">
          Membres Actifs
        </h4>
        <div className="flex flex-wrap gap-2">
          {team.members && team.members.length > 0 ? (
            team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-2 py-1 bg-slate-800/80 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors cursor-default group"
                title={member.role}
              >
                <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden border border-slate-500 group-hover:border-emerald-500/50 transition-colors">
                  {member.avatarUrl ? (
                     <img src={member.avatarUrl} alt={member.username} className="w-full h-full object-cover" />
                  ) : (
                     <span className="text-[9px] font-bold text-slate-300">
                       {member.username.charAt(0).toUpperCase()}
                     </span>
                  )}
                </div>
                <span className="text-xs text-slate-300 font-medium">{member.username}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic flex items-center gap-1">
               Aucun oiseau dans cette escouade.
            </span>
          )}
        </div>
      </div>
      
    </section>
  );
}