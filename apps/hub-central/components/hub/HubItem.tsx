import { LucideIcon } from 'lucide-react';

// 1. On définit le contrat (l'Interface)
interface HubItemProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path?: string; // Voilà ton "Path" que tu cherchais !
}

// 2. On injecte l'interface dans le composant
// On utilise la décomposition ({ title, icon... }) pour récupérer les données
export function HubItem({ title, description, icon: Icon, path }: HubItemProps) {
  return (
    <div className="p-4 border border-emerald-500/20 rounded-xl bg-slate-900/50">
      <div className="flex items-center gap-3 mb-2">
        {/* On affiche l'icône comme un composant */}
        <Icon className="h-5 w-5 text-emerald-400" />
        <h3 className="font-bold text-emerald-100">{title}</h3>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
      
      {/* On utilise le path si l'Artisan l'a fourni */}
      {path && (
        <span className="text-xs text-emerald-500 mt-2 block">
          Route : {path}
        </span>
      )}
    </div>
  );
}