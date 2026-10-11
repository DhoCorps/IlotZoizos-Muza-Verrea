// apps/hub-central/components/kontakt/KontaktProfileFormModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Shield,
  Sparkles,
  X,
  Check,
  Trash2,
  Plus,
  Flame,
  Zap,
  Cpu,
  Award,
  Coins,
  Globe
} from 'lucide-react';
import { TTRPGAlignmentEnum } from '@ilot/types';

const TTRPG_ALIGNMENTS: readonly string[] = TTRPGAlignmentEnum?.options ?? [
  'LOYAL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD',
  'LOYAL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL',
  'LOYAL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL',
  'ANGE_INS', 'DEMON_INS', 'REPLICANT_BR', 'HUMAIN_BR'
];

export type PortfolioItemType = 'IMAGE' | 'GITHUB_REPO' | 'AUDIO' | '3D' | 'WEB';

export interface KontaktPortfolioItemForm {
  type: PortfolioItemType;
  url: string;
  title: string;
  tags: string[];
}

export interface KontaktProfileFormData {
  uid?: string;
  slug?: string;
  professionalTitle: string;
  seniorityYears: number;
  skills: string[];
  availabilityStatus: 'OPEN_TO_WORK' | 'ON_A_QUEST' | 'RECRUITED';
  portfolioUrl?: string | null;
  archetypeClass: string;
  alignment: string;
  attributes: {
    force: number;
    agilite: number;
    intelligence: number;
    charisme: number;
    empathieVoightKampff: number;
  };
  specialArtifacts: string[];
  biographyLore: string;
  portfolioItems: KontaktPortfolioItemForm[];
  pricing?: {
    hourlyRateCents: number;
    missionRateCents: number;
    currency: string;
  };
  tags: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  settings: {
    allowDirectContact: boolean;
    showcaseBadge: boolean;
  };
}

export interface KontaktProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: Partial<KontaktProfileFormData> | null;
  onSaved?: (profile: KontaktProfileFormData) => void;
  onDeleted?: (identifier: string) => void;
}

export default function KontaktProfileFormModal({
  isOpen,
  onClose,
  initialProfile = null,
  onSaved,
  onDeleted
}: KontaktProfileFormModalProps) {
  const isEditMode = Boolean(initialProfile?.slug || initialProfile?.uid);

  const [professionalTitle, setProfessionalTitle] = useState(initialProfile?.professionalTitle || '');
  const [archetypeClass, setArchetypeClass] = useState(initialProfile?.archetypeClass || '');
  const [alignment, setAlignment] = useState(initialProfile?.alignment || 'TRUE_NEUTRAL');
  const [availabilityStatus, setAvailabilityStatus] = useState<'OPEN_TO_WORK' | 'ON_A_QUEST' | 'RECRUITED'>(
    initialProfile?.availabilityStatus || 'OPEN_TO_WORK'
  );
  const [seniorityYears, setSeniorityYears] = useState<number>(initialProfile?.seniorityYears ?? 0);
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile?.portfolioUrl || '');
  const [biographyLore, setBiographyLore] = useState(initialProfile?.biographyLore || '');

  // Listes sous forme de chaînes séparées par des virgules pour l'édition
  const [skillsInput, setSkillsInput] = useState((initialProfile?.skills || []).join(', '));
  const [artifactsInput, setArtifactsInput] = useState((initialProfile?.specialArtifacts || []).join(', '));
  const [tagsInput, setTagsInput] = useState((initialProfile?.tags || []).join(', '));

  // Attributs JDR (1-20) & Voight-Kampff (0-100)
  const [force, setForce] = useState<number>(initialProfile?.attributes?.force ?? 10);
  const [agilite, setAgilite] = useState<number>(initialProfile?.attributes?.agilite ?? 10);
  const [intelligence, setIntelligence] = useState<number>(initialProfile?.attributes?.intelligence ?? 10);
  const [charisme, setCharisme] = useState<number>(initialProfile?.attributes?.charisme ?? 10);
  const [empathieVoightKampff, setEmpathieVoightKampff] = useState<number>(
    initialProfile?.attributes?.empathieVoightKampff ?? 50
  );

  // Tarifs
  const [hourlyRateCents, setHourlyRateCents] = useState<number>(
    initialProfile?.pricing?.hourlyRateCents ?? 5000
  );
  const [missionRateCents, setMissionRateCents] = useState<number>(
    initialProfile?.pricing?.missionRateCents ?? 40000
  );
  const [currency, setCurrency] = useState<string>(initialProfile?.pricing?.currency || 'EUR');

  // Portfolio items
  const [portfolioItems, setPortfolioItems] = useState<KontaktPortfolioItemForm[]>(
    initialProfile?.portfolioItems || []
  );
  const [newItemType, setNewItemType] = useState<PortfolioItemType>('GITHUB_REPO');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');

  // SEO & Settings
  const [metaTitle, setMetaTitle] = useState(initialProfile?.seo?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(initialProfile?.seo?.metaDescription || '');
  const [allowDirectContact, setAllowDirectContact] = useState<boolean>(
    initialProfile?.settings?.allowDirectContact ?? true
  );
  const [showcaseBadge, setShowcaseBadge] = useState<boolean>(
    initialProfile?.settings?.showcaseBadge ?? true
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCsv = (val: string): string[] =>
    val
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const handleAddPortfolioItem = () => {
    if (!newItemTitle.trim() || !newItemUrl.trim()) return;
    setPortfolioItems(prev => [
      ...prev,
      {
        type: newItemType,
        title: newItemTitle.trim(),
        url: newItemUrl.trim(),
        tags: []
      }
    ]);
    setNewItemTitle('');
    setNewItemUrl('');
  };

  const handleRemovePortfolioItem = (index: number) => {
    setPortfolioItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: Record<string, unknown> = {
      professionalTitle: professionalTitle.trim(),
      archetypeClass: archetypeClass.trim(),
      alignment,
      availabilityStatus,
      seniorityYears: Math.max(0, Number(seniorityYears) || 0),
      portfolioUrl: portfolioUrl.trim() ? portfolioUrl.trim() : null,
      skills: parseCsv(skillsInput),
      specialArtifacts: parseCsv(artifactsInput),
      biographyLore: biographyLore.trim(),
      attributes: {
        force: Math.min(20, Math.max(1, Number(force) || 10)),
        agilite: Math.min(20, Math.max(1, Number(agilite) || 10)),
        intelligence: Math.min(20, Math.max(1, Number(intelligence) || 10)),
        charisme: Math.min(20, Math.max(1, Number(charisme) || 10)),
        empathieVoightKampff: Math.min(100, Math.max(0, Number(empathieVoightKampff) || 50))
      },
      portfolioItems,
      pricing: {
        hourlyRateCents: Math.max(0, Number(hourlyRateCents) || 0),
        missionRateCents: Math.max(0, Number(missionRateCents) || 0),
        currency: currency.trim() || 'EUR'
      },
      tags: parseCsv(tagsInput),
      seo: {
        ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
        ...(metaDescription.trim() ? { metaDescription: metaDescription.trim() } : {})
      },
      settings: {
        allowDirectContact,
        showcaseBadge
      }
    };

    try {
      const identifier = initialProfile?.slug || initialProfile?.uid;
      const endpoint = isEditMode && identifier
        ? `/api/kontakt/profiles/${encodeURIComponent(identifier)}`
        : '/api/kontakt/profiles';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Échec de la sédimentation du profil.');
        return;
      }

      setSuccessMessage(result.message || 'Profil Kontakt scellé avec succès.');
      if (onSaved && result.data) {
        onSaved(result.data);
      }
    } catch (err) {
      console.error('Erreur sauvegarde profil Kontakt :', err);
      setErrorMessage('Erreur réseau lors de la sauvegarde du profil.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const identifier = initialProfile?.slug || initialProfile?.uid;
    if (!identifier) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/kontakt/profiles/${encodeURIComponent(identifier)}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Impossible de dissoudre ce profil.');
        return;
      }

      if (onDeleted) {
        onDeleted(identifier);
      }
      onClose();
    } catch (err) {
      console.error('Erreur dissolution profil Kontakt :', err);
      setErrorMessage('Erreur réseau lors de la dissolution du profil.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0A0D14] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="text-[#E5484D]" size={20} />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              {isEditMode ? 'Muter le Profil Kontakt' : 'Sédimenter un Profil Kontakt'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la modale profil"
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
          {/* Identité Pro & Classe RPG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-title" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Titre Professionnel *
              </label>
              <input
                id="profile-title"
                type="text"
                required
                value={professionalTitle}
                onChange={e => setProfessionalTitle(e.target.value)}
                placeholder="Ex: Architecte Silice & Graphes"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="profile-archetype" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Classe / Archétype JDR *
              </label>
              <input
                id="profile-archetype"
                type="text"
                required
                value={archetypeClass}
                onChange={e => setArchetypeClass(e.target.value)}
                placeholder="Ex: Mage de Silice"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="profile-alignment" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Alignement JDR
              </label>
              <select
                id="profile-alignment"
                value={alignment}
                onChange={e => setAlignment(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              >
                {TTRPG_ALIGNMENTS.map(align => (
                  <option key={align} value={align} className="bg-black text-white">
                    {align}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="profile-availability" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Statut de Disponibilité
              </label>
              <select
                id="profile-availability"
                value={availabilityStatus}
                onChange={e =>
                  setAvailabilityStatus(e.target.value as 'OPEN_TO_WORK' | 'ON_A_QUEST' | 'RECRUITED')
                }
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              >
                <option value="OPEN_TO_WORK" className="bg-black text-white">OPEN_TO_WORK</option>
                <option value="ON_A_QUEST" className="bg-black text-white">ON_A_QUEST</option>
                <option value="RECRUITED" className="bg-black text-white">RECRUITED</option>
              </select>
            </div>

            <div>
              <label htmlFor="profile-seniority" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Années d&apos;Ancienneté
              </label>
              <input
                id="profile-seniority"
                type="number"
                min={0}
                value={seniorityYears}
                onChange={e => setSeniorityYears(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="profile-portfolio-url" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                URL Portfolio Principal
              </label>
              <input
                id="profile-portfolio-url"
                type="url"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://ilotzoizos.com"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>
          </div>

          {/* Attributs JDR (1-20) & Voight-Kampff (0-100) */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" /> Attributs JDR (1-20) &amp; Voight-Kampff (0-100)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label htmlFor="attr-force" className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Flame size={10} className="text-red-400" /> Force
                </label>
                <input
                  id="attr-force"
                  type="number"
                  min={1}
                  max={20}
                  value={force}
                  onChange={e => setForce(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="attr-agilite" className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Zap size={10} className="text-amber-400" /> Agilité
                </label>
                <input
                  id="attr-agilite"
                  type="number"
                  min={1}
                  max={20}
                  value={agilite}
                  onChange={e => setAgilite(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="attr-intelligence" className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Cpu size={10} className="text-cyan-400" /> Intelligence
                </label>
                <input
                  id="attr-intelligence"
                  type="number"
                  min={1}
                  max={20}
                  value={intelligence}
                  onChange={e => setIntelligence(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="attr-charisme" className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Award size={10} className="text-emerald-400" /> Charisme
                </label>
                <input
                  id="attr-charisme"
                  type="number"
                  min={1}
                  max={20}
                  value={charisme}
                  onChange={e => setCharisme(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="attr-vk" className="text-[10px] font-mono text-slate-400 block">
                  Voight-Kampff
                </label>
                <input
                  id="attr-vk"
                  type="number"
                  min={0}
                  max={100}
                  value={empathieVoightKampff}
                  onChange={e => setEmpathieVoightKampff(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Compétences, Artefacts & Lore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-skills" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Compétences (séparées par des virgules)
              </label>
              <input
                id="profile-skills"
                type="text"
                value={skillsInput}
                onChange={e => setSkillsInput(e.target.value)}
                placeholder="TypeScript, Next.js, Neo4j"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="profile-artifacts" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Artefacts Spéciaux (séparés par des virgules)
              </label>
              <input
                id="profile-artifacts"
                type="text"
                value={artifactsInput}
                onChange={e => setArtifactsInput(e.target.value)}
                placeholder="Clavier mécanique, Sceau R2"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-lore" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Légende / Biographie Lore (max 500 caractères)
            </label>
            <textarea
              id="profile-lore"
              rows={2}
              maxLength={500}
              value={biographyLore}
              onChange={e => setBiographyLore(e.target.value)}
              placeholder="Raconte ton parcours à travers la Canopée..."
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>

          {/* Tarification (Pricing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div>
              <label htmlFor="pricing-hourly" className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1 mb-1">
                <Coins size={11} className="text-amber-400" /> Tarif Horaire (Centimes)
              </label>
              <input
                id="pricing-hourly"
                type="number"
                min={0}
                value={hourlyRateCents}
                onChange={e => setHourlyRateCents(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="pricing-mission" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Tarif Mission / TJM (Centimes)
              </label>
              <input
                id="pricing-mission"
                type="number"
                min={0}
                value={missionRateCents}
                onChange={e => setMissionRateCents(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="pricing-currency" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Devise
              </label>
              <input
                id="pricing-currency"
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Éléments du Portfolio */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Globe size={12} className="text-[#E5484D]" /> Artefacts de Portfolio ({portfolioItems.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select
                aria-label="Type d'élément portfolio"
                value={newItemType}
                onChange={e => setNewItemType(e.target.value as PortfolioItemType)}
                className="bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              >
                <option value="GITHUB_REPO">GITHUB_REPO</option>
                <option value="WEB">WEB</option>
                <option value="IMAGE">IMAGE</option>
                <option value="AUDIO">AUDIO</option>
                <option value="3D">3D</option>
              </select>
              <input
                type="text"
                aria-label="Titre de l'élément portfolio"
                value={newItemTitle}
                onChange={e => setNewItemTitle(e.target.value)}
                placeholder="Titre du repo / projet"
                className="bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
              <input
                type="url"
                aria-label="URL de l'élément portfolio"
                value={newItemUrl}
                onChange={e => setNewItemUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="bg-black/60 border border-white/10 p-2 rounded-xl text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddPortfolioItem}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-mono rounded-xl flex items-center justify-center gap-1"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>

            {portfolioItems.length > 0 && (
              <ul className="space-y-1.5 pt-2">
                {portfolioItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5"
                  >
                    <span className="text-slate-300">
                      [{item.type}] <strong className="text-white">{item.title}</strong> — {item.url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePortfolioItem(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Squelette Mutualisé : Tags, SEO & Gouvernance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profile-tags" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Tags SEO (séparés par des virgules)
              </label>
              <input
                id="profile-tags"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="silice, fullstack, neo4j"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="profile-meta-title" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Méta Titre SEO (max 60)
              </label>
              <input
                id="profile-meta-title"
                type="text"
                maxLength={60}
                value={metaTitle}
                onChange={e => setMetaTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="profile-meta-desc" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Méta Description SEO (max 160)
              </label>
              <input
                id="profile-meta-desc"
                type="text"
                maxLength={160}
                value={metaDescription}
                onChange={e => setMetaDescription(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDirectContact}
                  onChange={e => setAllowDirectContact(e.target.checked)}
                />
                <span>Autoriser le contact direct</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showcaseBadge}
                  onChange={e => setShowcaseBadge(e.target.checked)}
                />
                <span>Afficher le badge Kontakt</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              {isEditMode && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDelete}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Dissoudre le Profil
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
              >
                <Check size={14} />
                <span>{isEditMode ? 'Enregistrer la Mutation' : 'Sédimenter le Profil'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}