// apps/hub-central/components/tasks/TaskCard.tsx
'use client';

import { useState } from 'react';
import { Clock, AlertCircle, Paperclip, Users, Play, Loader2, Trash2, Upload, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'; // 🪡 SUTURE : Icones pour l'alchimie d'upload
import { usePomodoro } from '../../context/PomodoroContext';

interface TaskCardProps {
  task: any;
  onStatusChange: (id: string, s: string) => void;
  onDelete?: (uid: string) => void; // 🪡 SUTURE MAJEURE : Capacité d'effacement de l'Atome
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const { startFocus, activeTaskUid, status } = usePomodoro();
  
  // --- ÉTATS DU TIROIR D'UPLOAD D'ATOME ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState('');
  const [localAttachments, setLocalAttachments] = useState<any[]>(task.content?.attachments || task.fileUploads || []);

  const pomoPercent = (task.pomodoros.completed / task.pomodoros.estimated) * 100;
  
  const isActive = activeTaskUid === task.uid;
  const isWorking = isActive && status === 'WORK';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("taskUid", task.uid);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', label || file.name);

    try {
      const res = await fetch(`/api/tasks/${task.uid}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Échec du scellage de la brindille.");
      }

      const data = await res.json();
      // Synchronisation immédiate de l'affichage local du tiroir
      setLocalAttachments((prev) => [...prev, data.attachment]);
      setLabel('');
    } catch (err: any) {
      alert(`🚨 Fracture d'upload : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
   <div 
      draggable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing" 
    >
      <div className={`bg-white/5 border p-4 rounded-2xl transition-all ${
        isActive ? 'border-[#E5484D] shadow-[0_0_20px_rgba(229,72,77,0.15)]' : 'border-white/10 hover:border-[#E5484D]/30'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#E5484D] transition-colors truncate max-w-[180px]">
            {task.content.title}
          </h4>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
              task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-500'
            }`}>
              {task.priority}
            </span>
            {/* 🪡 SUTURE VISUELLE : Option d'effacement de l'Atome au survol */}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(task.uid); }} 
              className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
              title="Désintégrer l'Atome (Supprimer)"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><Clock size={10} /> Cycles</span>
              <span className="text-slate-400">{task.pomodoros.completed} / {task.pomodoros.estimated}</span>
            </div>
            
            {isWorking ? (
              <span className="text-[#E5484D] flex items-center gap-1 animate-pulse">
                <Loader2 size={10} className="animate-spin" /> Focus
              </span>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); startFocus(task.uid); }}
                className="flex items-center gap-1 text-slate-400 hover:text-[#E5484D] transition-colors bg-white/5 hover:bg-[#E5484D]/10 px-2 py-1 rounded z-10"
                title="Démarrer un bloc de 30mn"
              >
                <Play size={10} fill="currentColor" /> 30mn
              </button>
            )}
          </div>
          
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#E5484D] shadow-[0_0_8px_#E5484D] transition-all duration-500" 
              style={{ width: `${Math.min(pomoPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex -space-x-2">
            {task.assigneeUids?.map((uid: string) => (
              <div key={uid} className="w-5 h-5 rounded-full bg-[#E5484D] border-2 border-[#05070A] flex items-center justify-center text-[8px] font-black text-white" title={uid}>
                {uid.substring(0, 2).toUpperCase()}
              </div>
            ))}
            {(!task.assigneeUids || task.assigneeUids.length === 0) && <Users size={12} className="text-slate-700" />}
          </div>

          <div className="flex gap-3 text-slate-500 items-center">
            {localAttachments.length > 0 && <Paperclip size={12} className="text-emerald-400" />}
            <div className="flex items-center gap-1">
              <AlertCircle size={12} className={task.metrics?.complexity >= 8 ? 'text-red-500' : ''} />
              <span className="text-[10px] font-mono">{task.metrics?.complexity || 1}/10</span>
            </div>

            {/* 🪡 SUTURE GRAPHIQUE : Bouton d'ouverture du tiroir de la Tâche */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(!isDrawerOpen); }}
              className="p-1 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 transition-all flex items-center"
            >
              {isDrawerOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* 🌟 LE TIROIR DES DOCUMENTS ATOMIQUES (Cloudflare R2) */}
        {isDrawerOpen && (
          <div className="mt-4 pt-4 border-t border-dashed border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              <input 
                type="text"
                placeholder="Label de la pièce (ex: Code de secours)..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-black/50 border border-white/5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 outline-none focus:border-[#E5484D] transition-all"
              />
              <label className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-emerald-500/30 p-2 bg-black/10 hover:bg-emerald-500/5 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-400 text-[9px] font-bold uppercase tracking-wider transition-all">
                {uploading ? (
                  <><Loader2 size={12} className="animate-spin" /> Écriture...</>
                ) : (
                  <><Upload size={12} /> Téléverser</>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  disabled={uploading} 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>

            {/* Liste des fichiers reliés */}
            <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
              {localAttachments.map((doc: any) => (
                <a 
                  key={doc.uid}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-1.5 rounded-md bg-white/[0.01] border border-white/5 hover:bg-white/5 transition-all text-slate-400 hover:text-slate-200 group/file text-[10px] font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={10} className="text-slate-600 group-hover/file:text-[#E5484D] transition-colors" />
                    <span className="truncate">{doc.label || doc.name}</span>
                  </div>
                  <ExternalLink size={8} className="opacity-0 group-hover/file:opacity-100 transition-opacity text-slate-500" />
                </a>
              ))}

              {localAttachments.length === 0 && (
                <p className="text-center text-[8px] font-mono uppercase text-slate-600 py-2">
                  Aucune pièce jointe.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
   </div> 
  );
}