'use client';

// 🌟 LA SOUDURE : Utilisation du Link qui connaît les langues
import dynamic from 'next/dynamic';

import { Link } from "../../navigation"; 
import { Users, Target, LogIn } from "lucide-react";

const ContextualGraph = dynamic<{ 
  rootUid: string; 
  onNodeDoubleClick: (id: string) => void; 
}>(
  () => import('../../components/graph/ContextualGraph').then((mod) => mod.ContextualGraph),
  { 
    ssr: false, // 🛡️ Empêche l'erreur "window is not defined"
    loading: () => <div className="absolute inset-0 bg-transparent animate-pulse" /> 
  }
);



export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-[#05070A]">
      
      {/* Noyau Magmatique de l'Îlot (Aura Bio-Tech) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#E5484D]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-5xl space-y-20 text-center animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
        
{/* 🕸️ LE GRAPHE CONTEXTUEL : L'âme du système en fond de toile */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <ContextualGraph 
          rootUid="global" 
          onNodeDoubleClick={(id) => console.log(`Oiseau détecté dans le Nexus : ${id}`)} 
        />
      </div>

        {/* En-tête : Minimalisme Brut */}
        <div className="space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-[#E5484D]/20 shadow-[0_0_40px_rgba(229,72,77,0.1)] backdrop-blur-md">
            <span className="text-2xl opacity-80">🏮</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-100 via-slate-300 to-slate-600 tracking-tighter drop-shadow-sm">
            L'Îlot <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#E5484D] to-red-900">Zoizos</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed tracking-wide">
            L'écosystème où les oiseaux forgent des nids, tissent des liens et bâtissent des inceptions au cœur de la matrice.
          </p>
        </div>

        {/* Grille de Navigation (Les Cellules) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
          
          {/* Carte 1 : Les Escouades */}
          <Link href="/dashboard/teams" className="bio-card flex flex-col h-full group p-8 border border-white/5 hover:border-[#E5484D]/30 transition-all duration-500">
            <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-[#E5484D]/30 group-hover:bg-[#E5484D]/10 transition-colors duration-500">
              <Users className="w-6 h-6 text-slate-400 group-hover:text-[#E5484D] group-hover:scale-110 transition-all duration-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-[#E5484D] transition-colors duration-500">
              Forger une Escouade
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed flex-grow font-light">
              Rassemble tes Bâtisseurs. Crée un nid principal ou une sous-équipe et distribue les rôles dans le graphe Neo4j.
            </p>
          </Link>

          {/* Carte 2 : Tom-Hat-Toes (Connecté aux Inceptions) */}
          <Link href="/tom-hat-toes" className="bio-card flex flex-col h-full group p-8 border border-white/5 hover:border-[#E5484D]/30 transition-all duration-500">
             <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-[#E5484D]/30 group-hover:bg-[#E5484D]/10 transition-colors duration-500">
              <Target className="w-6 h-6 text-slate-400 group-hover:text-[#E5484D] group-hover:scale-110 transition-all duration-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-[#E5484D] transition-colors duration-500">
              Le Tom-Hat-Toes
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed flex-grow font-light">
              L'atelier de précision. Gère tes inceptions et ta concentration dans le flux de la matrice.
            </p>
          </Link>

          {/* Carte 3 : L'Identité / Auth */}
          <Link href="/auth/login" className="bio-card flex flex-col h-full group p-8 border border-white/5 hover:border-slate-400/30 transition-all duration-500">
            <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-slate-400/30 transition-colors duration-500">
              <LogIn className="w-6 h-6 text-slate-400 group-hover:text-slate-100 group-hover:rotate-12 transition-all duration-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-slate-100 transition-colors duration-500">
              Le SAS d'Entrée
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed flex-grow font-light">
              Identifie-toi ou rejoins la volée pour commencer à interagir avec le cœur du système.
            </p>
          </Link>

        </div>

        {/* Signature du Créateur */}
        <div className="pt-24 pb-8 flex items-center justify-center gap-4 text-slate-600 text-[10px] font-medium tracking-[0.4em] uppercase opacity-60">
          <span className="h-[1px] w-12 bg-white/10"></span>
          Le Bordel de DhÖ <span className="text-[#E5484D] font-black tracking-normal ml-1"> &gt;:)&gt;</span>
          <span className="h-[1px] w-12 bg-white/10"></span>
        </div>

      </div>
    </div>
  );
}