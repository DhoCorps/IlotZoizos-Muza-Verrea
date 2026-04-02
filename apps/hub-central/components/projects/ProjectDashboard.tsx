import { ProjectCard } from './ProjectCard';

export function ProjectDashboard({ projects, onEditProject }: { projects: any[], onEditProject: (uid: string) => void }) {
  if (projects.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Aucun chantier détecté dans la matrice</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {projects.map((project) => (
        <ProjectCard 
          key={project.uid} 
          project={project} 
          onEdit={() => onEditProject(project.uid)} 
        />
      ))}
    </div>
  );
}