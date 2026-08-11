// apps/hub-central/components/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react'; 
import { Link } from '../../navigation'; 
import { LogOut, User, Feather, Music, Disc3, Type, Heart, Compass, Gamepad2, Activity, Lock, Film, Sparkles, Rocket, Dices, Radiation, MessageSquare, LayoutDashboard, BookOpenCheck, Calculator, LineChart, Landmark, Trees } from 'lucide-react'; 
import { CanopyNotificationBadge } from './CanopyNotificationBadge';

export default function Sidebar() {   
  const { data: session } = useSession();   
  const username = session?.user?.name || "Oiseau Anonyme";   
  
  const [hiddenApps, setHiddenApps] = useState<string[]>([]);

  useEffect(() => {
    const storedHidden = localStorage.getItem('ilot_hidden_apps');
    if (storedHidden) {
      try {
        setHiddenApps(JSON.parse(storedHidden));
      } catch (e) {
        console.error("Erreur de lecture des préférences de navigation", e);
      }
    }
  }, []);

  const isVisible = (appId: string) => !hiddenApps.includes(appId);
  
  return (    
    <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-50">      
      <div className="bio-card p-4 flex flex-col items-center gap-4 border-r-0 rounded-2xl shadow-2xl bg-black/40 backdrop-blur-xl border border-white/5">        
        
        {/* Identité de l'Oiseau */}      
        <Link 
          href="/profile"
          className="flex flex-col items-center gap-2 group cursor-pointer"
          title="Mon Profil & Paramètres"
        >      
          <div className="w-12 h-12 rounded-full bg-[#E5484D]/10 border border-[#E5484D]/20 flex items-center justify-center text-[#E5484D] group-hover:bg-[#E5484D]/30 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(229,72,77,0.4)] transition-all duration-300">         
            <User size={24} />          
          </div>      
          <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">            
            {username}          
          </span>      
        </Link>      

        <div className="h-px w-8 bg-white/5" />      

        {/* Nid de Commandement */}
        {isVisible('dashboard') && (
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-red-400 transition-all"
            title="Nid de Commandement"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-red-500/30 group-hover:bg-red-500/5 transition-all">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Nid
            </span>
          </Link>
        )}

        {/* Messagerie de la Canopée */}
        {isVisible('message') && (
          <Link
            href="/message"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-indigo-400 transition-all relative"
            title="Messagerie de la Canopée"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 transition-all relative">
              <MessageSquare size={20} />
              <CanopyNotificationBadge />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Messagerie
            </span>
          </Link>
        )}

        {/* 🌳 Nouvelle Entrée : Le Sanctuaire de la Canopée ((inceptions)/canopy) */}
        <Link
          href="/canopy"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-emerald-400 transition-all"
          title="Sanctuaire de la Canopée"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
            <Trees size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Canopée
          </span>
        </Link>

        {/* 🏦 La Réserve de la Canopée (Banque) */}
        <Link
          href="/canopy-bank"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
          title="La Réserve de la Canopée (Banque)"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
            <Landmark size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Banque
          </span>
        </Link>

        {/* Bilan Statistique de la Canopée */}
        <Link
          href="/inception/canopy/stats"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
          title="Bilan Statistique de la Canopée"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
            <LineChart size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Stats
          </span>
        </Link>

        {/* Inception Kompta */}
        <Link
          href="/inception/kompta"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-emerald-400 transition-all"
          title="Inception Kompta (Comptabilité)"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
            <Calculator size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Kompta
          </span>
        </Link>

        {/* Observatoire des Fréquences */}
        {isVisible('observatoire') && (
          <Link
            href="/observatoire"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-cyan-400 transition-all"
            title="Observatoire des Fréquences"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-all">
              <Activity size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Observatoire
            </span>
          </Link>
        )}

        {/* Nexus des Jeux */}
        {isVisible('games') && (
          <Link
            href="/games"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-purple-400 transition-all"
            title="Le Nexus des Jeux"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-purple-500/30 group-hover:bg-purple-500/5 transition-all">
              <Gamepad2 size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Jeux
            </span>
          </Link>
        )}

        {/* Hub Marchand */}
        {isVisible('marketplace') && (
          <Link
            href="/le-bordel-de-dho"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-white transition-all"
            title="Le Bordel de DhÖ"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-white/30 group-hover:bg-white/5 transition-all">
              <Compass size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Marché
            </span>
          </Link>
        )}

        {/* SamploTek */}
        <Link
          href="/samplotek"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-red-500 transition-all"
          title="SamploTek (Studio E-Jay)"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-red-500/30 group-hover:bg-red-500/5 transition-all">
            <Disc3 size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            SamploTek
          </span>
        </Link>

        <div className="h-px w-8 bg-white/5" />

        {/* Sortie */} 
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