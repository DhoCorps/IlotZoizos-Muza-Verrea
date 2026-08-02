// apps/hub-central/components/navigation/Sidebar.tsx
'use client'; 

import { signOut, useSession } from 'next-auth/react'; 
import { Link } from '../../navigation'; 
import { LogOut, User, Feather, Music, Type, Heart, ShoppingBag, Compass } from 'lucide-react'; 

export default function Sidebar() {   
  const { data: session } = useSession();   
  const username = session?.user?.name || "Oiseau Anonyme";   
  
  return (     
    <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-50">       
      <div className="bio-card p-4 flex flex-col items-center gap-6 border-r-0 rounded-2xl shadow-2xl bg-black/40 backdrop-blur-xl border border-white/5">            
        
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

        {/* 🧭 Navigation vers le Hub Central (Le Bordel de DhÖ) */}
        <Link
          href="/le-bordel-de-dho"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-white transition-all"
          title="Le Bordel de DhÖ"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-white/30 group-hover:bg-white/5 transition-all">
            <Compass size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Hub Marchand
          </span>
        </Link>


        {/* Navigation vers le Blog (The Abyss) */}
        <Link
          href="/abyss-blog"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-emerald-400 transition-all"
          title="The Abyss"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
            <Feather size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            The Abyss
          </span>
        </Link>

        {/* Navigation vers la Partitionnerie (Partita) */}
        <Link
          href="/partita"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-[#E5484D] transition-all"
          title="La Partitionnerie"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-[#E5484D]/30 group-hover:bg-[#E5484D]/5 transition-all">
            <Music size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Partoch
          </span>
        </Link>

        {/* Navigation vers Letr'In & Sprites */}
        <Link
          href="/letr-in"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-cyan-400 transition-all"
          title="Letr'In & Sprites"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-all">
            <Type size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Letr'In
          </span>
        </Link>

        {/* 💘 Navigation vers Kontakt-RH (Tinder Pro & Quêtes JDR) */}
        <Link
          href="/kontakt"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
          title="Kontakt-RH"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
            <Heart size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Kontakt
          </span>
        </Link>

        {/* Séparateur */}
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
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">            
            Sortir          
          </span>        
        </button>      

      </div>    
    </aside>   
  ); 
}