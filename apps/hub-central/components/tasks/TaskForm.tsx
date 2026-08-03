// apps/hub-central/components/tasks/TaskForm.tsx
'use client';

import { useState } from 'react';
import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES, TaskStatus } from '@ilot/types'; 
import { Clock, AlertCircle, Layers, UserPlus, Type, Loader2, CalendarHeart, Target, Paperclip, Upload, Trash2, FileText, ExternalLink } from 'lucide-react';

interface TaskFormProps {
  birds: any[];
  existingTasks: any[];
  projectCapabilities: string[];
  projectUid: string | null;
  initialData?: any; 
  initialScheduledDate?: Date | null;
  loading?: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function TaskForm({ 
  birds, 
  existingTasks, 
  onSubmit, 
  onCancel, 
  projectCapabilities = [],
  projectUid, 
  initialData,
  initialScheduledDate,
  loading = false
}: TaskFormProps) {
  const isEdit = !!initialData;
  
  const [localAttachments, setLocalAttachments] = useState<any[]>(initialData?.content?.attachments || initialData?.fileUploads || []);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const formatLocalTime = (d: Date | string | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData?.uid) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', file.name);

    try {
      const res = await fetch(`/api/tasks/${initialData.uid}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Échec du scellage.");
      const data = await res.json();
      setLocalAttachments((prev) => [...prev, data.attachment]);
    } catch (err: any) {
      alert(`🚨 Erreur d'alchimie : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (doc: any) => {
    if (!confirm("Anéantir définitivement cette pièce jointe ?")) return;
    setIsDeleting(doc.uid);
    try {
      const res = await fetch(`/api/tasks/${initialData.uid}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: doc.url })
      });
      if (!res.ok) throw new Error("Échec de la purge.");
      setLocalAttachments((prev) => prev.filter(d => d.uid !== doc.uid));
    } catch (err: any) {
      alert(`🚨 Ineptie technique : ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("taskUid", initialData?.uid);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <form 
      key={initialData?.uid || 'new'} 
      onSubmit={onSubmit} 
      draggable={isEdit}
      onDragStart={handleDragStart}
      className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar"
    >
      <input type="hidden" name="projectUid" value={projectUid || ""} />
      {initialScheduledDate && <input type="hidden" name="scheduledAt" value={initialScheduledDate.toISOString()} />}
      
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
            <Type size={12} /> {isEdit ? "Mutation de l'Atome" : "Nouvel Atome de Travail"}
          </h4>
        </div>

        <input name="title" defaultValue={initialData?.content?.title} placeholder="Titre de la tâche" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E5484D] font-bold" required />
        <textarea name="description" defaultValue={initialData?.content?.description} placeholder="Précise l'intention..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-slate-300 outline-none focus:border-[#E5484D] h-24 resize-none" />
      </div>

      {isEdit && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
           <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Paperclip size={10} /> Artefacts de l'Atome</label>
           <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/30 p-3 bg-black/10 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase transition-all">
             {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> Ajouter une brindille</>}
             <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
           </label>
           <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
             {localAttachments.map((doc: any) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={12} /> Oiseaux Assignés
          </label>
          <select name="assignees" multiple defaultValue={initialData?.assigneeUids || []} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white h-32 custom-scrollbar outline-none focus:border-[#E5484D]">
            {birds.map((b: any) => <option key={b.uid} value={b.uid}>{b.pseudo}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atome Parent</label>
          <select name="parentUid" defaultValue={initialData?.parentUid || ""} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="">Tâche Racine (Indépendante)</option>
            {existingTasks.filter(t => t.uid !== initialData?.uid).map((t: any) => <option key={t.uid} value={t.uid}>↳ {t.content.title}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
          <CalendarHeart size={14} /> Programmation temporelle
        </label>
        <input type="datetime-local" name="scheduledAt" defaultValue={formatLocalTime(initialData?.dates?.scheduledAt || initialScheduledDate)} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#E5484D]/50 transition-colors" />
      </div>

      <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2"><Clock size={10} /> Pomos Estimés</label>
            <input type="number" name="pomoEst" min="1" defaultValue={initialData?.pomodoros?.estimated || 1} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2"><AlertCircle size={10} /> Priorité</label>
            <select name="priority" defaultValue={initialData?.priority || "MEDIUM"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
              <option value="LOW">Basse</option> <option value="MEDIUM">Medium</option> <option value="HIGH">Haute</option> <option value="CRITICAL">Critique</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2"><Target size={10} /> Statut</label>
            <select name="status" defaultValue={initialData?.status || TaskStatus.TODO} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
              {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2"><Layers size={10} /> Complexité de la Forge</label>
          <input type="range" name="complexity" min="1" max="10" defaultValue={initialData?.metrics?.complexity || 1} className="w-full accent-[#E5484D] cursor-pointer" />
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-3">
        <RequireCapability capabilities={projectCapabilities} need={isEdit ? CAPABILITIES.TASK.UPDATE : CAPABILITIES.TASK.CREATE}>
          <button type="submit" disabled={loading} className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white hover:bg-[#c43d41] hover:scale-[1.01] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sédimentation...</> : (isEdit ? "Appliquer la Mutation" : "Sceller la Tâche")}
          </button>
        </RequireCapability>
        <button type="button" onClick={onCancel} className="w-full py-2 text-[9px] uppercase font-mono text-slate-500 hover:text-slate-200 transition-colors">Abandonner la Forge</button>
      </div>
    </form>
  );
}