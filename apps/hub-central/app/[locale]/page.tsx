// apps/hub-central/app/[locale]/(app)/page.tsx
'use client';

// 🌟 LA SOUDURE : Utilisation du Link qui connaît les langues
import { Link } from "../../navigation"; 
import { 
  Users, Target, LogIn, ShoppingBag, Store, Pencil, 
  BookOpen, Layers, Type, Gamepad2, Settings, Shield,
  HeartPulse, LayoutDashboard, Compass
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-20 relative bg-[#05070A] overflow-x-hidden">
      
      {/* Noyau Magmatique de l'Îlot (Aura Bio-Tech) */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[#E5484D]/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[60%] left-[-10%] w-[600px] h-[600px] bg-blue-900/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-7xl space-y-24 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
        
        {/* En-tête : Minimalisme Brut */}
        <div className="space-y-8 text-center">
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


        {/* =========================================
            CLUSTER 1 : LE NEXUS DES JEUX
        ========================================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-black text-white tracking-tight">Le Nexus des Jeux</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Link href="/games" className="bio-card col-span-1 md:col-span-2 flex flex-col justify-end p-8 border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-transparent hover:border-purple-500/50 transition-all duration-500 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Entrer dans le Nexus</h3>
              <p className="text-slate-400 text-sm font-light">Le portail principal pour rejoindre ou créer des instances.</p>
            </Link>
            
            <Link href="/games/crazymorpion" className="bio-card p-6 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-500 rounded-2xl flex flex-col items-start justify-between">
              <span className="text-2xl mb-4">❌⭕</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-white">Crazy Morpion</h3>
                <p className="text-xs text-slate-500 mt-1">Stratégie & Jokers.</p>
              </div>
            </Link>

            <Link href="/games/kooontreez" className="bio-card p-6 border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-500 rounded-2xl flex flex-col items-start justify-between">
              <span className="text-2xl mb-4">🌍</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-white">KoÔonTreeZ</h3>
                <p className="text-xs text-slate-500 mt-1">Géo-Quiz & Conquête.</p>
              </div>
            </Link>
          </div>
        </div>


        {/* =========================================
            CLUSTER 2 : LE GRAND BAZAR
        ========================================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            <ShoppingBag className="w-8 h-8 text-yellow-500" />
            <h2 className="text-3xl font-black text-white tracking-tight">Terres d'Échanges</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/ecommerce" className="bio-card p-6 border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-500 rounded-2xl group">
              <Store className="w-8 h-8 text-slate-500 group-hover:text-yellow-500 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-2">E-Commerce</h3>
              <p className="text-sm text-slate-500 font-light">Boutiques, artéfacts et transactions.</p>
            </Link>

            <Link href="/marketplace" className="bio-card p-6 border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-500 rounded-2xl group">
              <Layers className="w-8 h-8 text-slate-500 group-hover:text-yellow-500 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-2">Marketplace</h3>
              <p className="text-sm text-slate-500 font-light">Le grand marché ouvert aux oiseaux.</p>
            </Link>

            <Link href="/ecommerce/editor" className="bio-card p-6 border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-500 rounded-2xl group">
              <Pencil className="w-8 h-8 text-slate-500 group-hover:text-yellow-500 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-2">Forge (Éditeur)</h3>
              <p className="text-sm text-slate-500 font-light">Créer et sculpter des artéfacts.</p>
            </Link>
          </div>
        </div>


        {/* =========================================
            CLUSTER 3 : SAVOIRS ET IDENTITÉS
        ========================================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            <BookOpen className="w-8 h-8 text-cyan-400" />
            <h2 className="text-3xl font-black text-white tracking-tight">Savoirs & Identités</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/abyss-blog" className="bio-card p-6 border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all duration-500 rounded-2xl group">
              <BookOpen className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Abyss Blog</h3>
              <p className="text-xs text-slate-500">Les chroniques des profondeurs.</p>
            </Link>

            <Link href="/letrinSprite" className="bio-card p-6 border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all duration-500 rounded-2xl group">
              <Type className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Letr'in Sprites</h3>
              <p className="text-xs text-slate-500">Forge de polices et matrices.</p>
            </Link>

            <Link href="/kontakt" className="bio-card p-6 border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all duration-500 rounded-2xl group">
              <Compass className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-4 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Kontakt</h3>
              <p className="text-xs text-slate-500">Réseau, profils et quêtes.</p>
            </Link>

            <Link href="/partita" className="bio-card p-6 border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all duration-500 rounded-2xl group">
              <span className="text-2xl mb-3 block">🎼</span>
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Partita</h3>
              <p className="text-xs text-slate-500">Partitions et harmonie.</p>
            </Link>
          </div>
        </div>


        {/* =========================================
            CLUSTER 4 : LE NOYAU (DASHBOARD)
        ========================================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-[#E5484D]/20 pb-4">
            <LayoutDashboard className="w-8 h-8 text-[#E5484D]" />
            <h2 className="text-3xl font-black text-white tracking-tight">Le Noyau (Dashboard)</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/dashboard" className="bio-card p-6 border border-white/5 hover:border-[#E5484D]/30 hover:bg-[#E5484D]/5 transition-all duration-500 rounded-2xl group">
              <LayoutDashboard className="w-6 h-6 text-slate-500 group-hover:text-[#E5484D] mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Vue d'ensemble</h3>
              <p className="text-xs text-slate-500 font-light">Contrôle global du système.</p>
            </Link>

            <Link href="/dashboard/teams" className="bio-card p-6 border border-white/5 hover:border-[#E5484D]/30 hover:bg-[#E5484D]/5 transition-all duration-500 rounded-2xl group">
              <Users className="w-6 h-6 text-slate-500 group-hover:text-[#E5484D] mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Escouades & Flock</h3>
              <p className="text-xs text-slate-500 font-light">Gestion des nids Neo4j.</p>
            </Link>

            <Link href="/tom-hat-toes" className="bio-card p-6 border border-white/5 hover:border-[#E5484D]/30 hover:bg-[#E5484D]/5 transition-all duration-500 rounded-2xl group">
              <Target className="w-6 h-6 text-slate-500 group-hover:text-[#E5484D] mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Tom-Hat-Toes</h3>
              <p className="text-xs text-slate-500 font-light">Gestion du temps et inceptions.</p>
            </Link>

            <Link href="/dashboard/moderation" className="bio-card p-6 border border-white/5 hover:border-[#E5484D]/30 hover:bg-[#E5484D]/5 transition-all duration-500 rounded-2xl group">
              <Shield className="w-6 h-6 text-slate-500 group-hover:text-[#E5484D] mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Modération</h3>
              <p className="text-xs text-slate-500 font-light">Sécurité et balance de l'Îlot.</p>
            </Link>

            <Link href="/dashboard/wellbeing" className="bio-card p-6 border border-white/5 hover:border-[#E5484D]/30 hover:bg-[#E5484D]/5 transition-all duration-500 rounded-2xl group">
              <HeartPulse className="w-6 h-6 text-slate-500 group-hover:text-[#E5484D] mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Wellbeing</h3>
              <p className="text-xs text-slate-500 font-light">Santé mentale de la volée.</p>
            </Link>

            <Link href="/settings" className="bio-card p-6 border border-white/5 hover:border-slate-400/30 hover:bg-white/5 transition-all duration-500 rounded-2xl group">
              <Settings className="w-6 h-6 text-slate-500 group-hover:text-white mb-3 transition-colors" />
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">Paramètres</h3>
              <p className="text-xs text-slate-500 font-light">Configuration de l'aura.</p>
            </Link>
          </div>
        </div>

        {/* =========================================
            SAS D'ENTRÉE (Auth)
        ========================================= */}
        <div className="flex justify-center pt-8">
          <Link href="/auth/login" className="flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300">
            <LogIn className="w-5 h-5 text-slate-300" />
            <span className="font-bold text-slate-200 tracking-wide">Le SAS d'Entrée (Identification)</span>
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