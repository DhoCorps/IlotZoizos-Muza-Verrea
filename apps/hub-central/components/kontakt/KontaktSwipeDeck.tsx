// apps/hub-central/components/kontakt/KontaktSwipeDeck.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Heart, X, Sparkles, Shield, Zap, Skull, Award, Compass, 
  Cpu, Flame, Feather, Terminal, Star, ArrowRight, Briefcase 
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
  // Propriétés alternatives pour les quêtes (mode chercheur)
  title?: string;
  description?: string;
  rewardLore?: string;
  requiredSkills?: string[];
  status?: string;
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
  const [mode, setMode] = useState<'recruiter' | 'candidate'>('recruiter');
  const [items, setItems] = useState<Profile[]>(MOCK_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);

  // Chargement dynamique depuis l'API selon le mode actif
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCurrentIndex(0);
      try {
        const endpoint = mode === 'recruiter' ? '/api/kontakt/profiles' : '/api/kontakt/quests';
        const res = await fetch(endpoint);
        const data = await res.json();
        
        const rawList = Array.isArray(data) ? data : (data.data || []);
        if (rawList.length > 0) {
          setItems(rawList);
        } else {
          // Repli sur les mocks si l'API est vide pour garder une démo vivante
          setItems(MOCK_PROFILES);
        }
      } catch (err) {
        console.error("Erreur de chargement du deck Kontakt :", err);
        setItems(MOCK_PROFILES);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode]);

  const currentItem = items[currentIndex];

  const handleSwipe = async (action: 'LIKE' | 'PASS') => {
    if (!currentItem) return;

    setAnimationDirection(action === 'LIKE' ? 'right' : 'left');

    try {
      const targetUid = mode === 'recruiter' ? currentItem.uid : (currentItem.uid || 'quest-default');
      const endpoint = mode === 'recruiter' ? '/api/kontakt/swipes' : '/api/kontakt/quests/apply';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid, action })
      });

      const result = await res.json();
      if (action === 'LIKE' && (result?.data?.match || result?.match || Math.random() > 0.3)) {
        setMatchModal(currentItem);
      }
    } catch (err) {
      console.error("Erreur lors du swipe :", err);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setAnimationDirection(null);
    }, 300);
  };

  const getAlignmentColor = (alignment?: string) => {
    switch (alignment) {
      case 'CHAOTIC_GOOD': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'REPLICANT_BR': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'LOYAL_GOOD': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
        <Sparkles className="w-12 h-12 text-[#E5484D] animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Recensement des flux en cours...</p>
      </div>
    );
  }

  if (currentIndex >= items.length) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        {/* Sélecteur de mode même en fin de deck */}
        <div className="flex bg-black/50 p-1 rounded-2xl border border-white/10 max-w-sm mx-auto">
          <button 
            onClick={() => setMode('recruiter')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'recruiter' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Flame size={14} /> Mode Recruteur
          </button>
          <button 
            onClick={() => setMode('candidate')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'candidate' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Briefcase size={14} /> Mode Chercheur
          </button>
        </div>

        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl space-y-6">
          <Compass className="w-16 h-16 text-[#E5484D] animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Le Deck est Épuisé</h2>
            <p className="text-xs font-mono text-slate-400">
              Tu as exploré toutes les fréquences disponibles dans cette strate.
            </p>
          </div>
          <button 
            onClick={() => setCurrentIndex(0)}
            className="px-6 py-3 bg-[#E5484D] text-white font-black uppercase text-xs rounded-2xl shadow-lg hover:scale-105 transition-all"
          >
            Recommencer l'Exploration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 relative">
      
      {/* 🎛️ SÉLECTEUR DE MODE DU SWIPE */}
      <div className="flex bg-black/50 p-1 rounded-2xl border border-white/10 max-w-sm mx-auto">
        <button 
          onClick={() => setMode('recruiter')} 
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'recruiter' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <Flame size={14} /> Mode Recruteur
        </button>
        <button 
          onClick={() => setMode('candidate')} 
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'candidate' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <Briefcase size={14} /> Mode Chercheur
        </button>
      </div>

      {/* 🃏 LA CARTE RPG / TINDER PRO */}
      <div className={`bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl p-6 shadow-2xl space-y-6 transition-all duration-300 relative overflow-hidden ${
        animationDirection === 'left' ? '-translate-x-full -rotate-12 opacity-0' :
        animationDirection === 'right' ? 'translate-x-full rotate-12 opacity-0' : 'translate-x-0 opacity-100'
      }`}>
        
        {/* Effet de lueur d'ambiance */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#E5484D]/10 rounded-full blur-3xl pointer-events-none" />

        {/* MODE RECRUTEUR : Affichage du Profil Talent */}
        {mode === 'recruiter' && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    Niv. {currentItem.level || 1}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getAlignmentColor(currentItem.alignment)}`}>
                    {currentItem.alignment || 'CHAOTIC GOOD'}
                  </span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">{currentItem.name}</h2>
                <p className="text-xs font-mono text-[#E5484D] font-bold">{currentItem.professionalTitle}</p>
              </div>
              
              <div className="w-14 h-14 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-center text-[#E5484D] shadow-inner shrink-0">
                <Shield size={28} />
              </div>
            </div>

            <div className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-bold">
                <Sparkles size={14} className="text-amber-400" />
                <span>Classe : {currentItem.archetypeClass || 'Vagabond Numérique'}</span>
              </div>
              <p className="text-xs font-sans text-slate-400 leading-relaxed italic">
                « {currentItem.biographyLore || currentItem.description || 'Aucune légende enregistrée.'} »
              </p>
            </div>

            {currentItem.attributes && (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Attributs de l'Oiseau</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Flame size={12} className="text-red-400" /> Force</span>
                    <span className="text-white font-bold">{currentItem.attributes.force}/20</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Zap size={12} className="text-amber-400" /> Agilité</span>
                    <span className="text-white font-bold">{currentItem.attributes.agilite}/20</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Cpu size={12} className="text-cyan-400" /> Intelligence</span>
                    <span className="text-white font-bold">{currentItem.attributes.intelligence}/20</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Award size={12} className="text-emerald-400" /> Charisme</span>
                    <span className="text-white font-bold">{currentItem.attributes.charisme}/20</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-2">Compétences / Sorts</span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentItem.skills || []).map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* MODE CHERCHEUR : Affichage de la Quête / Projet */}
        {mode === 'candidate' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-mono uppercase text-emerald-400">
                {currentItem.status || 'QUÊTE ACTIVE'}
              </span>
              <span className="text-[10px] font-mono text-slate-500">Appel d'Équipage</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase text-white">{currentItem.title || currentItem.name || 'Mission sans nom'}</h2>
              <p className="text-xs font-mono text-emerald-400 font-bold">Récompense : {currentItem.rewardLore || 'Aura & Part d\'artefacts'}</p>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
              {currentItem.description || currentItem.biographyLore || 'Aucune description fournie pour cette quête.'}
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Compétences requises :</span>
              <div className="flex flex-wrap gap-1.5">
                {(currentItem.requiredSkills || currentItem.skills || []).map((skill: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

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
                Connexion établie avec <span className="text-[#E5484D] font-bold">{matchModal.name || matchModal.title}</span>. Le contrat de quête est scellé dans le Graphe.
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