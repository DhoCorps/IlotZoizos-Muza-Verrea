// apps/hub-central/components/kontakt/KontaktSwipeDeck.tsx
'use client';

import { useState } from 'react';
import { 
  Heart, X, Sparkles, Shield, Zap, Skull, Award, Compass, 
  Cpu, Flame, Feather, Terminal, Star, ArrowRight 
} from 'lucide-react';

interface Profile {
  uid: string;
  name: string;
  professionalTitle: string;
  archetypeClass: string;
  alignment: string;
  level: number;
  seniorityYears: number;
  skills: string[];
  specialArtifacts: string[];
  attributes: {
    force: number;
    agilite: number;
    intelligence: number;
    charisme: number;
    empathieVoightKampff: number;
  };
  biographyLore: string;
  availabilityStatus: 'OPEN_TO_WORK' | 'ON_A_QUEST' | 'RECRUITED';
  avatarUrl?: string;
}

const MOCK_PROFILES: Profile[] = [
  {
    uid: 'kontakt-001',
    name: 'Vaelen de l’Ombre',
    professionalTitle: 'Mage Fullstack & Sceaux Neo4j',
    archetypeClass: 'Nécromancien de Silice',
    alignment: 'CHAOTIC_GOOD',
    level: 12,
    seniorityYears: 7,
    skills: ['Next.js', 'Neo4j', 'TypeScript', 'MongoDB', 'Magie Noire des API'],
    specialArtifacts: ['Clavier mécanique de l’Abysse', 'Capuche anti-bug'],
    attributes: { force: 8, agilite: 16, intelligence: 19, charisme: 14, empathieVoightKampff: 72 },
    biographyLore: 'Ancien vagabond du code, capable de ressusciter des branches Git corrompues un soir de pleine lune.',
    availabilityStatus: 'OPEN_TO_WORK',
  },
  {
    uid: 'kontakt-002',
    name: 'Kaelen-7',
    professionalTitle: 'Enquêteur & Chasseur de Fuites Mémoire',
    archetypeClass: 'Réplicant Nexus-8',
    alignment: 'REPLICANT_BR',
    level: 15,
    seniorityYears: 9,
    skills: ['Rust', 'C++', 'Optimisation RAM', 'Tests Voight-Kampff'],
    specialArtifacts: ['Implant optique R2', 'Trench-coat imperméable aux erreurs 500'],
    attributes: { force: 18, agilite: 17, intelligence: 15, charisme: 10, empathieVoightKampff: 45 },
    biographyLore: 'Traque les fuites de mémoire dans les recoins sombres de la matrice. Ne dort jamais, recharge ses batteries.',
    availabilityStatus: 'OPEN_TO_WORK',
  },
  {
    uid: 'kontakt-003',
    name: 'Morgane la Paladine',
    professionalTitle: 'Architecte DevOps & Rempart des CI/CD',
    archetypeClass: 'Paladine de l’Infra',
    alignment: 'LOYAL_GOOD',
    level: 10,
    seniorityYears: 6,
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Bouclier anti-DDoS'],
    specialArtifacts: ['Épée lumineuse "Zero Downtime"', 'Heaume de supervision'],
    attributes: { force: 16, agilite: 14, intelligence: 16, charisme: 17, empathieVoightKampff: 95 },
    biographyLore: 'Jure de protéger chaque serveur contre les forces du Chaos et les attaques de bots malveillants.',
    availabilityStatus: 'ON_A_QUEST',
  }
];

export default function KontaktSwipeDeck() {
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);

  const currentProfile = profiles[currentIndex];

  const handleSwipe = async (action: 'LIKE' | 'PASS') => {
    if (!currentProfile) return;

    setAnimationDirection(action === 'LIKE' ? 'right' : 'left');

    // Appel API simulé ou réel vers /api/kontakt/swipes
    try {
      await fetch('/api/kontakt/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: currentProfile.uid, action })
      });

      if (action === 'LIKE' && Math.random() > 0.3) { // 70% de chance de match pour le fun du prototype
        setMatchModal(currentProfile);
      }
    } catch (err) {
      console.error("Erreur lors du swipe :", err);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setAnimationDirection(null);
    }, 300);
  };

  const getAlignmentColor = (alignment: string) => {
    switch (alignment) {
      case 'CHAOTIC_GOOD': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'REPLICANT_BR': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'LOYAL_GOOD': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  if (currentIndex >= profiles.length) {
    return (
      <div className="max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl space-y-6">
        <Compass className="w-16 h-16 text-[#E5484D] animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Le Deck est Épuisé</h2>
          <p className="text-xs font-mono text-slate-400">
            Tu as exploré toutes les fréquences disponibles dans la matrice. Reviens plus tard pour de nouvelles recrues.
          </p>
        </div>
        <button 
          onClick={() => setCurrentIndex(0)}
          className="px-6 py-3 bg-[#E5484D] text-white font-black uppercase text-xs rounded-2xl shadow-lg hover:scale-105 transition-all"
        >
          Recommencer la Quête
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 relative">
      
      {/* 🃏 LA CARTE RPG / TINDER PRO */}
      <div className={`bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl p-6 shadow-2xl space-y-6 transition-all duration-300 relative overflow-hidden ${
        animationDirection === 'left' ? '-translate-x-full -rotate-12 opacity-0' :
        animationDirection === 'right' ? 'translate-x-full rotate-12 opacity-0' : 'translate-x-0 opacity-100'
      }`}>
        
        {/* Effet de lueur d'ambiance */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#E5484D]/10 rounded-full blur-3xl pointer-events-none" />

        {/* En-tête : Nom, Titre & Niveau */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                Niv. {currentProfile.level}
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getAlignmentColor(currentProfile.alignment)}`}>
                {currentProfile.alignment}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">{currentProfile.name}</h2>
            <p className="text-xs font-mono text-[#E5484D] font-bold">{currentProfile.professionalTitle}</p>
          </div>
          
          <div className="w-14 h-14 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-center text-[#E5484D] shadow-inner shrink-0">
            <Shield size={28} />
          </div>
        </div>

        {/* Classe & Lore */}
        <div className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-bold">
            <Sparkles size={14} className="text-amber-400" />
            <span>Classe : {currentProfile.archetypeClass}</span>
          </div>
          <p className="text-xs font-sans text-slate-400 leading-relaxed italic">
            « {currentProfile.biographyLore} »
          </p>
        </div>

        {/* 📊 LA MATRICE DES STATS (RPG Attributes) */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Attributs de l'Oiseau</span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><Flame size={12} className="text-red-400" /> Force</span>
              <span className="text-white font-bold">{currentProfile.attributes.force}/20</span>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><Zap size={12} className="text-amber-400" /> Agilité</span>
              <span className="text-white font-bold">{currentProfile.attributes.agilite}/20</span>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><Cpu size={12} className="text-cyan-400" /> Intelligence</span>
              <span className="text-white font-bold">{currentProfile.attributes.intelligence}/20</span>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><Award size={12} className="text-emerald-400" /> Charisme</span>
              <span className="text-white font-bold">{currentProfile.attributes.charisme}/20</span>
            </div>
          </div>

          {/* Jauge Empathie Blade Runner */}
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Test Voight-Kampff (Empathie)</span>
              <span className="text-cyan-400 font-bold">{currentProfile.attributes.empathieVoightKampff}% Humain</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" 
                style={{ width: `${currentProfile.attributes.empathieVoightKampff}%` }}
              />
            </div>
          </div>
        </div>

        {/* 🛠️ COMPÉTENCES & ARTEFACTS */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-2">Compétences / Sorts</span>
            <div className="flex flex-wrap gap-1.5">
              {currentProfile.skills.map((skill, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-2">Artefacts Légendaires</span>
            <div className="flex flex-wrap gap-1.5">
              {currentProfile.specialArtifacts.map((art, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-lg text-[10px] font-mono text-[#E5484D]">
                  ✨ {art}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 🎮 BOUTONS DE CONTRÔLE (SWIPE) */}
      <div className="flex items-center justify-center gap-6">
        <button 
          onClick={() => handleSwipe('PASS')}
          className="w-16 h-16 rounded-full bg-black/60 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:scale-110 transition-all flex items-center justify-center shadow-lg group"
          title="Rejeter (Pass)"
        >
          <X size={28} className="group-hover:rotate-90 transition-transform" />
        </button>

        <button 
          onClick={() => handleSwipe('LIKE')}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E5484D] to-amber-500 text-white hover:scale-110 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(229,72,77,0.5)] group"
          title="Résonner (Like)"
        >
          <Heart size={34} className="fill-current group-hover:scale-125 transition-transform" />
        </button>
      </div>

      {/* 💘 MODALE DE MATCH (RÉSONANCE TOTALE) */}
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0A0D14] border border-[#E5484D]/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(229,72,77,0.3)] text-center space-y-6 relative">
            
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#E5484D] to-amber-500 flex items-center justify-center text-white shadow-xl animate-bounce">
              <Sparkles size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Résonance Totale !</h3>
              <p className="text-xs font-mono text-slate-300">
                Vous et <span className="text-[#E5484D] font-bold">{matchModal.name}</span> vibrez sur la même fréquence. Le contrat de quête est scellé dans le Graphe.
              </p>
            </div>

            <button 
              onClick={() => setMatchModal(null)}
              className="w-full py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Ouvrir le Canal Sécurisé <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}