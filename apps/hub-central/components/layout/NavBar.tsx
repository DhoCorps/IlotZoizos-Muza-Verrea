'use client';

// 🛑 On n'utilise plus les outils natifs de Next.js
// import Link from 'next/link';
// import { usePathname, useParams } from 'next/navigation'; 

// 🟢 On importe les outils générés par next-intl
import { Link, usePathname } from '../../navigation'; 
import { 
  TreePine, 
  Home, 
  Users, 
  LayoutGrid, 
  Activity, 
  ShieldAlert, 
  Settings, 
  LogOut,
  Target,
  Network
} from 'lucide-react';

import { signOut } from "next-auth/react";

export default function NavBar() {
  const pathname = usePathname();

  // 🪄 Injection dynamique et invisible
const navItems = [
  { name: 'Gare Centrale', icon: Home, href: '/dashboard' },
  { name: 'Observatoire (Nids)', icon: Network, href: '/dashboard/teams' }, 
  { name: 'La Volée', icon: Users, href: '/dashboard/flock' },
  { name: 'Mes Fragments', icon: LayoutGrid, href: '/dashboard/projects' },
  { name: 'Tom-Hat-Toes', icon: Target, href: '/dashboard/tasks' }, 
  { name: 'Santé', icon: Activity, href: '/dashboard/wellbeing' },
  { name: 'Modération', icon: ShieldAlert, href: '/dashboard/moderation' },
];

  return (
    <nav className="fixed left-0 top-0 h-screen w-24 hover:w-64 group bg-emerald-950/40 border-r border-white/[0.05] backdrop-blur-2xl transition-all duration-500 z-50 flex flex-col items-center py-8 shadow-[10px_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
      
      {/* Logo de l'Îlot */}
      <div className="flex items-center justify-center w-full mb-12">
        <div className="p-3 rounded-full bg-gradient-to-br from-emerald-800/80 to-teal-900/80 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <TreePine className="w-8 h-8 text-emerald-400" />
        </div>
        <span className="absolute left-20 opacity-0 group-hover:opacity-100 group-hover:relative group-hover:left-0 ml-4 text-emerald-50 font-light tracking-widest whitespace-nowrap transition-all duration-300">
          L'ÎLOT
        </span>
      </div>

      {/* Liens de navigation */}
      <div className="flex flex-col gap-4 w-full px-4 flex-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center p-3 rounded-2xl transition-all duration-300 overflow-hidden ${
                isActive 
                  ? 'bg-emerald-500/20 border border-emerald-500/30 shadow-inner' 
                  : 'hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              )}
              
              <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-emerald-300' : 'text-emerald-500/60'}`} />
              
              <span className={`absolute left-14 opacity-0 group-hover:opacity-100 group-hover:relative group-hover:left-0 ml-4 whitespace-nowrap text-sm tracking-wide transition-all duration-300 ${isActive ? 'text-emerald-100 font-bold' : 'text-emerald-200/70 font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Boutons du bas */}
      <div className="flex flex-col gap-4 w-full px-4 mt-auto">
        <Link href="/dashboard/settings" className="relative flex items-center p-3 rounded-2xl hover:bg-white/[0.05] border border-transparent transition-all duration-300">
          <Settings className="w-6 h-6 shrink-0 text-zinc-500/60" />
          <span className="absolute left-14 opacity-0 group-hover:opacity-100 group-hover:relative group-hover:left-0 ml-4 text-sm font-medium text-zinc-300/70 whitespace-nowrap transition-all duration-300">Réglages</span>
        </Link>
        
        {/* 🌟 LA SOUDURE : Ajout de l'onClick d'éjection */}
        <button 
          onClick={() => signOut({ callbackUrl: '/' })} 
          className="relative flex items-center p-3 rounded-2xl hover:bg-red-500/10 border border-transparent transition-all duration-300 w-full text-left"
        >
          <LogOut className="w-6 h-6 shrink-0 text-red-500/60" />
          <span className="absolute left-14 opacity-0 group-hover:opacity-100 group-hover:relative group-hover:left-0 ml-4 text-sm font-medium text-red-400/80 whitespace-nowrap transition-all duration-300">S'envoler (Quitter)</span>
        </button>
      </div>
    </nav>
  );
}