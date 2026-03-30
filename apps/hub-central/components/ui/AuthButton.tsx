'use client';

import { signIn, signOut, useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useRouter } from "../../navigation"; // 🟢 Ta boussole
import { LogIn, LogOut, Loader2, ShieldCheck, User } from "lucide-react";

export const AuthButton = () => {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'fr';

  // 🚀 PROTOCOLE D'ÉJECTION SÉCURISÉ
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login'); // Redirection fluide vers la locale actuelle
  };

  // 🛰️ ÉTAT : SYNCHRONISATION EN COURS
  if (status === "loading") {
    return (
      <div className="flex items-center space-x-3 px-4 py-2 rounded-full bg-slate-900/40 border border-slate-800 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
        <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Nexus Sync...</span>
      </div>
    );
  }

  // 👤 ÉTAT : ENTITÉ IDENTIFIÉE
  if (status === "authenticated" && session) {
    return (
      <div className="flex items-center gap-4 group">
        <div className="hidden md:block text-right">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Signature Validée</p>
          <p className="text-xs font-bold text-slate-200">{session.user?.name || "Oiseau Anonyme"}</p>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="relative h-10 w-10 rounded-xl border border-red-900/30 flex items-center justify-center hover:border-red-500/60 transition-all bg-red-950/10 group/btn overflow-hidden shadow-lg shadow-red-900/5"
          title="Rompre la liaison Nexus"
        >
          {/* Avatar ou Initiale */}
          <div className="absolute inset-0 flex items-center justify-center group-hover/btn:opacity-0 transition-opacity duration-300">
             {session.user?.image ? (
               <img src={session.user.image} alt="U" className="w-full h-full object-cover opacity-60" />
             ) : (
               <User className="w-4 h-4 text-red-500/70" />
             )}
          </div>
          
          {/* Icône de sortie au survol */}
          <LogOut className="w-4 h-4 text-red-500 translate-y-8 group-hover/btn:translate-y-0 transition-transform duration-300" />
          
          {/* Effet de lueur rouge */}
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
        </button>
      </div>
    );
  }

  // 🚪 ÉTAT : ACCÈS RESTREINT (LOGIN)
  return (
    <button
      onClick={() => router.push('/auth/login')}
      className="group relative flex items-center gap-3 px-6 py-2.5 rounded-xl border border-slate-800 bg-[#0A0C10] hover:bg-slate-900 hover:border-red-500/50 transition-all duration-500 overflow-hidden shadow-2xl"
    >
      {/* Rayon de balayage subtil */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-red-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <LogIn className="w-4 h-4 text-slate-500 group-hover:text-red-500 transition-colors" />
      
      <span className="relative text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-slate-100 transition-colors">
        S'identifier au <span className="text-slate-600 group-hover:text-red-600 transition-colors">Nexus</span>
      </span>

      {/* Point d'état hors-ligne */}
      <div className="w-1.5 h-1.5 rounded-full bg-red-900 group-hover:bg-red-500 group-hover:shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all" />
    </button>
  );
};