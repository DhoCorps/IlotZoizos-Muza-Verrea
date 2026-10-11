// apps/hub-central/components/kontakt/KontaktSocialActionsModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Award,
  ThumbsUp,
  Star,
  Share2,
  X,
  Check
} from 'lucide-react';

export type SocialActionTab = 'endorse' | 'recommend' | 'review' | 'introduction';

export interface KontaktSocialActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  targetName?: string;
  initialTab?: SocialActionTab;
  onActionSuccess?: (tab: SocialActionTab, data: unknown) => void;
}

export default function KontaktSocialActionsModal({
  isOpen,
  onClose,
  targetUid,
  targetName = 'cet Oiseau',
  initialTab = 'endorse',
  onActionSuccess
}: KontaktSocialActionsModalProps) {
  const [activeTab, setActiveTab] = useState<SocialActionTab>(initialTab);

  // 1. Sceau de Confiance (/api/kontakt/endorse)
  const [skillName, setSkillName] = useState('');
  const [endorseComment, setEndorseComment] = useState('');

  // 2. Recommandation directe (/api/kontakt/recommendations)
  const [vouchSkill, setVouchSkill] = useState('');
  const [vouchComment, setVouchComment] = useState('');

  // 3. Avis post-collaboration (/api/kontakt/reviews)
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');

  // 4. Demande de Passerelle (/api/kontakt/introductions)
  const [intermediaryUid, setIntermediaryUid] = useState('');
  const [introMessage, setIntroMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const switchTab = (tab: SocialActionTab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let endpoint = '';
    let payload: Record<string, unknown> = {};

    if (activeTab === 'endorse') {
      endpoint = '/api/kontakt/endorse';
      payload = {
        targetUid,
        skillName: skillName.trim(),
        comment: endorseComment.trim()
      };
    } else if (activeTab === 'recommend') {
      endpoint = '/api/kontakt/recommendations';
      payload = {
        targetUid,
        skill: vouchSkill.trim(),
        comment: vouchComment.trim()
      };
    } else if (activeTab === 'review') {
      endpoint = '/api/kontakt/reviews';
      payload = {
        targetUid,
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        comment: reviewComment.trim()
      };
    } else if (activeTab === 'introduction') {
      endpoint = '/api/kontakt/introductions';
      payload = {
        intermediaryUid: intermediaryUid.trim(),
        targetUid,
        message: introMessage.trim()
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Action refusée par le contrat souverain.');
        return;
      }

      setSuccessMessage(result.message || 'Interaction scellée dans le Graphe Neo4j.');
      if (onActionSuccess) {
        onActionSuccess(activeTab, result.data);
      }
    } catch (err) {
      console.error('Erreur interaction sociale Kontakt :', err);
      setErrorMessage('Erreur réseau lors de la transmission au Graphe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4">
      <div className="w-full max-w-lg bg-[#0A0D14] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              Résonance Sociale • {targetName}
            </h2>
            <p className="text-[10px] font-mono text-slate-400">Cible : {targetUid}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la modale sociale"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur des 4 routes sociales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => switchTab('endorse')}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
              activeTab === 'endorse' ? 'bg-[#E5484D] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={12} /> Sceau
          </button>
          <button
            type="button"
            onClick={() => switchTab('recommend')}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
              activeTab === 'recommend' ? 'bg-[#E5484D] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ThumbsUp size={12} /> Vouch
          </button>
          <button
            type="button"
            onClick={() => switchTab('review')}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
              activeTab === 'review' ? 'bg-[#E5484D] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star size={12} /> Avis
          </button>
          <button
            type="button"
            onClick={() => switchTab('introduction')}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
              activeTab === 'introduction' ? 'bg-[#E5484D] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 size={12} /> Passerelle
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'endorse' && (
            <>
              <div>
                <label htmlFor="endorse-skill-name" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Compétence à sceller (skillName) *
                </label>
                <input
                  id="endorse-skill-name"
                  type="text"
                  required
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  placeholder="Ex: NEO4J"
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
              <div>
                <label htmlFor="endorse-comment" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Commentaire du Sceau (Optionnel)
                </label>
                <textarea
                  id="endorse-comment"
                  rows={2}
                  value={endorseComment}
                  onChange={e => setEndorseComment(e.target.value)}
                  placeholder="Pourquoi certifier cette compétence ?"
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
            </>
          )}

          {activeTab === 'recommend' && (
            <>
              <div>
                <label htmlFor="vouch-skill" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Domaine de Recommandation (skill) *
                </label>
                <input
                  id="vouch-skill"
                  type="text"
                  required
                  value={vouchSkill}
                  onChange={e => setVouchSkill(e.target.value)}
                  placeholder="Ex: ARCHITECTURE_SILICE"
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
              <div>
                <label htmlFor="vouch-comment" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Témoignage de Recommandation (Optionnel)
                </label>
                <textarea
                  id="vouch-comment"
                  rows={2}
                  value={vouchComment}
                  onChange={e => setVouchComment(e.target.value)}
                  placeholder="Je me porte garant de cet Oiseau..."
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
            </>
          )}

          {activeTab === 'review' && (
            <>
              <div>
                <label htmlFor="review-rating" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Note de Collaboration (1 à 5 étoiles) *
                </label>
                <input
                  id="review-rating"
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={rating}
                  onChange={e => setRating(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
              <div>
                <label htmlFor="review-comment" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Avis détaillé après mission (:HIRED requis) *
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Décris la qualité de votre collaboration..."
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
            </>
          )}

          {activeTab === 'introduction' && (
            <>
              <div>
                <label htmlFor="intro-intermediary" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  UID ou Slug de l&apos;Oiseau Intermédiaire *
                </label>
                <input
                  id="intro-intermediary"
                  type="text"
                  required
                  value={intermediaryUid}
                  onChange={e => setIntermediaryUid(e.target.value)}
                  placeholder="Ex: bird_mentor_01"
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
              <div>
                <label htmlFor="intro-message" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Message d&apos;accompagnement pour la Passerelle *
                </label>
                <textarea
                  id="intro-message"
                  rows={3}
                  required
                  value={introMessage}
                  onChange={e => setIntroMessage(e.target.value)}
                  placeholder="Explique à l'intermédiaire l'objet de la mise en relation..."
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
                />
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
            >
              <Check size={14} />
              <span>Transmettre au Graphe</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}