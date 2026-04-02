import { Folder, Edit3, LayoutGrid, List } from 'lucide-react';

// 1. Mise à jour de l'interface (Le contrat)
interface ProjectDashboardProps {
  projects: any[];
  onEditProject: (uid: string) => void;
  onViewTasks: (uid: string) => void; // 👈 On ajoute la sacoche au messager
}

export function ProjectDashboard({ projects, onEditProject, onViewTasks }: ProjectDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {projects.map((project) => (
        <div key={project.uid} className="bio-card group hover:border-[#E5484D]/40 transition-all p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-[#E5484D]/10 rounded-xl text-[#E5484D]">
              <Folder size={24} />
            </div>
            <button 
              onClick={() => onEditProject(project.uid)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
            >
              <Edit3 size={18} />
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-200 mb-2">{project.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-2 mb-6 h-8">
            {project.description || "Aucune description pour ce chantier..."}
          </p>

          <div className="flex flex-col gap-3">
            {/* 🎯 LE BOUTON MAGIQUE : Celui qui appelle l'erreur */}
            <button 
              onClick={() => onViewTasks(project.uid)} // 👈 On utilise la prop ici
              className="w-full py-3 bg-[#E5484D]/10 hover:bg-[#E5484D] text-[#E5484D] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <LayoutGrid size={14} />
              Ouvrir le Chantier
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}