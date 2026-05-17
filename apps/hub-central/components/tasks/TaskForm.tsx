// apps/hub-central/components/tasks/TaskForm.tsx
'use client';

import { RequireCapability } from '../auth/RequireCapability';
import { CAPABILITIES } from '@ilot/types';
import { Clock, AlertCircle, Layers, UserPlus, Type, Loader2 } from 'lucide-react';

interface TaskFormProps {
  birds: any[];
  existingTasks: any[];
  projectCapabilities: string[];
  projectUid: string | null;
  initialData?: any; 
  loading?: boolean; // 🪡 SUTURE : Pour éviter l'effet "bouton muet"
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
  loading = false
}: TaskFormProps) {
  const isEdit = !!initialData;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
      {/* 🔒 Suture Technique : Ancrage de l'atome au projet */}
      <input type="hidden" name="projectUid" value={projectUid || ""} />
      
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
            <Type size={12} /> {isEdit ? "Mutation de l'Atome" : "Nouvel Atome de Travail"}
          </h4>
          
          {projectUid && (
            <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
              ID_PROJET: {projectUid.slice(0, 8)}...
            </span>
          )}
        </div>

        <input 
          name="title" 
          defaultValue={initialData?.content?.title}
          placeholder="Titre de la tâche (L'Action)" 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E5484D] transition-all font-bold" 
          required 
        />
        <textarea 
          name="description" 
          defaultValue={initialData?.content?.description}
          placeholder="Précise l'intention derrière cet atome..." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-slate-300 outline-none focus:border-[#E5484D] transition-all h-24 resize-none" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={12} /> Oiseaux Assignés
          </label>
          <select 
            name="assignees" 
            multiple 
            defaultValue={initialData?.assigneeUids || []}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white h-32 custom-scrollbar outline-none focus:border-[#E5484D]"
          >
            {birds.map((b: any) => (
              <option key={b.uid} value={b.uid} className="p-2 hover:bg-[#E5484D]/20">
                {b.pseudo}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atome Parent</label>
          <select 
            name="parentUid" 
            defaultValue={initialData?.parentUid || ""}
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]"
          >
            <option value="">Tâche Racine (Indépendante)</option>
            {existingTasks.filter(t => t.uid !== initialData?.uid).map((t: any) => (
              <option key={t.uid} value={t.uid}>↳ {t.content.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2">
              <Clock size={10} /> Cycles Estimés (Pomos)
            </label>
            <input 
              type="number" 
              name="pomoEst" 
              min="1" 
              defaultValue={initialData?.pomodoros?.estimated || 1}
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2">
              <AlertCircle size={10} /> Priorité
            </label>
            <select 
              name="priority" 
              defaultValue={initialData?.priority || "MEDIUM"}
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]"
            >
              <option value="LOW">Basse</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">Haute</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2">
            <Layers size={10} /> Complexité de la Forge
          </label>
          <input 
            type="range" 
            name="complexity" 
            min="1" 
            max="10" 
            defaultValue={initialData?.metrics?.complexity || 1}
            className="w-full accent-[#E5484D] cursor-pointer" 
          />
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-3">
        <RequireCapability 
          capabilities={projectCapabilities} 
          // 🛡️ SUTURE : On s'assure que '*' (Admin) ou le droit spécifique passe
          need={isEdit ? CAPABILITIES.TASK.UPDATE : CAPABILITIES.TASK.CREATE}
        >
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white shadow-[0_0_20px_rgba(229,72,77,0.2)] hover:bg-[#c43d41] hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sédimentation...</>
            ) : (
              isEdit ? "Appliquer la Mutation" : "Sceller la Tâche"
            )}
          </button>
        </RequireCapability>
        
        <button 
          type="button" 
          onClick={onCancel} 
          className="w-full py-2 text-[9px] uppercase font-mono text-slate-500 hover:text-slate-200 transition-colors"
        >
          Abandonner la Forge
        </button>
      </div>
    </form>
  );
}