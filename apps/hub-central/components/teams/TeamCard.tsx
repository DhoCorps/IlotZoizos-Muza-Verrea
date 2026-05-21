'use client';

import { useState, useEffect } from 'react';
import { Network, UserPlus, ShieldCheck, FolderPlus, Check, X, Clock, UserX, Eye, Trash2, Upload, Loader2, FileText, ExternalLink, ChevronDown, ChevronUp, Paperclip, Download } from 'lucide-react'; // 🪡 SUTURE : Ajout Download

interface TeamCardProps {
  team: any;
  onUploadSuccess?: () => void;
  onRecruit: (uid: string) => void;
  onFocus: (uid: string) => void;
  onCreateProject: (uid: string) => void; // 🪡 SUTURE : Lien direct pour la Matrioshka
  isActive?: boolean;
  isInvitation?: boolean; // 🪡 SUTURE EVOLUÉE : Flag pour basculer la carte en mode "Pacte d'Adhésion"
  onRespond?: (uid: string, action: 'ACCEPT' | 'REFUSE' | 'PURGE_REFUSE') => void; // 🪡 SUTURE EVOLUÉE : Déclencheur du choix de l'oiseau avec option purge
  onViewProjects?: (uid: string) => void; // 🪡 SUTURE : Actionneur de navigation vers les Chantiers du Nid
  onManageInvitation?: (teamUid: string, targetUid: string, action: 'CANCEL' | 'REINVITE') => void; // 🪡 SUTURE : Actionneur de gouvernance sur la volée invitée
  onDelete?: (uid: string) => void; // 🪡 SUTURE : Dissolution de l'escouade parent
}

export function TeamCard({ team, onRecruit, onFocus, onCreateProject, isActive, isInvitation, onRespond, onViewProjects, onManageInvitation, onDelete }: TeamCardProps) {
  // --- ÉTATS DU TIROIR D'UPLOAD DU NID ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState('');
  const [mediaType, setMediaType] = useState('attachments');
  const [localDocuments, setLocalDocuments] = useState<any[]>(team.documents || []);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 🪡 SUTURE DE RÉACTIVITÉ : On s'assure que si team.documents change (après refreshData), l'état se met à jour
  useEffect(() => {
    setLocalDocuments(team.documents || []);
  }, [team.documents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    formData.append('label', label || file.name);

    try {
      const res = await fetch(`/api/teams/${team.uid}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Échec du scellage de la brindille dans le Nid.");
      }

      const data = await res.json();
      // On insère dynamiquement la nouvelle pièce jointe pour un rendu sans latence
      const newDoc = {
        uid: data.key || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        label: label || file.name,
        url: data.publicUrl,
        mimeType: file.type
      };
      setLocalDocuments((prev) => [...prev, newDoc]);
      setLabel('');
    } catch (err: any) {
      alert(`🚨 Fracture d'alchimie du Nid : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🪡 SUTURE : Suppression d'un document
const handleDeleteDoc = async (doc: { uid: string, url: string }) => {
  if (!window.confirm("Effacer définitivement cet artefact du Nid ?")) return;

  setIsDeleting(doc.uid); // ⚡ Feedback visuel immédiat

  try {
    const res = await fetch(`/api/teams/${team.uid}/upload`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: doc.url }) // On passe l'URL pour que le backend puisse extraire la clef
    });

    // Lecture des données retournées par le serveur
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Échec de la désintégration.");
    }

    // Succès : Mise à jour de l'UI
    setLocalDocuments((prev) => prev.filter(d => d.uid !== doc.uid));
    console.log(`✅ [UI] Artefact ${doc.uid} évaporé.`);

  } catch (err: any) {
    console.error("❌ Erreur lors de la désintégration :", err);
    alert(`Ineptie technique : ${err.message || "Impossible de purger l'artefact"}`);
  } finally {
    setIsDeleting(null); // On libère le bouton
  }
};

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
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
              title="Recruter un oiseau"
            >
              <UserPlus size={18} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(!isDrawerOpen); }}
              className={`p-2 rounded-lg transition-all ${isDrawerOpen ? 'bg-[#E5484D]/20 text-[#E5484D]' : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'}`}
              title="Ouvrir les Archives Documentaires du Nid"
            >
              <Paperclip size={18} />
            </button>

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
              className="flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              <X size={14} /> Décliner
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (window.confirm("Effacer définitivement TOUTES vos activités et assignations dans ce Nid avant de refuser ?")) {
                  onRespond?.(team.uid, 'PURGE_REFUSE'); 
                }
              }}
              className="flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
              title="Refuser l'invitation et désintégrer mes données ici"
            >
              Purger &amp; Refuser
            </button>
          </div>
        </div>
      )}

      {isDrawerOpen && !isInvitation && (
        <div className="mb-6 p-4 bg-black/30 border border-white/5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#E5484D] font-mono">
              🗄️ Coffre de stockage R2 de l'escouade
            </div>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className="bg-black/60 border border-white/10 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 outline-none"
            >
              <option value="attachments">Pièces Jointes</option>
              <option value="blueprints">Plans / Blueprints</option>
              <option value="records">Registres / Audio</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col justify-center">
              <input 
                type="text"
                placeholder="Description / Libellé de la brindille..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-[#E5484D]/40 transition-all"
              />
              <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/30 p-3 bg-black/20 hover:bg-emerald-500/5 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all">
                {uploading ? (
                  <><Loader2 size={12} className="animate-spin" /> Écriture R2...</>
                ) : (
                  <><Upload size={12} /> Injecter dans R2</>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  disabled={uploading} 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
              {localDocuments.map((doc: any) => (
                <div 
                  key={doc.uid}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/5 transition-all text-slate-400 hover:text-slate-200 group/doc text-xs font-mono"
                >
                  <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate flex-1">
                    <FileText size={12} className="text-slate-600 group-hover/doc:text-[#E5484D] transition-colors" />
                    <span className="truncate text-[11px]">{doc.label || doc.name}</span>
                  </a>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                    <a href={doc.url} download title="Télécharger">
                      <Download size={14} className="hover:text-emerald-400" />
                    </a>
                    <button onClick={() => handleDeleteDoc(doc.uid)} title="Désintégrer">
                      <Trash2 size={14} className="text-red-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}

              {localDocuments.length === 0 && (
                <p className="text-center text-[9px] font-mono uppercase text-slate-600 py-6">
                  Aucun artefact partagé dans les archives de ce Nid.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.members?.filter((member: any) => member && (member.pseudo || member.uid)).map((member: any) => (
          <div key={member.uid} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">
                {member.pseudo || `Oiseau [${member.uid.substring(0, 5)}]`}
              </span>
              <span className="text-[10px] text-[#E5484D] uppercase tracking-widest">
                {member.signature || (team.ownerUid === member.uid ? "Architecte" : "Oiseau Libre")}
              </span>
            </div>
            <ShieldCheck size={14} className="text-slate-600" />
          </div>
        ))}
      </div>

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