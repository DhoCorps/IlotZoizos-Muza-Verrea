// apps/hub-central/app/[locale]/(inceptions)/kontakt/page.tsx
'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  Flame,
  Shield,
  Briefcase,
  Plus,
  User,
  Terminal,
  Loader2,
  AlertCircle,
  Users,
  Award,
  FileEdit,
  Building2,
  MapPin,
  Skull,
  Send
} from 'lucide-react';
import Link from 'next/link';
import { useKontakt } from './useKontakt';
import KontaktSwipeDeck, { Profile } from '@/components/kontakt/KontaktSwipeDeck';
import KontaktProfileFormModal, { KontaktProfileFormData } from '@/components/kontakt/KontaktProfileFormModal';
import JobQuestFormModal from '@/components/kontakt/JobQuestFormModal';
import KontaktSocialActionsModal, { SocialActionTab } from '@/components/kontakt/KontaktSocialActionsModal';
import ResonanceButton from '@/components/resonance/ResonanceButton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function KontaktDashboard() {
  const queryClient = useQueryClient();
  const {
    profiles,
    quests,
    loading,
    error,
    activeTab,
    setActiveTab,
    refreshKontakt
  } = useKontakt();

  // États pour la création de quête (Rapide & Modale complète SSOT)
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isAdvancedQuestModalOpen, setIsAdvancedQuestModalOpen] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');

  // États pour la Fiche de Personnage (Formulaire rapide + Modale complète SSOT)
  const [myProfessionalTitle, setMyProfessionalTitle] = useState('Mage Fullstack & Sceaux Neo4j');
  const [myArchetypeClass, setMyArchetypeClass] = useState('Mage de Silice');
  const [myAlignment, setMyAlignment] = useState('CHAOTIC_GOOD');
  const [mySkillsInput, setMySkillsInput] = useState('Next.js, TypeScript, Neo4j, MongoDB');
  const [myBiographyLore, setMyBiographyLore] = useState(
    'Ancien vagabond du code, capable de plier la Silice à volonté.'
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState<Partial<KontaktProfileFormData> | null>(null);

  // États pour les interactions sociales (Endorse, Vouch, Review, Passerelle)
  const [socialTarget, setSocialTarget] = useState<{
    uid: string;
    name: string;
    tab: SocialActionTab;
  } | null>(null);

  // 🚀 SUTURE REACT QUERY : Mutation pour la publication rapide d'une quête
  const createQuestMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/kontakt/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Échec de la publication de la quête");
      return res.json();
    },
    onSuccess: () => {
      setIsQuestModalOpen(false);
      setNewQuestTitle('');
      setNewQuestDesc('');

      queryClient.invalidateQueries({ queryKey: ['kontakt-quests'] });
      refreshKontakt();

      toast.success("Quête inscrite avec succès dans la matrice !");
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la publication de la quête :", err);
      toast.error(`Erreur : ${err.message}`);
    }
  });

  // 🚀 SUTURE REACT QUERY : Mutation pour postuler directement depuis le Tableau des Quêtes
  const applyQuestMutation = useMutation({
    mutationFn: async ({ targetUid, coverMessage }: { targetUid: string; coverMessage?: string }) => {
      const res = await fetch('/api/kontakt/quests/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid, coverMessage: coverMessage || '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la candidature");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Candidature transmise avec succès !");
      refreshKontakt();
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    }
  });

  // 🚀 SUTURE REACT QUERY : Mutation pour sédimenter son profil Kontakt depuis l'onglet Fiche de Personnage
  const saveProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/kontakt/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la sédimentation du profil");
      return data;
    },
    onSuccess: (result) => {
      if (result?.data) {
        setEditingProfileData(result.data);
      }
      queryClient.invalidateQueries({ queryKey: ['kontakt-profiles'] });
      refreshKontakt();
      toast.success("Profil Kontakt sédimenté avec succès dans la Silice !");
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    }
  });

  const handleCreateQuest = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestMutation.mutate({
      projectUid: 'project-default',
      title: newQuestTitle,
      description: newQuestDesc,
      requiredSkills: ['Next.js', 'TypeScript', 'Magie'],
      rewardLore: "Part d'artefacts et aura lumineuse"
    });
  };

  const handleQuickSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileMutation.mutate({
      professionalTitle: myProfessionalTitle.trim() || 'Mage Fullstack',
      archetypeClass: myArchetypeClass.trim() || 'Mage de Silice',
      alignment: myAlignment,
      skills: mySkillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      biographyLore: myBiographyLore.trim()
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🏛️ EN-TÊTE KONTAKT-RH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Kontakt-RH &amp; Quêtes
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Le Tinder des Équipages
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Croise les profils professionnels et les fiches de personnages JDR. Swipe, matche et recrute tes compagnons d&apos;armes pour vos prochaines quêtes dans la matrice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            href="/kontakt/cv-editor"
            className="px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2"
          >
            <FileEdit size={16} /> Forge de CV
          </Link>

          <button 
            onClick={() => setIsQuestModalOpen(true)}
            className="px-5 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Poster une Quête
          </button>
        </div>
      </div>

      {/* 🧭 BARRE DE NAVIGATION DES ONGLETS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/30 p-2 border border-white/5 rounded-2xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab('swipe')}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'swipe' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame size={16} /> Deck de Swipe
        </button>
        <button
          onClick={() => setActiveTab('quests')}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quests' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Briefcase size={16} /> Tableau des Quêtes ({quests?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'profiles' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={16} /> Annuaire ({profiles?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('my-profile')}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my-profile' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <User size={16} /> Fiche de Personnage
        </button>
      </div>

      {/* ⏳ GESTION DES ÉTATS DE CHARGEMENT ET D'ERREUR GLOBAUX */}
      {loading && (
        <div className="p-16 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl backdrop-blur-xl">
          <Loader2 className="w-10 h-10 mx-auto text-[#E5484D] animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Recensement des flux synaptiques en cours...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
          <p className="text-xs font-mono text-red-400">Impossible de synchroniser les données de la Silice : {error}</p>
          <button onClick={() => refreshKontakt()} className="px-4 py-2 bg-white/5 text-xs text-white rounded-xl hover:bg-white/10 transition-all font-mono">
            Réessayer la Connexion
          </button>
        </div>
      )}

      {/* 🃏 CONTENU DE L'ONGLET : SWIPE DECK */}
      {!loading && !error && activeTab === 'swipe' && (
        <div className="animate-in fade-in duration-300">
          <KontaktSwipeDeck />
        </div>
      )}

      {/* 📜 CONTENU DE L'ONGLET : TABLEAU DES QUÊTES */}
      {!loading && !error && activeTab === 'quests' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsAdvancedQuestModalOpen(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-2"
            >
              <Sparkles size={14} className="text-amber-400" /> Configuration Avancée de Quête (SSOT)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quests?.map((quest: Profile) => {
              const questSkills =
                quest.requiredSkills && quest.requiredSkills.length > 0
                  ? quest.requiredSkills
                  : quest.requirements || [];

              return (
                <div
                  key={quest.uid}
                  className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {quest.status || 'ACTIVE'}
                        </span>
                        {quest.questDifficulty && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                            {quest.questDifficulty}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {quest.rewardXp !== undefined ? `+${quest.rewardXp} XP` : 'Quête Publique'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black uppercase text-white">{quest.title}</h3>

                    {quest.company?.name && (
                      <p className="text-xs font-mono text-[#E5484D] flex items-center gap-1.5">
                        <Building2 size={12} /> {quest.company.name}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                      {quest.workArrangement && (
                        <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                          {quest.workArrangement}
                        </span>
                      )}
                      {quest.contractType && (
                        <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                          {quest.contractType}
                        </span>
                      )}
                      {quest.experienceLevel && (
                        <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                          {quest.experienceLevel}
                        </span>
                      )}
                      {quest.location && (
                        <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10 flex items-center gap-1">
                          <MapPin size={10} /> {quest.location}
                        </span>
                      )}
                      {quest.dangerLevel !== undefined && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 flex items-center gap-1">
                          <Skull size={10} /> {quest.dangerLevel}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{quest.description}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {questSkills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-mono text-slate-300">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {quest.rewardLore ? (
                        <p className="text-[10px] font-mono text-amber-400">Récompense : {quest.rewardLore}</p>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        disabled={applyQuestMutation.isPending}
                        onClick={() => applyQuestMutation.mutate({ targetUid: quest.uid })}
                        className="px-3.5 py-2 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Send size={11} /> Postuler
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!quests || quests.length === 0) && (
              <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
                <Compass className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  Aucune quête de recrutement active dans le royaume.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🦉 CONTENU DE L'ONGLET : ANNUAIRE DES PROFILS & RÉSONANCE SOCIALE */}
      {!loading && !error && activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {profiles?.map((profile: Profile) => {
            const targetBirdUid = profile.userUid || profile.uid;
            const profileSlug = profile.slug || profile.uid;

            return (
              <div
                key={profile.uid}
                className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                        {profile.archetypeClass || 'Aventurier'} • {profile.alignment || 'TRUE_NEUTRAL'}
                      </span>
                      <h3 className="text-lg font-black uppercase text-white">
                        {profile.name || profile.professionalTitle}
                      </h3>
                      <p className="text-xs font-mono text-[#E5484D]">{profile.professionalTitle}</p>
                    </div>

                    <ResonanceButton
                      targetSlug={targetBirdUid}
                      type="FOLLOWS_GLOBAL"
                      variant="icon"
                      initialIsFollowing={false}
                    />
                  </div>

                  {profile.biographyLore && (
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      « {profile.biographyLore} »
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(profile.skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-mono text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/5">
                  <Link
                    href={`/kontakt/profiles/${encodeURIComponent(profileSlug)}`}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono text-slate-300 hover:text-white transition-all"
                  >
                    Ausculter le Parchemin
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setSocialTarget({
                        uid: targetBirdUid,
                        name: profile.name || profile.professionalTitle,
                        tab: 'endorse'
                      })
                    }
                    className="px-3.5 py-2 bg-[#E5484D]/15 hover:bg-[#E5484D] text-[#E5484D] hover:text-white border border-[#E5484D]/30 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5"
                  >
                    <Award size={12} /> Sceau / Résonance
                  </button>
                </div>
              </div>
            );
          })}

          {(!profiles || profiles.length === 0) && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucun profil Kontakt recensé dans cette strate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🛡️ CONTENU DE L'ONGLET : FICHE DE PERSONNAGE */}
      {!loading && !error && activeTab === 'my-profile' && (
        <form
          onSubmit={handleQuickSaveProfile}
          className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6 animate-in fade-in duration-300 relative"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-center text-[#E5484D]">
                <Shield size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-white">Parchemin de l&apos;Oiseau</h2>
                <p className="text-xs font-mono text-slate-400">
                  Édite tes attributs JDR et ton profil professionnel unifié.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Sparkles size={14} className="text-[#E5484D]" /> Éditeur Complet (Attributs, Portfolio &amp; Tarifs)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="quick-prof-title" className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Intitulé Professionnel &amp; Classe
              </label>
              <input
                id="quick-prof-title"
                type="text"
                value={myProfessionalTitle}
                onChange={e => setMyProfessionalTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quick-archetype" className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Archétype JDR
              </label>
              <input
                id="quick-archetype"
                type="text"
                value={myArchetypeClass}
                onChange={e => setMyArchetypeClass(e.target.value)}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quick-alignment" className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Alignement Moral (D&amp;D / BR)
              </label>
              <select
                id="quick-alignment"
                value={myAlignment}
                onChange={e => setMyAlignment(e.target.value)}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              >
                <option value="CHAOTIC_GOOD">CHAOTIC GOOD (Rebelle Lumineux)</option>
                <option value="REPLICANT_BR">REPLICANT BR (Blade Runner Nexus)</option>
                <option value="LOYAL_GOOD">LOYAL GOOD (Paladin de l&apos;Infra)</option>
                <option value="TRUE_NEUTRAL">TRUE NEUTRAL (Vagabond Silencieux)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="quick-skills" className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Compétences Clés (séparées par des virgules)
              </label>
              <input
                id="quick-skills"
                type="text"
                value={mySkillsInput}
                onChange={e => setMySkillsInput(e.target.value)}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="quick-lore" className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Biographie / Lore
            </label>
            <textarea
              id="quick-lore"
              rows={3}
              maxLength={500}
              value={myBiographyLore}
              onChange={e => setMyBiographyLore(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saveProfileMutation.isPending}
              className="px-6 py-3.5 bg-[#E5484D] hover:bg-[#c43d41] disabled:opacity-50 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              {saveProfileMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Sédimenter les Modifications
            </button>
          </div>
        </form>
      )}

      {/* ⚡ MODALE RAPIDE DE CRÉATION DE QUÊTE */}
      {isQuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0A0D14] border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal size={16} className="text-[#E5484D]" /> Publier un Appel à Candidatures
              </h2>
              <button onClick={() => setIsQuestModalOpen(false)} className="text-xs font-mono text-slate-500 hover:text-white uppercase">
                [ Fermer ]
              </button>
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

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuestModalOpen(false);
                    setIsAdvancedQuestModalOpen(true);
                  }}
                  className="text-[10px] font-mono text-amber-400 hover:underline"
                >
                  Ouvrir le formulaire complet (Budget, Guilde, Danger...)
                </button>
              </div>

              <button 
                type="submit" 
                disabled={createQuestMutation.isPending}
                className="w-full py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createQuestMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Inscrire la Quête dans la Matrice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🏰 MODALE COMPLÈTE DE CRÉATION DE QUÊTE (SSOT JobQuestFormModal) */}
      <JobQuestFormModal
        isOpen={isAdvancedQuestModalOpen}
        onClose={() => setIsAdvancedQuestModalOpen(false)}
        onCreated={() => {
          setIsAdvancedQuestModalOpen(false);
          refreshKontakt();
          toast.success("Quête enrichie publiée avec succès !");
        }}
      />

      {/* 🛡️ MODALE COMPLÈTE DE PROFIL KONTAKT (SSOT KontaktProfileFormModal) */}
      <KontaktProfileFormModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialProfile={
          editingProfileData || {
            professionalTitle: myProfessionalTitle,
            archetypeClass: myArchetypeClass,
            alignment: myAlignment,
            biographyLore: myBiographyLore,
            skills: mySkillsInput.split(',').map(s => s.trim()).filter(Boolean)
          }
        }
        onSaved={(saved) => {
          setEditingProfileData(saved);
          setMyProfessionalTitle(saved.professionalTitle);
          setMyArchetypeClass(saved.archetypeClass);
          setMyAlignment(saved.alignment);
          setIsProfileModalOpen(false);
          refreshKontakt();
          toast.success("Profil Kontakt mis à jour !");
        }}
      />

      {/* 🤝 MODALE D'ACTIONS SOCIALES (Endorse, Vouch, Review, Passerelle) */}
      {socialTarget && (
        <KontaktSocialActionsModal
          isOpen={Boolean(socialTarget)}
          onClose={() => setSocialTarget(null)}
          targetUid={socialTarget.uid}
          targetName={socialTarget.name}
          initialTab={socialTarget.tab}
          onActionSuccess={() => {
            refreshKontakt();
            toast.success("Résonance scellée dans le Graphe !");
          }}
        />
      )}

    </div>
  );
}