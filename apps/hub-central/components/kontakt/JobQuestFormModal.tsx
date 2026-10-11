// apps/hub-central/components/kontakt/JobQuestFormModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Coins,
  Skull,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import {
  WorkArrangementSchema,
  ContractTypeSchema,
  EmploymentTypeSchema,
  ExperienceLevelSchema,
  BudgetTypeSchema,
  QuestDifficultySchema
} from '@ilot/types';

const WORK_ARRANGEMENTS: readonly string[] = WorkArrangementSchema?.options ?? [
  'FULL_REMOTE', 'HYBRID', 'ON_SITE'
];
const CONTRACT_TYPES: readonly string[] = ContractTypeSchema?.options ?? [
  'FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER'
];
const EMPLOYMENT_TYPES: readonly string[] = EmploymentTypeSchema?.options ?? [
  'FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP'
];
const EXPERIENCE_LEVELS: readonly string[] = ExperienceLevelSchema?.options ?? [
  'APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU'
];
const BUDGET_TYPES: readonly string[] = BudgetTypeSchema?.options ?? [
  'DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY'
];
const QUEST_DIFFICULTIES: readonly string[] = QuestDifficultySchema?.options ?? [
  'PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC'
];

export interface JobQuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectUid?: string;
  onCreated?: (quest: Record<string, unknown>) => void;
}

export default function JobQuestFormModal({
  isOpen,
  onClose,
  defaultProjectUid = '',
  onCreated
}: JobQuestFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectUid, setProjectUid] = useState(defaultProjectUid);

  // Entreprise / Guilde
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyWebsiteUrl, setCompanyWebsiteUrl] = useState('');

  // Logistique
  const [workArrangement, setWorkArrangement] = useState('FULL_REMOTE');
  const [contractType, setContractType] = useState('FREELANCE');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [experienceLevel, setExperienceLevel] = useState('CONFIRMED');
  const [location, setLocation] = useState('Remote');

  // Budget & Matchmaking
  const [minBudgetCents, setMinBudgetCents] = useState<string>('40000');
  const [maxBudgetCents, setMaxBudgetCents] = useState<string>('60000');
  const [budgetType, setBudgetType] = useState('DAILY_RATE');
  const [currency, setCurrency] = useState('EUR');

  // Compétences, Prérequis & Missions
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');
  const [bonusSkillsInput, setBonusSkillsInput] = useState('');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [responsibilitiesInput, setResponsibilitiesInput] = useState('');

  // Flavor RPG & Récompenses
  const [questDifficulty, setQuestDifficulty] = useState('NORMAL');
  const [dangerLevel, setDangerLevel] = useState<number>(10);
  const [rewardXp, setRewardXp] = useState<number>(100);
  const [rewardLore, setRewardLore] = useState('');
  const [perksInput, setPerksInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [allowApplications, setAllowApplications] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCsv = (val: string): string[] =>
    val
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedMin = minBudgetCents !== '' ? Number(minBudgetCents) : null;
    const parsedMax = maxBudgetCents !== '' ? Number(maxBudgetCents) : null;

    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setErrorMessage(
        'Hérésie mathématique : Le budget minimum ne peut pas être supérieur au budget maximum.'
      );
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      ...(projectUid.trim() ? { projectUid: projectUid.trim() } : {}),
      title: title.trim(),
      description: description.trim(),
      ...(companyName.trim()
        ? {
            company: {
              name: companyName.trim(),
              description:
                companyDescription.trim().length >= 10
                  ? companyDescription.trim()
                  : 'Guilde enregistrée dans la Canopée.',
              ...(companyWebsiteUrl.trim() ? { websiteUrl: companyWebsiteUrl.trim() } : {})
            }
          }
        : {}),
      workArrangement,
      contractType,
      employmentType,
      experienceLevel,
      location: location.trim() || 'Remote',
      minBudgetCents: parsedMin,
      maxBudgetCents: parsedMax,
      ...(parsedMin != null && parsedMax != null
        ? {
            budgetConstraint: {
              minBudgetCents: parsedMin,
              maxBudgetCents: parsedMax
            }
          }
        : {}),
      budgetType,
      currency: currency.trim() || 'EUR',
      requiredSkills: parseCsv(requiredSkillsInput),
      bonusSkills: parseCsv(bonusSkillsInput),
      requirements: parseCsv(requirementsInput),
      responsibilities: parseCsv(responsibilitiesInput),
      questDifficulty,
      dangerLevel: Math.min(100, Math.max(0, Number(dangerLevel) || 0)),
      rewardXp: Math.max(0, Number(rewardXp) || 0),
      ...(rewardLore.trim() ? { rewardLore: rewardLore.trim() } : {}),
      perks: parseCsv(perksInput),
      tags: parseCsv(tagsInput),
      settings: {
        allowApplications
      }
    };

    try {
      const res = await fetch('/api/kontakt/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Données de quête invalides.');
        return;
      }

      setSuccessMessage(result.message || 'Quête de recrutement publiée avec succès.');
      if (onCreated && result.data) {
        onCreated(result.data);
      }
    } catch (err) {
      console.error('Erreur publication quête :', err);
      setErrorMessage('Erreur réseau lors de la publication de la quête.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0A0D14] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Briefcase className="text-[#E5484D]" size={20} />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Publier un Appel de Quête (JobQuest)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la modale de quête"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre, Chantier & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quest-title" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Titre de la Quête *
              </label>
              <input
                id="quest-title"
                type="text"
                required
                minLength={3}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Recherche Paladin Fullstack"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="quest-project-uid" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                UID du Chantier (Optionnel pour Guilde)
              </label>
              <input
                id="quest-project-uid"
                type="text"
                value={projectUid}
                onChange={e => setProjectUid(e.target.value)}
                placeholder="Ex: proj_ilot_01"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="quest-description" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Description de la Quête * (min 10 caractères)
            </label>
            <textarea
              id="quest-description"
              rows={3}
              required
              minLength={10}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décris les objectifs techniques et l'enjeu de la mission..."
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>

          {/* Informations Guilde / Entreprise */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Building2 size={12} className="text-[#E5484D]" /> Guilde / Entreprise Commanditaire
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="quest-company-name" className="text-[10px] font-mono text-slate-400 block mb-1">
                  Nom de la Guilde
                </label>
                <input
                  id="quest-company-name"
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Guilde des Zoizos"
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="quest-company-desc" className="text-[10px] font-mono text-slate-400 block mb-1">
                  Description Guilde
                </label>
                <input
                  id="quest-company-desc"
                  type="text"
                  value={companyDescription}
                  onChange={e => setCompanyDescription(e.target.value)}
                  placeholder="Bâtisseurs MERN & Neo4j"
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="quest-company-url" className="text-[10px] font-mono text-slate-400 block mb-1">
                  Site Web
                </label>
                <input
                  id="quest-company-url"
                  type="url"
                  value={companyWebsiteUrl}
                  onChange={e => setCompanyWebsiteUrl(e.target.value)}
                  placeholder="https://ilotzoizos.com"
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Logistique & Conditions */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label htmlFor="quest-work-arrangement" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Télétravail
              </label>
              <select
                id="quest-work-arrangement"
                value={workArrangement}
                onChange={e => setWorkArrangement(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {WORK_ARRANGEMENTS.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-contract-type" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Contrat
              </label>
              <select
                id="quest-contract-type"
                value={contractType}
                onChange={e => setContractType(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {CONTRACT_TYPES.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-employment-type" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Temps
              </label>
              <select
                id="quest-employment-type"
                value={employmentType}
                onChange={e => setEmploymentType(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {EMPLOYMENT_TYPES.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-exp-level" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Rang RPG
              </label>
              <select
                id="quest-exp-level"
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {EXPERIENCE_LEVELS.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-location" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Lieu
              </label>
              <input
                id="quest-location"
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Budget & Suture Matchmaking */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div>
              <label htmlFor="quest-min-budget" className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                <Coins size={11} className="text-amber-400" /> Budget Min (Cents)
              </label>
              <input
                id="quest-min-budget"
                type="number"
                min={0}
                value={minBudgetCents}
                onChange={e => setMinBudgetCents(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-max-budget" className="text-[10px] font-mono text-slate-400 block mb-1">
                Budget Max (Cents)
              </label>
              <input
                id="quest-max-budget"
                type="number"
                min={0}
                value={maxBudgetCents}
                onChange={e => setMaxBudgetCents(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-budget-type" className="text-[10px] font-mono text-slate-400 block mb-1">
                Type de Budget
              </label>
              <select
                id="quest-budget-type"
                value={budgetType}
                onChange={e => setBudgetType(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {BUDGET_TYPES.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-currency" className="text-[10px] font-mono text-slate-400 block mb-1">
                Devise
              </label>
              <input
                id="quest-currency"
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Compétences, Prérequis & Missions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quest-required-skills" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Compétences Requises (séparées par des virgules)
              </label>
              <input
                id="quest-required-skills"
                type="text"
                value={requiredSkillsInput}
                onChange={e => setRequiredSkillsInput(e.target.value)}
                placeholder="Next.js, Neo4j, TypeScript"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-bonus-skills" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Compétences Bonus (séparées par des virgules)
              </label>
              <input
                id="quest-bonus-skills"
                type="text"
                value={bonusSkillsInput}
                onChange={e => setBonusSkillsInput(e.target.value)}
                placeholder="Zod, Tailwind"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-requirements" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Prérequis RH (séparés par des virgules)
              </label>
              <input
                id="quest-requirements"
                type="text"
                value={requirementsInput}
                onChange={e => setRequirementsInput(e.target.value)}
                placeholder="Architecture graphe, Tests unitaires"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-responsibilities" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Missions / Responsabilités (séparées par des virgules)
              </label>
              <input
                id="quest-responsibilities"
                type="text"
                value={responsibilitiesInput}
                onChange={e => setResponsibilitiesInput(e.target.value)}
                placeholder="Sceller les routes API, Maintenir la SSOT"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Flavor RPG, Récompenses & Tags */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div>
              <label htmlFor="quest-difficulty" className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                <Sparkles size={11} className="text-amber-400" /> Difficulté
              </label>
              <select
                id="quest-difficulty"
                value={questDifficulty}
                onChange={e => setQuestDifficulty(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                {QUEST_DIFFICULTIES.map(opt => (
                  <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quest-danger" className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                <Skull size={11} className="text-red-400" /> Danger (0-100)
              </label>
              <input
                id="quest-danger"
                type="number"
                min={0}
                max={100}
                value={dangerLevel}
                onChange={e => setDangerLevel(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-reward-xp" className="text-[10px] font-mono text-slate-400 block mb-1">
                Récompense XP
              </label>
              <input
                id="quest-reward-xp"
                type="number"
                min={0}
                value={rewardXp}
                onChange={e => setRewardXp(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-reward-lore" className="text-[10px] font-mono text-slate-400 block mb-1">
                Récompense Lore
              </label>
              <input
                id="quest-reward-lore"
                type="text"
                value={rewardLore}
                onChange={e => setRewardLore(e.target.value)}
                placeholder="Fragment d'étoile"
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quest-perks" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Avantages / Loots (séparés par des virgules)
              </label>
              <input
                id="quest-perks"
                type="text"
                value={perksInput}
                onChange={e => setPerksInput(e.target.value)}
                placeholder="Café infini, Setup triple écran"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="quest-tags" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Tags SEO (séparés par des virgules)
              </label>
              <input
                id="quest-tags"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="neo4j, backend, silice"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowApplications}
                onChange={e => setAllowApplications(e.target.checked)}
              />
              <span>Ouvrir les candidatures (allowApplications)</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
            >
              <Check size={14} />
              <span>Publier la Quête</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}