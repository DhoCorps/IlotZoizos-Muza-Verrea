import { CheckCircle2, Clock, AlertCircle, Paperclip, Users } from 'lucide-react';

export function TaskCard({ task, onStatusChange }: { task: any, onStatusChange: (id: string, s: string) => void }) {
  const pomoPercent = (task.pomodoros.completed / task.pomodoros.estimated) * 100;

  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-[#E5484D]/30 transition-all group">
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

      {/* 🍅 Barre Pomodoro [cite: 2026-04-02] */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
          <span className="flex items-center gap-1"><Clock size={10} /> Cycles</span>
          <span>{task.pomodoros.completed} / {task.pomodoros.estimated}</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#E5484D] shadow-[0_0_8px_#E5484D]" 
            style={{ width: `${Math.min(pomoPercent, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        {/* Escouade assignée [cite: 2026-04-02] */}
        <div className="flex -space-x-2">
          {task.assigneeUids?.map((uid: string) => (
            <div key={uid} className="w-5 h-5 rounded-full bg-[#E5484D] border-2 border-[#05070A] flex items-center justify-center text-[8px] font-black" title={uid}>
              {uid.substring(0, 2).toUpperCase()}
            </div>
          ))}
          {task.assigneeUids?.length === 0 && <Users size={12} className="text-slate-700" />}
        </div>

        <div className="flex gap-3 text-slate-500">
          {task.fileUploads?.length > 0 && <Paperclip size={12} />}
          <div className="flex items-center gap-1">
            <AlertCircle size={12} className={task.metrics.mentalLoad > 70 ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-mono">{task.metrics.mentalLoad}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}