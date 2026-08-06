// apps/hub-central/components/onboarding/OnboardingWizard.tsx
'use client';

import React, { useState } from 'react';
import { Sparkles, Compass, ShoppingBag, Gamepad2, Activity, Lock, MessageSquare, Music, Type, Heart, Feather, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from '../../navigation';

interface AppFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  defaultEnabled: boolean;
}

const ECOSYSTEM_FEATURES: AppFeature[] = [
  { id: 'dashboard', title: 'Le Nid de Commandement', description: 'Gestion de vos chantiers, tâches atomiques (Pomodoro) et calendrier.', icon: Compass, color: 'text-red-400', defaultEnabled: true },
  { id: 'message', title: 'La Messagerie de la Canopée', description: 'Communications unifiées et échanges en direct avec les autres oiseaux.', icon: MessageSquare, color: 'text-indigo-400', defaultEnabled: true },
  { id: 'observatoire', title: 'L’Observatoire des Fréquences', description: 'Visualisation des ondes, santé collective et météo de la volière.', icon: Activity, color: 'text-cyan-400', defaultEnabled: true },
  { id: 'salon', title: 'Le Salon Privé (E2EE)', description: 'Espace chiffré de bout en bout pour déposer vos pensées en toute sécurité.', icon: Lock, color: 'text-emerald-400', defaultEnabled: true },
  { id: 'games', title: 'Le Nexus des Jeux', description: 'Démineurs artistiques, quiz cinématographiques et conquêtes spatiales.', icon: Gamepad2, color: 'text-purple-400', defaultEnabled: false },
  { id: 'marketplace', title: 'Le Grand Bazar (Marchand)', description: 'Boutiques de créateurs, troc direct d’actifs et catalogue d’artefacts.', icon: ShoppingBag, color: 'text-amber-400', defaultEnabled: false },
  { id: 'partita', title: 'La Partitionnerie', description: 'Atelier de création musicale et de partitions partagées.', icon: Music, color: 'text-rose-400', defaultEnabled: false },
  { id: 'letrinSprite', title: 'Letr’In & Sprites', description: 'Stockage de polices de caractères et matrices SVG personnalisées.', icon: Type, color: 'text-cyan-300', defaultEnabled: false },
  { id: 'kontakt', title: 'Kontakt-RH', description: 'Mise en relation par affinité, quêtes et alignement de compétences.', icon: Heart, color: 'text-amber-500', defaultEnabled: false },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<'manifesto' | 'questionnaire'>('manifesto');
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ECOSYSTEM_FEATURES.forEach(f => { initial[f.id] = f.defaultEnabled; });
    return initial;
  });

  const toggleApp = (id: string) => {
    setEnabledApps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const allOn: Record<string, boolean> = {};
    ECOSYSTEM_FEATURES.forEach(f => { allOn[f.id] = true; });
    setEnabledApps(allOn);
  };

  const handleCompleteOnboarding = () => {
    // 🪶 Stockage pur client (zéro BDD) - Version épurée et corrigée
    const hiddenApps = Object.keys(enabledApps).filter(key => !enabledApps[key]);
    
    localStorage.setItem('ilot_hidden_apps', JSON.stringify(hiddenApps));
    localStorage.setItem('ilot_onboarding_completed', 'true');

    // Redirection directe vers le Nid
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 backdrop-blur-2xl shadow-2xl relative z-10 animate-in fade-in duration-700">
        
        {step === 'manifesto' ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex items-center gap-3 text-rose-400">
              <Feather size={28} />
              <span className="text-xs font-mono font-bold uppercase tracking-widest">Rituel du Premier Envol</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                Manifeste de la Canopée Silencieuse
              </h1>
              <div className="space-y-4 text-sm text-slate-300 font-sans leading-relaxed border-l-2 border-rose-500/40 pl-6 italic my-6">
                <p>
                  "Dans un monde numérique qui exige tout, tout de suite, qui s'illumine de bleu agressif et consume l'attention des âmes, nous avons choisi de bâtir un refuge."
                </p>
                <p>
                  "L'Îlot Zoizos n'est pas une machine à productivité de plus. C'est un écosystème vivant où la technologie est au service de l'Oiseau. Ici, la sève circule à travers des réseaux respectueux, le temps s'écoule au rythme de la respiration, et le repos est une loi vitale."
                </p>
                <p className="not-italic font-bold text-white">
                  Que tu viennes pour bâtir, échanger ou simplement souffler : tu es ici chez toi et en sécurité.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setStep('questionnaire')}
                className="px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all flex items-center gap-2 group"
              >
                Commencer le calibrage <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={22} /> Ajustement de votre Navigation
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sélectionnez les brins qui composeront votre interface. Vous pourrez tout modifier plus tard.
                </p>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-widest bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-all"
              >
                ✨ Tout découvrir (Tout activer)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {ECOSYSTEM_FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isEnabled = enabledApps[feature.id];

                return (
                  <div
                    key={feature.id}
                    onClick={() => toggleApp(feature.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                      isEnabled 
                        ? 'bg-slate-800/60 border-slate-700 shadow-md' 
                        : 'bg-slate-950/40 border-slate-900 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${feature.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-white truncate">{feature.title}</h3>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${isEnabled ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-slate-900 border-slate-700'}`}>
                          {isEnabled && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => setStep('manifesto')}
                className="text-xs font-mono text-slate-500 hover:text-white uppercase"
              >
                &larr; Retour au Manifeste
              </button>

              <button
                onClick={handleCompleteOnboarding}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2"
              >
                Valider mon Îlot & S'envoler <Sparkles size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}