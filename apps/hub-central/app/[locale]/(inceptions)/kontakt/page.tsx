// apps/hub-central/app/[locale]/(inceptions)/kontakt/page.tsx
'use client';

import { useState } from 'react';
import { Sparkles, Compass, Flame, Shield, Briefcase, Plus, User, Terminal } from 'lucide-react';
import { useKontakt } from './useKontakt';
import KontaktSwipeDeck from '../../../../components/kontakt/KontaktSwipeDeck';

// 🕸️ Le Tisseur est importé et sera passé aux cartes enfants (ex: KontaktSwipeDeck) 
// ou utilisé directement quand on affichera le profil d'un autre oiseau.
import ResonanceButton from '../../../../components/resonance/ResonanceButton'; 

export default function KontaktDashboard() {
  const { quests, activeTab, setActiveTab, refreshKontakt } = useKontakt();
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kontakt/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectUid: 'project-default',
          title: newQuestTitle,
          description: newQuestDesc,
          requiredSkills: ['Next.js', 'TypeScript', 'Magie'],
          rewardLore: 'Part d\'artefacts et aura lumineuse'
        })
      });
      if (res.ok) {
        setIsQuestModalOpen(false);
        setNewQuestTitle('');
        setNewQuestDesc('');
        refreshKontakt();
      }
    } catch (err) {
      console.error("Erreur lors de la publication de la quête :", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE KONTAKT-RH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Kontakt-RH & Quêtes
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Le Tinder des Équipages
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Croise les profils professionnels et les fiches de personnages JDR. Swipe, matche et recrute tes compagnons d'armes pour vos prochaines quêtes dans la matrice.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button 
            onClick={() => setIsQuestModalOpen(true)}
            className="px-5 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Poster une Quête
          </button>

          {/* 🕸️ Intégration temporaire de test (Masqué en prod pour ne pas s'abonner à soi-même) */}
          <div className="hidden">
             <ResonanceButton targetSlug="system_demo_target" type="FOLLOWS_GLOBAL" />
          </div>

        </div>
      </div>

      {/* 🎛️ BARRE DE NAVIGATION DES ONGLETS */}
      <div className="flex items-center justify-center gap-3 bg-black/30 p-2 border border-white/5 rounded-2xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab('swipe')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'swipe' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame size={16} /> Deck de Swipe
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quests' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Briefcase size={16} /> Tableau des Quêtes ({quests.length})
        </button>

        <button
          onClick={() => setActiveTab('my-profile')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my-profile' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <User size={16} /> Fiche de Personnage
        </button>
      </div>

      {/* 🃏 CONTENU DE L'ONGLET : SWIPE DECK */}
      {activeTab === 'swipe' && (
        <div className="animate-in fade-in duration-300">
          <KontaktSwipeDeck />
        </div>
      )}

      {/* 📜 CONTENU DE L'ONGLET : TABLEAU DES QUÊTES */}
      {activeTab === 'quests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {quests.map((quest: any) => (
            <div key={quest.uid} className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {quest.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Quête Publique</span>
                </div>
                <h3 className="text-lg font-black uppercase text-white">{quest.title}</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">{quest.description}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {quest.requiredSkills?.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-mono text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
                {quest.rewardLore && (
                  <p className="text-[10px] font-mono text-amber-400">Récompense : {quest.rewardLore}</p>
                )}
              </div>
            </div>
          ))}

          {quests.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucune quête de recrutement active dans le royaume.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🛡️ CONTENU DE L'ONGLET : FICHE DE PERSONNAGE */}
      {activeTab === 'my-profile' && (
        <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6 animate-in fade-in duration-300 relative">
          
          <div className="flex items-start justify-between border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-center text-[#E5484D]">
                <Shield size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-white">Parchemin de l'Oiseau</h2>
                <p className="text-xs font-mono text-slate-400">Édite tes attributs JDR et ton profil professionnel unifié.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Intitulé Professionnel & Classe</label>
              <input type="text" defaultValue="Mage Fullstack & Sceaux Neo4j" className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Alignement Moral (D&D / BR)</label>
              <select className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]">
                <option value="CHAOTIC_GOOD">CHAOTIC GOOD (Rebelle Lumineux)</option>
                <option value="REPLICANT_BR">REPLICANT BR (Blade Runner Nexus)</option>
                <option value="LOYAL_GOOD">LOYAL GOOD (Paladin de l'Infra)</option>
                <option value="TRUE_NEUTRAL">TRUE NEUTRAL (Vagabond Silencieux)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="px-6 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all">
              Sédimenter les Modifications
            </button>
          </div>
        </div>
      )}

      {/* 🪟 MODALE DE CRÉATION DE QUÊTE */}
      {isQuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0A0D14] border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal size={16} className="text-[#E5484D]" /> Publier un Appel à Candidatures
              </h2>
              <button onClick={() => setIsQuestModalOpen(false)} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
            </div>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Titre de la Quête</label>
                <input 
                  type="text" 
                  value={newQuestTitle} 
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                  placeholder="ex: Recherche Paladin Fullstack pour sceller Neo4j" 
                  required
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Description du Défi</label>
                <textarea 
                  value={newQuestDesc} 
                  onChange={(e) => setNewQuestDesc(e.target.value)}
                  placeholder="Détaille la mission, l'environnement technique et le lore..." 
                  rows={4}
                  required
                  className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
                />
              </div>

              <button type="submit" className="w-full py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all">
                Inscrire la Quête dans la Matrice
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}