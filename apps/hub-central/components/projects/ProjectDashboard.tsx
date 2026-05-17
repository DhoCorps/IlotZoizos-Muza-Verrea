// apps/hub-central/components/projects/ProjectDashboard.tsx
'use client';

import { ProjectCard } from './ProjectCard';

interface ProjectDashboardProps {
  projects: any[];
  onEditProject: (uid: string) => void;
  onViewTasks: (uid: string) => void; 
  onCreateTask: (uid: string) => void; 
}

export function ProjectDashboard({ 
  projects, 
  onEditProject, 
  onViewTasks, 
  onCreateTask 
}: ProjectDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {projects.map((project) => (
        <ProjectCard 
          key={project.uid} 
          project={project} 
          onEdit={onEditProject}
          // 🪡 SUTURE : On s'assure que le signal descend bien jusqu'à la carte
          onCreateTask={onCreateTask}
        />
      ))}
      
      {/* État vide si aucun Chantier n'est scellé dans ce Nid */}
      {projects.length === 0 && (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
          <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.3em]">
            Le silence règne ici. Aucun chantier n'est scellé dans ce Nid.
          </p>
        </div>
      )}
    </div>
  );
}