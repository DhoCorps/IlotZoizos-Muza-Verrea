'use client';

import { useState, useRef, useEffect } from 'react';
// 🟢 Notre boussole i18n
import { Link, useRouter } from "../../navigation"; 
import { signOut, useSession } from "next-auth/react";
import { Settings, User, LogOut } from "lucide-react";

export function UserNav() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 🌟 On active le propulseur de navigation qui gère les langues tout seul !
  const router = useRouter();

  // 🪄 Magie : ferme le menu si l'oiseau clique ailleurs sur l'écran
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    // 🌟 LA SOUDURE : On tue la session en interdisant à NextAuth de nous rediriger de force...
    await signOut({ redirect: false });
    
    // ... et on utilise notre propre routeur qui va automatiquement ajouter '/fr' ou '/en' !
    router.push('/auth/login');
  };

  if (!session?.user) return null;

  const initials = session.user.name?.substring(0, 2).toUpperCase() || "ZO";

  return (
    <div className="relative" ref={menuRef}>
      
      {/* 🟢 Le Bouton Avatar (Trigger) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-900/50 hover:bg-emerald-500/20 text-emerald-100 font-bold tracking-wider transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 overflow-hidden"
      >
        {session.user.image ? (
          <img src={session.user.image} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {/* 🟢 Le Menu Déroulant (Dropdown) */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 rounded-xl bg-slate-900 border border-emerald-500/20 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
          
          {/* En-tête avec les infos de l'oiseau */}
          <div className="px-4 py-2 border-b border-slate-800">
            <p className="text-sm font-medium text-emerald-400 truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {session.user.email}
            </p>
          </div>

          {/* Liens de navigation */}
          <div className="py-1">
            <Link 
              href="/dashboard/profile" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            >
              <User className="mr-2 h-4 w-4" />
              Profil de l'oiseau
            </Link>
            <Link 
              href="/dashboard/settings" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            >
              <Settings className="mr-2 h-4 w-4" />
              Réglages du nid
            </Link>
          </div>

          {/* Bouton de déconnexion */}
          <div className="border-t border-slate-800 py-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              S'envoler (Déconnexion)
            </button>
          </div>

        </div>
      )}
    </div>
  );
}