// apps/hub-central/components/projects/ProjectCard.tsx
'use client';

import { useState } from 'react';
import { Paperclip, Zap, Layers, Plus, Trash2, Upload, Loader2, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'; 
import { IProject } from '@ilot/types';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ProjectCardProps {
  project: IProject;
  onEdit: (id: string) => void;
  onCreateTask: (uid: string) => void;
  onDelete?: (uid: string) => void;
  onViewTasks: (uid: string) => void;
}

export function ProjectCard({ project, onEdit, onCreateTask, onDelete, onViewTasks }: ProjectCardProps) {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState('');
  const [localDocuments, setLocalDocuments] = useState<any[]>(project.documents || []);

  // 🌀 SUTURE REACT QUERY : Mutation pour la suppression d'artefact
  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      const res = await fetch(`/api/projects/${project.uid}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: doc.url })
      });
      if (!res.ok) throw new Error("Échec de la désintégration de l'artefact.");
      return doc.uid;
    },
    onSuccess: (deletedUid) => {
      setLocalDocuments((prev) => prev.filter(d => d.uid !== deletedUid));
      toast.success("Artefact désintégré.");
    },
    onError: (err: any) => {
      toast.error(`🚨 Ineptie technique : ${err.message}`);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', label || file.name);

    try {
      const res = await fetch(`/api/projects/${project.uid}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Échec du scellage de l'artefact.");
      }

      const data = await res.json();
      
      const newDoc = {
        uid: data.document?.uid || data.key || `doc_${Date.now()}`,
        name: file.name,
        label: label || file.name,
        url: data.publicUrl || data.document?.url,
        mimeType: file.type
      };

      setLocalDocuments((prev) => [...prev, newDoc]);
      setLabel('');
    } catch (err: any) {
      toast.error(`🚨 Erreur d'alchimie : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!confirm("Anéantir définitivement cet artefact du Nid ?")) return;
    deleteMutation.mutate(doc);
  };

  return (
    <div 
      onClick={() => onViewTasks(project.uid)} 
      className="cursor-pointer group relative bg-black/40 border border-white/10 rounded-2xl p-6 hover:border-[#E5484D] transition-all"
    >
      <div className="bio-card p-6 border-l-4 transition-all hover:shadow-[0_0_20px_rgba(229,72,77,0.05)] flex flex-col justify-between" style={{ borderLeftColor: project.appearance?.color || '#E5484D' }}>
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                  {project.tag || 'PROJ'}
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${project.status === 'IN_PROGRESS' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                  {project.status}
                </span>
              </div>
              <h3 className="text-xl font-bold uppercase tracking-tight">{project.name}</h3>
            </div>
            
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onCreateTask(project.uid)} 
                className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-400 transition-all"
                title="Sceller un Atome (Tâche)"
              >
                <Plus size={16} />
              </button>

              <button 
                onClick={() => onEdit(project.uid)} 
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                title="Modifier le Chantier"
              >
                <Zap size={16} />
              </button>

              <button 
                onClick={() => onDelete?.(project.uid)} 
                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                title="Raser le Chantier (Supprimer)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-[9px] uppercase font-mono text-slate-500 mb-2">
              <span>Avancement</span>
              <span>{project.roadmap?.progress || 0}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-1000" 
                style={{ width: `${project.roadmap?.progress || 0}%`, backgroundColor: project.appearance?.color || '#E5484D' }}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex gap-6 border-t border-white/5 pt-4 items-center justify-between">
            <div className="flex gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-slate-500 uppercase">Complexité</span>
                <div className="flex items-center gap-1">
                  <Layers size={10} className="text-slate-600" />
                  <span className="text-xs font-bold">{project.health?.complexityLevel || 5}/10</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-slate-500 uppercase">Fichiers</span>
                <div className="flex items-center gap-1">
                  <Paperclip size={10} className="text-slate-600" />
                  <span className="text-xs font-bold">{localDocuments.length}</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(!isDrawerOpen); }}
              className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
            >
              {isDrawerOpen ? (
                <>Fermer <ChevronUp size={12} /></>
              ) : (
                <>Documents <ChevronDown size={12} /></>
              )}
            </button>
          </div>

          {isDrawerOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="mt-4 pt-4 border-t border-dashed border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="Label de la matière (ex: Plan au sol)..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-[11px] font-mono text-slate-300 outline-none focus:border-[#E5484D] transition-all"
                />
                <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/40 p-3 bg-black/20 hover:bg-emerald-500/5 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all">
                  {uploading ? (
                    <><Loader2 size={14} className="animate-spin" /> Écriture R2...</>
                  ) : (
                    <><Upload size={14} /> Injecter un Fragment</>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    disabled={uploading} 
                    onChange={handleFileUpload} 
                  />
                </label>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {localDocuments.map((doc: any) => (
                  <div 
                    key={doc.uid}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-slate-400 hover:text-slate-200 group/doc text-xs font-mono"
                  >
                    <a 
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 truncate flex-1 min-w-0"
                    >
                      <FileText size={12} className="text-slate-600 group-hover/doc:text-[#E5484D] transition-colors shrink-0" />
                      <span className="truncate text-[11px]">{doc.label || doc.name}</span>
                    </a>
                    
                    <div className="flex items-center gap-2 pl-2">
                      <button 
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover/doc:opacity-100 transition-opacity text-slate-500 hover:text-red-500 shrink-0"
                      >
                        {deleteMutation.isPending && deleteMutation.variables?.uid === doc.uid ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                      </button>
                      <ExternalLink size={10} className="text-slate-500 shrink-0" />
                    </div>
                  </div>
                ))}

                {localDocuments.length === 0 && (
                  <p className="text-center text-[9px] font-mono uppercase text-slate-600 py-4">
                    Aucune trace mémorielle liée à ce chantier.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}