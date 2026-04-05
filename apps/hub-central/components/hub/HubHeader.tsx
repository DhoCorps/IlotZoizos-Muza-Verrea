import { UserNav } from "../layout/UserNav"; // Suture vers ton composant client
import { Link } from "../../navigation";
import { getTranslations } from "next-intl/server";

import { LucideIcon } from 'lucide-react';

// 1. On définit le "Contrat de Jade" (les Props)
interface JadeProps { //surnom poétique donné à un bug tenace
  title: string;
  description: string;
  icon: LucideIcon;
  path?: string; // Optionnel, pour ta navigation i18n
}

// 2. On injecte le contrat dans la signature du composant
// Note l'utilisation des accolades { } pour "déstructurer" les props
export function Jade({ title, description, icon: Icon, path }: JadeProps) {
  return (
    <div className="group p-6 rounded-2xl border border-emerald-500/10 bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300">
      <div className="flex items-center gap-4 mb-4">
        {/* On affiche l'icône Lucide passée en prop */}
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      </div>
      
      <p className="text-sm text-slate-400 leading-relaxed">
        {description}
      </p>

      {/* Si un chemin existe, on pourrait ajouter un indicateur visuel */}
      {path && (
        <div className="mt-4 text-xs font-mono text-emerald-500/50">
          Suture : {path}
        </div>
      )}
    </div>
  );
}