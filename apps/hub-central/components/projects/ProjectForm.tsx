// apps/hub-central/components/projects/ProjectForm.tsx
'use client'; 

import { useState, useEffect } from 'react';
import { Layers, FolderPlus, Link as LinkIcon, Paperclip, Upload, Trash2, Loader2, FileText, ExternalLink } from 'lucide-react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES, IProjectDocument } from '@ilot/types'; // 🪡 SUTURE : Import du type propre

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
  
  const [localDocuments, setLocalDocuments] = useState<IProjectDocument[]>(
    initialData?.documents?.map((d: any) => ({
      uid: String(d.uid),
      name: String(d.name),
      label: String(d.label),
      url: String(d.url),
      mimeType: String(d.mimeType),
      createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)
    })) || []
  );
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 🪡 TAXONOMIE DYNAMIQUE : État pour les catégories de projets
  const [projectCategories, setProjectCategories] = useState<{ value: string; label: string }[]>([
    { value: 'TECHNICAL', label: 'Technique' },
    { value: 'ARTISTIC', label: 'Artistique' },
    { value: 'SOCIAL', label: 'Social' }
  ]);

  useEffect(() => {
    fetch('/api/taxonomy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.projectCategories) {
          setProjectCategories(data.projectCategories);
        }
      })
      .catch(() => {/* Fallback silencieux sur les valeurs par défaut */});
  }, []);
  
  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    
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

  // 📤 LOGIQUE UPLOAD
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData?.uid) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', file.name);

    try {
      const res = await fetch(`/api/projects/${initialData.uid}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Échec du scellage.");
      const data = await res.json();
      setLocalDocuments((prev) => [...prev, data.document as IProjectDocument]);
    } catch (err: any) {
      alert(`🚨 Erreur d'alchimie : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🧨 LOGIQUE DÉSINTÉGRATION
  const handleDeleteAttachment = async (doc: IProjectDocument) => {
    if (!confirm("Anéantir définitivement cet artefact ?")) return;
    const uid = doc.uid as unknown as string;
    const url = doc.url as unknown as string;

    setIsDeleting(uid);
    
    try {
      const res = await fetch(`/api/projects/${initialData.uid}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: url }) 
    });
      if (!res.ok) throw new Error("Échec de la désintégration.");
      setLocalDocuments((prev) => prev.filter(d => d.uid !== doc.uid));
    } catch (err: any) {
      alert(`🚨 Ineptie technique : ${err.message}`);
    } finally {
      setIsDeleting(null);
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
        <input name="name" defaultValue={initialData?.name} placeholder="Nom du projet" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-[#E5484D] outline-none text-slate-200 transition-all font-bold" required />
        <div className="grid grid-cols-2 gap-4">
          <input name="tag" defaultValue={initialData?.tag} placeholder="TAG" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-200 uppercase" />
          <select name="parentId" defaultValue={initialData?.parentId || ""} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-400">
            <option value="">Projet Racine</option>
            {existingProjects?.filter(p => p.uid !== initialData?.uid).map((p: any) => (
              <option key={p.uid} value={p.uid}>↳ {p.name}</option>
            ))}
          </select>
        </div>
        <textarea name="description" defaultValue={initialData?.description} placeholder="Raconte l'intention du chantier..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-[#E5484D] outline-none text-sm text-slate-200 h-24 resize-none" />
      </div>

      {/* 📁 GESTION DES ARTEFACTS */}
      {isEdit && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
           <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Paperclip size={10} /> Artefacts du Chantier</label>
           <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/30 p-3 bg-black/10 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase transition-all">
             {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> Ajouter un Fragment</>}
             <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
           </label>
           <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
             {localDocuments.map((doc) => (
               <div key={doc.uid} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] font-mono text-slate-400">
                 <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:text-emerald-400">
                   <FileText size={10} /> {doc.label || doc.name} <ExternalLink size={8} />
                 </a>
                 <button onClick={() => handleDeleteAttachment(doc)} disabled={isDeleting === doc.uid} className="hover:text-red-500">
                   {isDeleting === doc.uid ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                 </button>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Classification avec Catégories Dynamiques */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classification</h4>
        <div className="grid grid-cols-3 gap-4">
          <select name="status" defaultValue={initialData?.status || "CONCEPT"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300">
            <option value="CONCEPT">Concept</option><option value="PLANNED">Planifié</option><option value="IN_PROGRESS">En Cours</option>
          </select>
          <select name="priority" defaultValue={initialData?.priority || "MEDIUM"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300">
            <option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critique</option>
          </select>
          <select name="category" defaultValue={initialData?.category || "TECHNICAL"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300">
            {projectCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/5 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2"><Layers size={10} /> Complexité</label>
            <input type="range" name="complexity" min="1" max="10" defaultValue={initialData?.health?.complexityLevel || "5"} className="w-full accent-[#E5484D] cursor-pointer" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500">Couleur Organique</label>
            <input type="color" name="color" defaultValue={initialData?.appearance?.color || "#E5484D"} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-full" />
          </div>
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-3">
        <RequireCapability capabilities={userCapabilities} need={isEdit ? CAPABILITIES.PROJECT.UPDATE : CAPABILITIES.PROJECT.CREATE}>
          <button type="submit" disabled={loading} className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white shadow-[0_0_20px_rgba(229,72,77,0.2)] hover:bg-[#c43d41] transition-all disabled:opacity-50">
            {loading ? 'Amorçage...' : (isEdit ? 'Appliquer la Mutation' : 'Sceller le Chantier')}
          </button>
        </RequireCapability>
        <button type="button" onClick={onCancel} className="py-3 text-[10px] uppercase font-mono tracking-widest text-slate-500 hover:text-slate-300 transition-colors">Abandonner</button>
      </div>
    </form>
  );
}