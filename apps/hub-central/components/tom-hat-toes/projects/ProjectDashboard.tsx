// apps/hub-central/components/projects/ProjectDashboard.tsx
'use client';

import { ProjectCard } from './ProjectCard';

interface ProjectDashboardProps {
  projects: any[];
  onEditProject: (uid: string) => void;
  onViewTasks: (uid: string) => void; 
  onCreateTask: (uid: string) => void;
  onDelete?: (uid: string) => void; 
}

export function ProjectDashboard({ 
  projects, 
  onEditProject, 
  onViewTasks, // Cette prop doit arriver ici
  onCreateTask,
  onDelete
}: ProjectDashboardProps) {
  return (
    <div className="grid grid-cols-1 ...">
      {projects.map((project) => (
        <ProjectCard 
          key={project.uid} 
          project={project} 
          onEdit={onEditProject}
          onViewTasks={onViewTasks} // <--- C'est ici le point de rupture potentiel
          onCreateTask={onCreateTask}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}