import { BarChart3, Paperclip, AlertTriangle, Zap } from 'lucide-react';

export function ProjectCard({ project, onEdit }: { project: any, onEdit: (id: string) => void }) {
  return (
    <div className="bio-card p-6 border-l-4" style={{ borderLeftColor: project.appearance?.color || '#E5484D' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
              {project.tag || 'PROJ'}
            </span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${project.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
              {project.status}
            </span>
          </div>
          <h3 className="text-xl font-bold uppercase tracking-tight">{project.name}</h3>
        </div>
        <button onClick={() => onEdit(project.uid)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
          <Zap size={16} />
        </button>
      </div>

      {/* Barre de Progression Roadmap */}
      <div className="mb-6">
        <div className="flex justify-between text-[9px] uppercase font-mono text-slate-500 mb-2">
          <span>Avancement</span>
          <span>{project.roadmap?.progress || 0}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#E5484D] transition-all duration-1000" 
            style={{ width: `${project.roadmap?.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-slate-500 uppercase">Charge Mentale</span>
          <div className="flex items-center gap-1">
            <AlertTriangle size={10} className={project.health?.averageMentalLoad > 70 ? 'text-orange-500' : 'text-slate-600'} />
            <span className="text-xs font-bold">{project.health?.averageMentalLoad || 0}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-slate-500 uppercase">Fichiers</span>
          <div className="flex items-center gap-1">
            <Paperclip size={10} className="text-slate-600" />
            <span className="text-xs font-bold">{project.fileUploads?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}