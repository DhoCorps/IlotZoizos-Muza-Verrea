// apps/hub-central/components/tasks/TaskCard.tsx
'use client';

import { Clock, AlertCircle, Paperclip, Users, Play, Loader2, Trash2 } from 'lucide-react'; // 🪡 SUTURE : Ajout de Trash2
import { usePomodoro } from '../../context/PomodoroContext';

interface TaskCardProps {
  task: any;
  onStatusChange: (id: string, s: string) => void;
  onDelete?: (uid: string) => void; // 🪡 SUTURE MAJEURE : Capacité d'effacement de l'Atome
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const { startFocus, activeTaskUid, status } = usePomodoro();
  
  const pomoPercent = (task.pomodoros.completed / task.pomodoros.estimated) * 100;
  
  const isActive = activeTaskUid === task.uid;
  const isWorking = isActive && status === 'WORK';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("taskUid", task.uid);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
   <div 
      draggable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing" 
    >
      <div className={`bg-white/5 border p-4 rounded-2xl transition-all group ${
        isActive ? 'border-[#E5484D] shadow-[0_0_20px_rgba(229,72,77,0.15)]' : 'border-white/10 hover:border-[#E5484D]/30'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#E5484D] transition-colors">
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
              <AlertCircle size={12} className={task.metrics?.complexity >= 8 ? 'text-red-500' : ''} />
              <span className="text-[10px] font-mono">{task.metrics?.complexity || 1}/10</span>
            </div>
          </div>
        </div>
      </div>
   </div> 
  );
}