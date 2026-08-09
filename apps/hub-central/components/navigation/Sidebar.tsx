'use client'; 

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react'; 
import { Link } from '../../navigation'; 
import { LogOut, User, Feather, Music, Type, Heart, Compass, Gamepad2, Activity, Lock, Film, Sparkles, Rocket, Dices, Radiation, MessageSquare, LayoutDashboard, BookOpenCheck, Calculator, LineChart } from 'lucide-react'; 
import { CanopyNotificationBadge } from './CanopyNotificationBadge';

export default function Sidebar() {   
  const { data: session } = useSession();   
  const username = session?.user?.name || "Oiseau Anonyme";   
  
  // 🪶 État local pour le masquage dynamique des applications issues de l'onboarding
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
        
        {/* 🪶 L'Identité de l'Oiseau (Cliquable vers le Profil) */}      
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

        {/* 👑 Navigation vers le Nid de Commandement (Dashboard) */}
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

        {/* 💬 Navigation vers la Messagerie Universelle (Canopée) */}
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

        {/* 📊 Navigation vers le Bilan Statistique de la Canopée */}
        <Link
          href="/inception/canopy/stats"
          className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
          title="Bilan Statistique de la Canopée"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
            <LineChart size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
            Stats Canopée
          </span>
        </Link>

        {/* 🧮 Navigation vers Inception Kompta */}
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

        {/* 🔭 Navigation vers l'Observatoire des Fréquences */}
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

        {/* 🌌 Navigation vers le Salon Privé & E2EE */}
        {isVisible('salon') && (
          <Link
            href="/salon"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-emerald-400 transition-all"
            title="Salon Privé (E2EE)"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
              <Lock size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Salon Privé
            </span>
          </Link>
        )}

        {/* 🎮 Navigation vers le Nexus des Jeux */}
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

        {/* 🔮 Navigation vers l'Oracle de Wikipédia */}
        {isVisible('games') && (
          <Link
            href="/games/wikioracle"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-cyan-400 transition-all"
            title="L'Oracle de Wikipédia"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-all">
              <BookOpenCheck size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Oracle
            </span>
          </Link>
        )}

        {/* ☢️ Navigation vers Atomik-K-Fard(e) */}
        {isVisible('games') && (
          <Link
            href="/games/atomik-k-far"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-red-500 transition-all"
            title="Atomik-K-Fard(e) (Conquête)"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-red-500/30 group-hover:bg-red-500/5 transition-all">
              <Radiation size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Atomik
            </span>
          </Link>
        )}

        {/* 🎬 Navigation vers Ciné-Max */}
        {isVisible('games') && (
          <Link
            href="/games/cinemax"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-emerald-400 transition-all"
            title="Ciné-Quizz-Ciné-Max"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
              <Film size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Ciné-Max
            </span>
          </Link>
        )}

        {/* 🎨 Navigation vers Soon'Art */}
        {isVisible('games') && (
          <Link
            href="/games/soonart"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
            title="Soon'Art (Démineur Artistique)"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Soon'Art
            </span>
          </Link>
        )}

        {/* 🚀 Navigation vers Galak-T-K */}
        {isVisible('games') && (
          <Link
            href="/games/galak-t-k"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-cyan-400 transition-all"
            title="Galak-T-K (Déminage Spatial)"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-all">
              <Rocket size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Galak-T-K
            </span>
          </Link>
        )}

        {/* 🎲 Navigation vers Plum'Zee */}
        {isVisible('games') && (
          <Link
            href="/games/plumzee"
            className="flex flex-col items-center gap-2 group text-slate-500 hover:text-amber-400 transition-all"
            title="Plum'Zee (Yahtzee Cosmique)"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
              <Dices size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-center">
              Plum'Zee
            </span>
          </Link>
        )}

        {/* 🧭 Navigation vers le Hub Central (Le Bordel de DhÖ / Marketplace) */}
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
              Hub Marchand
            </span>
          </Link>
        )}

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
        {isVisible('partita') && (
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
        )}

        {/* Navigation vers Letr'In & Sprites */}
        {isVisible('letrinSprite') && (
          <Link
            href="/letrinSprite"
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
        )}

        {/* 💘 Navigation vers Kontakt-RH */}
        {isVisible('kontakt') && (
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
        )}

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