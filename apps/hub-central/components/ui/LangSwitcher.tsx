'use client';

import { useLocale } from 'next-intl';
// 🟢 On importe notre boussole magique
import { useRouter, usePathname } from '../../navigation'; 
import { Languages, Loader2 } from 'lucide-react'; 
import { useTransition } from 'react'; // 🌟 La soudure majeure : useTransition remplace useState+setTimeout

export const LangSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  // 🪄 Ici, pathname vaut "/dashboard" (la locale est masquée !)
  const pathname = usePathname(); 
  
  // 🚀 isPending devient vrai pendant que Next.js calcule et charge la nouvelle langue
  const [isPending, startTransition] = useTransition();

  const toggleLanguage = () => {
    const nextLocale = locale === 'fr' ? 'en' : 'fr';
    
    // 🚀 L'HYPER-SAUT : startTransition enveloppe la navigation.
    // next-intl va automatiquement et proprement écraser le cookie "NEXT_LOCALE" !
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    }); 
  };

  return (
    <button
      onClick={toggleLanguage}
      disabled={isPending}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 group backdrop-blur-md
        ${isPending 
          ? 'border-emerald-500/50 bg-emerald-900/30 scale-95 shadow-inner' 
          : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/80 hover:border-emerald-500/30'}
      `}
      title={locale === 'fr' ? 'Switch to English' : 'Passer en Français'} >
        
      {/* Icône qui tourne si on synchronise, sinon icône fixe */}
      {isPending ? (
        <Loader2 size={14} className="animate-spin text-emerald-500" />
      ) : (
        <Languages 
          size={14} 
          className="opacity-50 group-hover:opacity-100 group-hover:text-emerald-500 transition-colors" 
        />
      )}

      <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {locale}
      </span>
      
      {/* Indicateur visuel (drapeau) qui s'estompe pendant la transition */}
      <div className={`flex flex-col gap-0.5 ml-1 transition-all duration-500 ${isPending ? 'blur-sm opacity-0' : 'opacity-100'}`}>
        {locale === 'fr' ? (
           <div className="flex gap-0.5">
             <div className="w-1 h-2 bg-blue-500 rounded-sm" />
             <div className="w-1 h-2 bg-white rounded-sm" />
             <div className="w-1 h-2 bg-red-500 rounded-sm" />
           </div>
        ) : (
          <div className="flex flex-col gap-0.5">
             <div className="w-3 h-1 bg-red-500 rounded-sm" />
             <div className="w-3 h-1 bg-blue-800 rounded-sm" />
          </div>
        )}
      </div>
    </button>
  );
};