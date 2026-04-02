'use client';

import { signOut, useSession } from 'next-auth/react';
import { Link } from '../../navigation'; // Ton import i18n
import { LogOut, User } from 'lucide-react'; // Des icônes fines pour le style

export default function Sidebar() {
  const { data: session } = useSession();
  const username = session?.user?.name || "Oiseau Anonyme";

  return (
    <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
      <div className="bio-card p-4 flex flex-col items-center gap-8 border-r-0 rounded-2xl shadow-2xl bg-black/40 backdrop-blur-xl border border-white/5">
        
        {/* L'Identité de l'Oiseau */}
        <div className="flex flex-col items-center gap-2 group">
          <div className="w-12 h-12 rounded-full bg-[#E5484D]/10 border border-[#E5484D]/20 flex items-center justify-center text-[#E5484D] group-hover:bg-[#E5484D]/20 transition-all">
            <User size={24} />
          </div>
          <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
            {username}
          </span>
        </div>

        <div className="h-px w-8 bg-white/5" />

        {/* L'Action de Sortie */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-[#E5484D] transition-all"
          title="Reprendre sa Route"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-[#E5484D]/30 group-hover:bg-[#E5484D]/5 transition-all">
            <LogOut size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
            Reprendre sa Route
          </span>
        </button>
      </div>
    </aside>
  );
}