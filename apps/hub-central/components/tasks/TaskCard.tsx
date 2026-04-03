'use client';

import { CheckCircle2, Clock, AlertCircle, Paperclip, Users, Play, Loader2 } from 'lucide-react';
import { usePomodoro } from '../../context/PomodoroContext'; // 🍅 Ajout du Cœur Temporel (Ajuste le chemin si besoin)

export function TaskCard({ task, onStatusChange }: { task: any, onStatusChange: (id: string, s: string) => void }) {
  const { startFocus, activeTaskUid, status } = usePomodoro();
  
  const pomoPercent = (task.pomodoros.completed / task.pomodoros.estimated) * 100;
  
  // Vérifie si cet atome est celui actuellement dans le chronomètre
  const isActive = activeTaskUid === task.uid;
  const isWorking = isActive && status === 'WORK';

  

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("taskUid", task.uid);
    // Optionnel : donner un effet visuel de "fantôme" lors du drag
    e.dataTransfer.effectAllowed = "move";
  };

  return (
   <div 
      draggable // 🧲 Rend l'atome saisissable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing ..." // Style de curseur bio-tech
    >
      <div className={`bg-white/5 border p-4 rounded-2xl transition-all group ${
        isActive ? 'border-[#E5484D] shadow-[0_0_20px_rgba(229,72,77,0.15)]' : 'border-white/10 hover:border-[#E5484D]/30'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#E5484D] transition-colors">
            {task.content.title}
          </h4>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
            task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-500'
          }`}>
            {task.priority}
          </span>
        </div>

        {/* 🍅 Barre Pomodoro */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><Clock size={10} /> Cycles</span>
              <span className="text-slate-400">{task.pomodoros.completed} / {task.pomodoros.estimated}</span>
            </div>
            
            {/* 🕹️ Le Déclencheur du HUD */}
            {isWorking ? (
              <span className="text-[#E5484D] flex items-center gap-1 animate-pulse">
                <Loader2 size={10} className="animate-spin" /> Focus
              </span>
            ) : (
              <button 
                onClick={() => startFocus(task.uid)}
                className="flex items-center gap-1 text-slate-400 hover:text-[#E5484D] transition-colors bg-white/5 hover:bg-[#E5484D]/10 px-2 py-1 rounded"
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
          {/* Escouade assignée */}
          <div className="flex -space-x-2">
            {task.assigneeUids?.map((uid: string) => (
              <div key={uid} className="w-5 h-5 rounded-full bg-[#E5484D] border-2 border-[#05070A] flex items-center justify-center text-[8px] font-black text-white" title={uid}>
                {uid.substring(0, 2).toUpperCase()}
              </div>
            ))}
            {(!task.assigneeUids || task.assigneeUids.length === 0) && <Users size={12} className="text-slate-700" />}
          </div>

          <div className="flex gap-3 text-slate-500">
            {task.fileUploads?.length > 0 && <Paperclip size={12} />}
            <div className="flex items-center gap-1">
              <AlertCircle size={12} className={task.metrics.mentalLoad > 70 ? 'text-red-500' : ''} />
              <span className="text-[10px] font-mono">{task.metrics.mentalLoad}%</span>
            </div>
          </div>
        </div>
      </div>
   </div> 
  );
}