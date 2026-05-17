// apps/hub-central/components/projects/ProjectForm.tsx
'use client'; 

import { useState } from 'react';
import { Layers, FolderPlus, Link as LinkIcon } from 'lucide-react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types/';

interface ProjectFormProps {
  ownerUid: string;
  existingProjects: any[];
  userCapabilities: string[]; 
  initialData?: any; 
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectForm({ 
  ownerUid, 
  existingProjects, 
  userCapabilities, 
  initialData,
  onSuccess, 
  onCancel 
}: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    
    // 🛡️ SUTURE : Vérification de l'ancrage de l'identité
    if (!ownerUid && !isEdit) {
      setErrorMsg("Le chantier est orphelin : aucun Nid (Team) sélectionné.");
      setLoading(false);
      return;
    }

    const payload = {
      ownerUid: isEdit ? initialData.ownerUid : ownerUid, 
      name: formData.get('name')?.toString(),
      tag: formData.get('tag')?.toString().toUpperCase(),
      description: formData.get('description')?.toString(),
      parentId: formData.get('parentId') || null, 
      status: formData.get('status'),
      priority: formData.get('priority'),
      category: formData.get('category'),
      appearance: {
        color: formData.get('color') || '#E5484D',
        icon: 'folder'
      },
      health: {
        complexityLevel: Number(formData.get('complexity')) || 5, 
      }
    };

    try {
      const url = isEdit ? `/api/projects/${initialData.uid}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de l'opération");
      }

      onSuccess();
    } catch (err: any) {
      console.error("🔥 Erreur Matrice Projet:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }; 

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
      
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs font-mono uppercase tracking-widest animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <FolderPlus size={12} /> {isEdit ? "Mutation du Chantier" : "Identité du Chantier"}
        </h4>
        <input 
          name="name" 
          defaultValue={initialData?.name}
          placeholder="Nom du projet (L'Œuvre)" 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-[#E5484D] outline-none text-slate-200 transition-all font-bold placeholder:font-normal placeholder:text-slate-600" 
          required 
        />
        <div className="grid grid-cols-2 gap-4">
          <input 
            name="tag" 
            defaultValue={initialData?.tag}
            placeholder="TAG (ex: RNWL)" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-200 transition-all uppercase placeholder:normal-case" 
          />
          <select 
            name="parentId" 
            defaultValue={initialData?.parentId || ""}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-400 transition-all"
          >
            <option value="">Projet Racine (Isolé)</option>
            {existingProjects?.filter(p => p.uid !== initialData?.uid).map((p: any) => (
              <option key={p.uid} value={p.uid}>↳ Sous-projet de : {p.name}</option>
            ))}
          </select>
        </div>
        <textarea 
          name="description" 
          defaultValue={initialData?.description}
          placeholder="Raconte l'intention du chantier..." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-200 transition-all h-24 resize-none" 
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classification</h4>
        <div className="grid grid-cols-3 gap-4">
          <select 
            name="status" 
            defaultValue={initialData?.status || "CONCEPT"}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300"
          >
            <option value="CONCEPT">Concept (Idée)</option>
            <option value="PLANNED">Planifié</option>
            <option value="IN_PROGRESS">En Cours</option>
          </select>
          <select 
            name="priority" 
            defaultValue={initialData?.priority || "MEDIUM"}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300"
          >
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critique</option>
          </select>
          <select 
            name="category" 
            defaultValue={initialData?.category || "TECHNICAL"}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300"
          >
            <option value="TECHNICAL">Technique</option>
            <option value="ARTISTIC">Artistique</option>
            <option value="SOCIAL">Social / Humain</option>
            <option value="OPEN_SOURCE">Open Source</option>
          </select>
        </div>
      </div>

      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/5 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2">
              <Layers size={10} /> Complexité
            </label>
            <input 
              type="range" 
              name="complexity" 
              min="1" 
              max="10" 
              defaultValue={initialData?.health?.complexityLevel || "5"}
              className="w-full accent-[#E5484D] cursor-pointer" 
            />
            <p className="text-[8px] text-slate-600 uppercase">Estime le labyrinthe (1 à 10).</p>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500">Couleur Organique</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="color" 
                defaultValue={initialData?.appearance?.color || "#E5484D"} 
                className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-full" 
              />
              <p className="text-[8px] text-slate-600 uppercase">La teinte du chantier.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <LinkIcon size={12} /> Actifs & Liens
        </h4>
        <input 
          name="fileUrls" 
          defaultValue={initialData?.fileUploads?.join(', ')}
          placeholder="URLs des ressources (séparées par des virgules)" 
          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-[#E5484D] outline-none text-xs font-mono text-slate-400 transition-all" 
        />
      </div>
      
      <div className="pt-6 flex flex-col gap-3">
        <RequireCapability 
          capabilities={userCapabilities} 
          need={isEdit ? CAPABILITIES.PROJECT.UPDATE : CAPABILITIES.PROJECT.CREATE}
          fallback={
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Ton aura est trop faible pour cette action.
              </p>
            </div>
          }
        >
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#c43d41] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(229,72,77,0.2)] text-white"
          >
            {loading ? 'Amorçage de la Matrice...' : isEdit ? 'Appliquer la Mutation' : 'Sceller le Chantier'}
          </button>
        </RequireCapability>

        <button 
          type="button" 
          onClick={onCancel} 
          className="py-3 text-[10px] uppercase font-mono tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
        >
          Abandonner
        </button>
      </div>
    </form>
  );
}