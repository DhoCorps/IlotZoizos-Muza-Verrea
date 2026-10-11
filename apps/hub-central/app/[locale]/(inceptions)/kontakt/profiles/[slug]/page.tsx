// apps/hub-central/app/[locale]/(inceptions)/kontakt/profiles/[slug]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Sparkles,
  Flame,
  Zap,
  Cpu,
  Award,
  Coins,
  Globe,
  Star,
  Edit3,
  Loader2
} from 'lucide-react';
import KontaktProfileFormModal, { KontaktProfileFormData } from '@/components/kontakt/KontaktProfileFormModal';
import KontaktSocialActionsModal, { SocialActionTab } from '@/components/kontakt/KontaktSocialActionsModal';
import ResonanceButton from '@/components/resonance/ResonanceButton';

interface KontaktProfileDetail extends KontaktProfileFormData {
  uid: string;
  userUid: string;
  slug: string;
  reviews?: Array<{
    authorUid: string;
    rating: number;
    comment: string;
    isVerifiedHire?: boolean;
  }>;
}

export default function KontaktProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const [profile, setProfile] = useState<KontaktProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<SocialActionTab | null>(null);

  const fetchProfile = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kontakt/profiles/${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Profil Kontakt introuvable dans la matrice.');
        return;
      }
      setProfile(json.data || json);
    } catch (err) {
      console.error('Erreur chargement profil :', err);
      setError('Erreur réseau lors de la lecture du parchemin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#E5484D] animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Auscultation du parchemin en cours...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-black/40 border border-red-500/30 rounded-3xl text-center space-y-4">
        <p className="text-xs font-mono text-red-400">{error || 'Profil introuvable.'}</p>
        <Link
          href="/kontakt"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-mono text-white rounded-xl"
        >
          <ArrowLeft size={14} /> Retour à Kontakt-RH
        </Link>
      </div>
    );
  }

  const targetBirdUid = profile.userUid || profile.uid;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Link
          href="/kontakt"
          className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} /> Retour à Kontakt-RH
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <Edit3 size={13} /> Muter / Dissoudre
          </button>
          <ResonanceButton
            targetSlug={targetBirdUid}
            type="FOLLOWS_GLOBAL"
            variant="icon"
            initialIsFollowing={false}
          />
        </div>
      </div>

      {/* En-tête du Profil */}
      <div className="p-8 bg-black/50 border border-white/10 rounded-3xl backdrop-blur-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase">
                {profile.archetypeClass}
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-amber-400 uppercase">
                {profile.alignment}
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-mono text-emerald-400 uppercase">
                {profile.availabilityStatus}
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase text-white">{profile.professionalTitle}</h1>
            <p className="text-xs font-mono text-slate-400">
              Ancienneté : {profile.seniorityYears || 0} ans • UID Oiseau : {targetBirdUid}
            </p>
          </div>

          {profile.pricing && (
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-right font-mono">
              <div className="text-xs text-amber-400 flex items-center justify-end gap-1 font-bold">
                <Coins size={14} /> {Math.round((profile.pricing.hourlyRateCents || 0) / 100)} {profile.pricing.currency || 'EUR'} / h
              </div>
              <div className="text-[10px] text-slate-400">
                Mission : {Math.round((profile.pricing.missionRateCents || 0) / 100)} {profile.pricing.currency || 'EUR'}
              </div>
            </div>
          )}
        </div>

        {/* Lore */}
        {profile.biographyLore && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" /> Parchemin de Légende
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">« {profile.biographyLore} »</p>
          </div>
        )}

        {/* Attributs JDR */}
        {profile.attributes && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Flame size={12} className="text-red-400" /> Force</span>
              <span className="text-white font-bold">{profile.attributes.force}/20</span>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Zap size={12} className="text-amber-400" /> Agilité</span>
              <span className="text-white font-bold">{profile.attributes.agilite}/20</span>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Cpu size={12} className="text-cyan-400" /> Intel.</span>
              <span className="text-white font-bold">{profile.attributes.intelligence}/20</span>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Award size={12} className="text-emerald-400" /> Charisme</span>
              <span className="text-white font-bold">{profile.attributes.charisme}/20</span>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Shield size={12} className="text-[#E5484D]" /> V-K</span>
              <span className="text-[#E5484D] font-bold">{profile.attributes.empathieVoightKampff}%</span>
            </div>
          </div>
        )}

        {/* Compétences & Artefacts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-2">
              Compétences &amp; Sorts
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(profile.skills || []).map((skill, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {profile.specialArtifacts && profile.specialArtifacts.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-2">
                Artefacts Spéciaux
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.specialArtifacts.map((art, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-mono text-amber-300">
                    {art}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Items */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Globe size={12} /> Réalisations &amp; Artefacts du Portfolio
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.portfolioItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-black/40 border border-white/10 hover:border-[#E5484D] rounded-xl text-xs font-mono flex items-center justify-between transition-all"
                >
                  <span className="text-white font-bold">{item.title}</span>
                  <span className="text-[10px] text-slate-400">[{item.type}]</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Avis reçus */}
        {profile.reviews && profile.reviews.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Star size={12} className="text-amber-400" /> Avis de Collaboration ({profile.reviews.length})
            </span>
            <div className="space-y-2">
              {profile.reviews.map((rev, idx) => (
                <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold">{rev.rating}/5 ★</span>
                    <span className="text-[10px] text-slate-500">Par {rev.authorUid}</span>
                  </div>
                  <p className="text-slate-300">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre d'actions sociales Neo4j */}
        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={() => setSocialModalTab('endorse')}
            className="px-4 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-xl transition-all"
          >
            Apposer un Sceau de Confiance
          </button>
          <button
            type="button"
            onClick={() => setSocialModalTab('recommend')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl transition-all"
          >
            Recommander (Vouch)
          </button>
          <button
            type="button"
            onClick={() => setSocialModalTab('review')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl transition-all"
          >
            Laisser un Avis
          </button>
          <button
            type="button"
            onClick={() => setSocialModalTab('introduction')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl transition-all"
          >
            Demander une Passerelle
          </button>
        </div>
      </div>

      <KontaktProfileFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialProfile={profile}
        onSaved={(updated) => {
          setProfile(prev => (prev ? { ...prev, ...updated } : prev));
          setIsEditOpen(false);
        }}
        onDeleted={() => {
          router.push('/kontakt');
        }}
      />

      {socialModalTab && (
        <KontaktSocialActionsModal
          isOpen={Boolean(socialModalTab)}
          onClose={() => setSocialModalTab(null)}
          targetUid={targetBirdUid}
          targetName={profile.professionalTitle}
          initialTab={socialModalTab}
          onActionSuccess={() => {
            fetchProfile();
          }}
        />
      )}
    </div>
  );
}