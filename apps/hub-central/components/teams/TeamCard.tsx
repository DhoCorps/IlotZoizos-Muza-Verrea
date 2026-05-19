// apps/hub-central/components/teams/TeamCard.tsx
'use client';

import { Network, UserPlus, ShieldCheck, FolderPlus, Check, X, Clock, UserX, Eye, Trash2 } from 'lucide-react'; // 🪡 SUTURE : Ajout de Trash2 pour la gouvernance de Nid

interface TeamCardProps {
  team: any;
  onRecruit: (uid: string) => void;
  onFocus: (uid: string) => void;
  onCreateProject: (uid: string) => void; // 🪡 SUTURE : Lien direct pour la Matrioshka
  isActive?: boolean;
  isInvitation?: boolean; // 🪡 SUTURE EVOLUÉE : Flag pour basculer la carte en mode "Pacte d'Adhésion"
  onRespond?: (uid: string, action: 'ACCEPT' | 'REFUSE') => void; // 🪡 SUTURE EVOLUÉE : Déclencheur du choix de l'oiseau
  onViewProjects?: (uid: string) => void; // 🪡 SUTURE : Actionneur de navigation vers les Chantiers du Nid
  onManageInvitation?: (teamUid: string, targetUid: string, action: 'CANCEL' | 'REINVITE') => void; // 🪡 SUTURE : Actionneur de gouvernance sur la volée invitée
  onDelete?: (uid: string) => void; // 🪡 SUTURE : Dissolution de l'escouade parent
}

export function TeamCard({ team, onRecruit, onFocus, onCreateProject, isActive, isInvitation, onRespond, onViewProjects, onManageInvitation, onDelete }: TeamCardProps) {
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
              {isInvitation ? "Invitation en attente dans la Canopée" : isActive ? "Nid Focalisé (Cliquer pour ajuster l'Aura)" : "Cliquer pour ouvrir la modale d'ajustement"}
            </p>
          </div>
        </div>
        
        {/* On affiche les contrôles d'administration uniquement si ce n'est pas une invitation en attente */}
        {!isInvitation && (
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onViewProjects?.(team.uid); }} 
              className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"
              title="Visualiser les Chantiers de ce Nid"
            >
              <Eye size={18} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onCreateProject(team.uid); }} 
              className="p-2 hover:bg-[#E5484D]/10 rounded-lg text-slate-400 hover:text-[#E5484D] transition-all"
              title="Sceller un Chantier dans ce Nid"
            >
              <FolderPlus size={18} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onRecruit(team.uid); }} 
              className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"
              title="Recruter un oiseau"
            >
              <UserPlus size={18} />
            </button>

            {/* 🪡 SUTURE : Bouton d'effacement physique du Nid parent */}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(team.uid); }} 
              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
              title="Dissoudre l'escouade parent (Supprimer)"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 🤝 BLOC PACTE D'ADHÉSION */}
      {isInvitation && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-xl mb-6 border border-dashed border-slate-700 hover:border-emerald-500/30 transition-all">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Pacte d'Adhésion National</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Acceptez-vous de lier votre fréquence à ce Nid ?</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={(e) => { e.stopPropagation(); onRespond?.(team.uid, 'ACCEPT'); }}
              className="flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              <Check size={14} /> Rejoindre
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRespond?.(team.uid, 'REFUSE'); }}
              className="flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 bg-[#E5484D]/10 hover:bg-[#E5484D] text-[#E5484D] hover:text-white border border-[#E5484D]/20 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              <X size={14} /> Décliner
            </button>
          </div>
        </div>
      )}

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

      {/* 🪡 SUTURE ENRICHIED : Tableau de bord de suivi des invitations */}
      {team.invitations && team.invitations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in duration-350">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 font-mono">
            Suivi de la Volée (Invitations émanant du Nid)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {team.invitations.map((invite: any) => (
              <div 
                key={invite.uid} 
                className="bg-white/[0.02] p-3 rounded-xl flex items-center justify-between border border-dashed border-white/5 hover:border-slate-700 transition-all group/invite"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-400 group-hover/invite:text-slate-300 transition-colors">
                    {invite.pseudo}
                  </span>
                  <span 
                    className={`text-[9px] font-mono uppercase tracking-wider mt-0.5 ${
                      invite.status === 'PENDING' ? 'text-amber-400/80' : 'text-[#E5484D]/80'
                    }`}
                  >
                    {invite.status === 'PENDING' ? 'En attente' : 'Invit. Déclinée'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {invite.status === 'PENDING' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onManageInvitation?.(team.uid, invite.uid, 'CANCEL'); }}
                      className="px-2 py-1 bg-red-500/10 hover:bg-[#E5484D] text-red-400 hover:text-white border border-red-500/20 text-[9px] font-black uppercase tracking-wider rounded transition-all"
                      title="Annuler l'invitation et respecter l'envol de l'oiseau"
                    >
                      Annuler
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onManageInvitation?.(team.uid, invite.uid, 'REINVITE'); }}
                      className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider rounded transition-all"
                      title="Relancer l'invitation courtoisement"
                    >
                      Relancer
                    </button>
                  )}
                  
                  {invite.status === 'PENDING' ? (
                    <Clock size={14} className="text-amber-500/40 group-hover/invite:text-amber-400 transition-colors" />
                  ) : (
                    <UserX size={14} className="text-[#E5484D]/40 group-hover/invite:text-[#E5484D] transition-colors" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}