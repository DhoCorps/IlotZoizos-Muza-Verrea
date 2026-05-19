// apps/hub-central/components/projects/ProjectCard.tsx
'use client';

import { Paperclip, Zap, Layers, Plus, Trash2 } from 'lucide-react'; // 🪡 SUTURE : Ajout de Trash2

interface ProjectCardProps {
  project: any;
  onEdit: (id: string) => void;
  onCreateTask: (uid: string) => void; // 🪡 SUTURE : La Matrioshka continue vers l'Atome
  onDelete?: (uid: string) => void; // 🪡 SUTURE MAJEURE : Capacité d'effacement du Chantier
}

export function ProjectCard({ project, onEdit, onCreateTask, onDelete }: ProjectCardProps) {
  return (
    <div className="bio-card p-6 border-l-4 transition-all hover:shadow-[0_0_20px_rgba(229,72,77,0.05)]" style={{ borderLeftColor: project.appearance?.color || '#E5484D' }}>
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
        
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              onCreateTask(project.uid); 
            }} 
            className="p-2 hover:bg-[#E5484D]/10 rounded-lg text-slate-500 hover:text-[#E5484D] transition-all"
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

          {/* 🪡 SUTURE : Option de Suppression physique du Chantier */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(project.uid); }} 
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

      <div className="flex gap-6 border-t border-white/5 pt-4">
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
            <span className="text-xs font-bold">{project.fileUploads?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}