// apps/hub-central/components/teams/TeamForm.tsx
'use client';

import { useState } from 'react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types';
import { Network, Globe, Lock, Paperclip, Upload, Trash2, Loader2, FileText, ExternalLink } from 'lucide-react';

interface TeamFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  userCapabilities: string[];
  initialData?: any; 
}

export function TeamForm({ 
  onSuccess, 
  onCancel, 
  userCapabilities = [], 
  initialData 
}: TeamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [localDocuments, setLocalDocuments] = useState<any[]>(initialData?.documents || []);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name')?.toString(),
      description: formData.get('description')?.toString(),
      category: formData.get('category')?.toString(), 
      isPrivate: formData.get('isPrivate') === 'true', 
      frequency: formData.get('frequency')?.toString() || '#8b9dc3'
    };

    try {
      const url = isEdit ? `/api/teams/${initialData.slug || initialData.uid}` : '/api/teams';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Échec de l'opération");
      }
      
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const teamIdentifier = initialData?.slug || initialData?.uid;

    if (!file || !teamIdentifier) {
      alert("⚠️ Le Nid doit d'abord être fondé avant d'y greffer des artefacts.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', file.name);

    try {
      const res = await fetch(`/api/teams/${teamIdentifier}/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Échec du scellage.");
      
      setLocalDocuments((prev) => [...prev, { uid: data.key, name: file.name, url: data.publicUrl }]);
    } catch (err: any) {
      alert(`🚨 Erreur d'alchimie : ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (doc: { uid: string, url: string }) => {
    const teamIdentifier = initialData?.slug || initialData?.uid;
    if (!teamIdentifier || !confirm("Anéantir définitivement cet artefact ?")) return;

    setIsDeleting(doc.uid || doc.url);
    try {
      const res = await fetch(`/api/teams/${teamIdentifier}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: doc.url })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Échec de la désintégration.");
      
      setLocalDocuments((prev) => prev.filter(d => (d.uid || d.url) !== (doc.uid || doc.url)));
    } catch (err: any) {
      alert(`🚨 Ineptie : ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs font-mono">{errorMsg}</div>}

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <Network size={12} /> {isEdit ? "Mutation de l'Escouade" : "Fondation d'une Escouade"}
        </h4>
        <input name="name" defaultValue={initialData?.name} placeholder="Nom de l'Escouade" required className="w-full bg-black/40 border border-white/10 p-4 rounded-lg text-white outline-none focus:border-[#E5484D]/50 transition-all font-bold" />
        <textarea name="description" defaultValue={initialData?.description} placeholder="Mission du nid..." className="w-full bg-black/40 border border-white/10 p-4 rounded-lg h-32 text-white outline-none focus:border-[#E5484D]/50 transition-all text-sm resize-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Globe size={10} /> Catégorie</label>
            <select name="category" defaultValue={initialData?.category || "SOCIAL"} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-xs text-slate-300">
               <option value="SOCIAL">Sociale</option>
               <option value="DAWN">Aube</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Lock size={10} /> Visibilité</label>
            <select name="isPrivate" defaultValue={initialData?.isPrivate ? "true" : "false"} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-xs text-slate-300">
               <option value="true">Privé</option>
               <option value="false">Public</option>
            </select>
         </div>
      </div>

      {isEdit && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Paperclip size={10} /> Artefacts (Fichiers)</label>
          <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/30 p-3 bg-black/10 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase transition-all">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> Ajouter une brindille</>}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {localDocuments.map((doc: any, index: number) => {
              const docKey = doc.uid || doc.url || index;
              const isItemDeleting = isDeleting === (doc.uid || doc.url);
              return (
                <div key={docKey} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] font-mono text-slate-400">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:text-emerald-400">
                    <FileText size={10} /> {doc.label || doc.name || 'Document'} <ExternalLink size={8} />
                  </a>
                  <button type="button" onClick={() => handleDeleteDoc(doc)} disabled={isItemDeleting} className="hover:text-red-500">
                    {isItemDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>
              );
            })}
            {localDocuments.length === 0 && (
              <p className="text-[9px] text-slate-600 italic text-center py-1">Aucun artefact greffé au Nid.</p>
            )}
          </div>
        </div>
      )}

      <RequireCapability capabilities={userCapabilities} need={isEdit ? CAPABILITIES.TEAM.UPDATE : CAPABILITIES.TEAM.CREATE}>
        <button type="submit" disabled={isSubmitting} className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white hover:scale-[1.02] transition-all disabled:opacity-50">
          {isSubmitting ? "Sédimentation..." : (isEdit ? "Mutation" : "Confirmer la Fondation")}
        </button>
      </RequireCapability>
    </form>
  );
}