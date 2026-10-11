// apps/hub-central/components/kontakt/cv-editor/CVMarketplaceGallery.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Download,
  Coins,
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
  Upload,
  X,
  Check,
  Repeat,
  Tag,
  ShieldCheck
} from 'lucide-react';

export interface CVTemplateItem {
  uid: string;
  slug?: string;
  title: string;
  description?: string;
  priceShards: number;
  barterAccepted?: boolean;
  letrinFontFamily?: string;
  blocks?: unknown[];
  tags?: string[];
  previewUrl?: string | null;
  authorUid?: string;
  authorName?: string;
  digitalSignature?: string;
}

export interface CVMarketplaceGalleryProps {
  onSelectTemplate: (template: CVTemplateItem) => void;
  currentUserUid?: string;
  isArchitect?: boolean;
  currentBlocks?: unknown[];
}

interface TemplateFormState {
  title: string;
  description: string;
  priceShards: number;
  barterAccepted: boolean;
  letrinFontFamily: string;
  tagsInput: string;
}

const DEFAULT_FORM_STATE: TemplateFormState = {
  title: '',
  description: '',
  priceShards: 0,
  barterAccepted: true,
  letrinFontFamily: 'sans',
  tagsInput: ''
};

export function CVMarketplaceGallery({
  onSelectTemplate,
  currentUserUid,
  isArchitect = false,
  currentBlocks = []
}: CVMarketplaceGalleryProps) {
  const [templates, setTemplates] = useState<CVTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // États de création et d'édition
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CVTemplateItem | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingUid, setUploadingUid] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/kontakt/templates')
      .then(res => res.json())
      .then((data: unknown) => {
        // 🛡️ Harmonisation robuste pour accepter data.data, data.templates ou un tableau direct issu de la Silice
        const record = data as { data?: CVTemplateItem[]; templates?: CVTemplateItem[] };
        const rawList = Array.isArray(data) ? data : (record?.data || record?.templates || []);
        if (Array.isArray(rawList)) {
          setTemplates(rawList);
        } else {
          setTemplates([]);
        }
      })
      .catch(err => console.error("Erreur chargement templates :", err))
      .finally(() => setLoading(false));
  }, []);

  const canManageTemplate = (tmpl: CVTemplateItem): boolean => {
    if (isArchitect) return true;
    if (!currentUserUid || !tmpl.authorUid) return true;
    return tmpl.authorUid === currentUserUid;
  };

  const parseTags = (raw: string): string[] =>
    raw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsCreateOpen(true);
    setFeedback(null);
  };

  const openEditForm = (tmpl: CVTemplateItem) => {
    setIsCreateOpen(false);
    setEditingTemplate(tmpl);
    setFormState({
      title: tmpl.title || '',
      description: tmpl.description || '',
      priceShards: tmpl.priceShards ?? 0,
      barterAccepted: tmpl.barterAccepted ?? true,
      letrinFontFamily: tmpl.letrinFontFamily || 'sans',
      tagsInput: (tmpl.tags || []).join(', ')
    });
    setFeedback(null);
  };

  const closeForms = () => {
    setIsCreateOpen(false);
    setEditingTemplate(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  // =========================================================================
  // 🚀 POST /api/kontakt/templates : Publier un nouveau parchemin
  // =========================================================================
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        title: formState.title.trim() || 'Parchemin Sans Nom',
        description: formState.description.trim() || 'Modèle forgé dans la matrice.',
        priceShards: Number(formState.priceShards) || 0,
        barterAccepted: formState.barterAccepted,
        letrinFontFamily: formState.letrinFontFamily || 'sans',
        blocks: currentBlocks,
        tags: parseTags(formState.tagsInput)
      };

      const res = await fetch('/api/kontakt/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: result.error || 'Échec de la publication du parchemin.' });
        return;
      }

      const created: CVTemplateItem = result.data || payload;
      setTemplates(prev => [created, ...prev]);
      setFeedback({ type: 'success', message: result.message || 'Parchemin forgé avec succès.' });
      closeForms();
    } catch (err) {
      console.error('Erreur création template :', err);
      setFeedback({ type: 'error', message: 'Erreur réseau lors de la création du parchemin.' });
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // ✍️ PUT /api/kontakt/templates/[slug] : Muter un parchemin existant
  // =========================================================================
  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setSubmitting(true);
    setFeedback(null);

    const identifier = editingTemplate.slug || editingTemplate.uid;

    try {
      const payload = {
        title: formState.title.trim() || editingTemplate.title,
        description: formState.description.trim(),
        priceShards: Number(formState.priceShards) || 0,
        barterAccepted: formState.barterAccepted,
        letrinFontFamily: formState.letrinFontFamily || 'sans',
        tags: parseTags(formState.tagsInput)
      };

      const res = await fetch(`/api/kontakt/templates/${encodeURIComponent(identifier)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: result.error || 'Échec de la mutation du parchemin.' });
        return;
      }

      const updated: CVTemplateItem = result.data || { ...editingTemplate, ...payload };
      setTemplates(prev =>
        prev.map(item => (item.uid === editingTemplate.uid ? { ...item, ...updated } : item))
      );
      setFeedback({ type: 'success', message: result.message || 'Le parchemin a muté avec succès.' });
      closeForms();
    } catch (err) {
      console.error('Erreur mise à jour template :', err);
      setFeedback({ type: 'error', message: 'Erreur réseau lors de la mutation du parchemin.' });
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 🧨 DELETE /api/kontakt/templates/[slug] : Dissoudre un parchemin
  // =========================================================================
  const handleDeleteTemplate = async (tmpl: CVTemplateItem) => {
    const identifier = tmpl.slug || tmpl.uid;
    setFeedback(null);

    try {
      const res = await fetch(`/api/kontakt/templates/${encodeURIComponent(identifier)}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: result.error || 'Impossible de dissoudre ce parchemin.' });
        return;
      }

      // 🛡️ Filtrage strict sur l'UID (avec repli sur slug si uid absent)
      setTemplates(prev =>
        prev.filter(item => (tmpl.uid ? item.uid !== tmpl.uid : item.slug !== tmpl.slug))
      );
      setFeedback({ type: 'success', message: result.message || 'Parchemin désintégré de la matrice.' });
    } catch (err) {
      console.error('Erreur suppression template :', err);
      setFeedback({ type: 'error', message: 'Erreur réseau lors de la dissolution.' });
    }
  };

  // =========================================================================
  // 🖼️ POST /api/kontakt/templates/[slug]/upload : Téléverser un aperçu R2 (SHA-256)
  // =========================================================================
  const handleUploadPreview = async (tmpl: CVTemplateItem, file: File) => {
    const identifier = tmpl.slug || tmpl.uid;
    setUploadingUid(tmpl.uid);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/kontakt/templates/${encodeURIComponent(identifier)}/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: result.error || "Échec du téléversement de l'aperçu R2." });
        return;
      }

      const newUrl: string = result?.data?.url || '';
      const signature: string | undefined = result?.data?.digitalSignature || result?.digitalSignature;

      setTemplates(prev =>
        prev.map(item =>
          item.uid === tmpl.uid
            ? { ...item, previewUrl: newUrl, digitalSignature: signature }
            : item
        )
      );
      setFeedback({
        type: 'success',
        message: result.message || 'Aperçu R2 scellé avec Sceau SHA-256.'
      });
    } catch (err) {
      console.error('Erreur upload aperçu R2 :', err);
      setFeedback({ type: 'error', message: "Erreur réseau lors de l'envoi vers le Nexus R2." });
    } finally {
      setUploadingUid(null);
    }
  };

  // =========================================================================
  // 🗑️ DELETE /api/kontakt/templates/[slug]/upload?url=... : Purger l'aperçu R2
  // =========================================================================
  const handlePurgePreview = async (tmpl: CVTemplateItem) => {
    if (!tmpl.previewUrl) return;
    const identifier = tmpl.slug || tmpl.uid;
    setUploadingUid(tmpl.uid);
    setFeedback(null);

    try {
      const res = await fetch(
        `/api/kontakt/templates/${encodeURIComponent(identifier)}/upload?url=${encodeURIComponent(tmpl.previewUrl)}`,
        { method: 'DELETE' }
      );

      const result = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: result.error || "Échec de la purge de l'aperçu R2." });
        return;
      }

      setTemplates(prev =>
        prev.map(item =>
          item.uid === tmpl.uid ? { ...item, previewUrl: null, digitalSignature: undefined } : item
        )
      );
      setFeedback({ type: 'success', message: result.message || 'Aperçu purgé du Nexus R2.' });
    } catch (err) {
      console.error('Erreur purge aperçu R2 :', err);
      setFeedback({ type: 'error', message: 'Erreur réseau lors de la purge R2.' });
    } finally {
      setUploadingUid(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-xs font-mono text-slate-400">Recherche des parchemins dans la matrice...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure : Publication de nouveau parchemin */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          Bibliothèque des Parchemins Kontakt ({templates.length})
        </span>
        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={14} /> Forger un Parchemin
        </button>
      </div>

      {/* Bannière de retour d'action */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-mono flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Formulaire de Création / Édition */}
      {(isCreateOpen || editingTemplate) && (
        <form
          onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
          className="p-6 bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              {editingTemplate ? `Muter : ${editingTemplate.title}` : 'Forger un Nouveau Parchemin'}
            </h4>
            <button type="button" onClick={closeForms} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tmpl-title" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Titre du Parchemin
              </label>
              <input
                id="tmpl-title"
                type="text"
                required
                value={formState.title}
                onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Parchemin Cyber-Sélénite"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="tmpl-font" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Police Letr&apos;In
              </label>
              <input
                id="tmpl-font"
                type="text"
                value={formState.letrinFontFamily}
                onChange={e => setFormState(prev => ({ ...prev, letrinFontFamily: e.target.value }))}
                placeholder="sans, mono, serif..."
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="tmpl-price" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Prix (Éclats / Shards)
              </label>
              <input
                id="tmpl-price"
                type="number"
                min={0}
                value={formState.priceShards}
                onChange={e => setFormState(prev => ({ ...prev, priceShards: Number(e.target.value) }))}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>

            <div>
              <label htmlFor="tmpl-tags" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Tags cosmétiques (séparés par des virgules)
              </label>
              <input
                id="tmpl-tags"
                type="text"
                value={formState.tagsInput}
                onChange={e => setFormState(prev => ({ ...prev, tagsInput: e.target.value }))}
                placeholder="cyberpunk, neo4j, minimal"
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tmpl-desc" className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Description
            </label>
            <textarea
              id="tmpl-desc"
              rows={2}
              value={formState.description}
              onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décris la structure et l'aura de ce modèle..."
              className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.barterAccepted}
                onChange={e => setFormState(prev => ({ ...prev, barterAccepted: e.target.checked }))}
                className="rounded border-white/20 bg-black/60 text-[#E5484D] focus:ring-[#E5484D]"
              />
              <span>Accepter le Troc (barterAccepted)</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2"
            >
              <Check size={14} />
              <span>{editingTemplate ? 'Enregistrer la Mutation' : 'Publier le Parchemin'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Grille des Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tmpl) => {
          const isManageable = canManageTemplate(tmpl);
          const itemKey = tmpl.uid || tmpl.slug || tmpl.title;

          return (
            <div
              key={itemKey}
              className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-[#E5484D]/40 transition-all"
            >
              <div className="space-y-3">
                {/* Aperçu visuel R2 si disponible */}
                {tmpl.previewUrl && (
                  <div className="w-full h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative group">
                    <img
                      src={tmpl.previewUrl}
                      alt={tmpl.title || 'Parchemin'}
                      className="w-full h-full object-cover"
                    />
                    {tmpl.digitalSignature && (
                      <span
                        title={`Sceau SHA-256 : ${tmpl.digitalSignature}`}
                        className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/80 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono flex items-center gap-1"
                      >
                        <ShieldCheck size={10} /> SHA-256
                      </span>
                    )}
                    {isManageable && (
                      <button
                        type="button"
                        title="Purger l'aperçu R2"
                        disabled={uploadingUid === tmpl.uid}
                        onClick={() => handlePurgePreview(tmpl)}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-red-500/80 text-red-300 hover:text-white transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/30 uppercase font-bold">
                    Font: {tmpl.letrinFontFamily || 'Standard'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {tmpl.barterAccepted && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold flex items-center gap-1">
                        <Repeat size={10} /> Troc Ouvert
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                      <Coins size={12} /> {tmpl.priceShards === 0 ? 'Gratuit / Troc' : `${tmpl.priceShards} Éclats`}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-black uppercase text-white">
                  {tmpl.title || 'Parchemin Sans Nom'}
                </h3>
                <p className="text-xs font-sans text-slate-400 leading-relaxed">
                  {tmpl.description || 'Modèle forgé dans la matrice.'}
                </p>

                {/* 🏷️ Affichage des Tags cosmétiques */}
                {tmpl.tags && tmpl.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tmpl.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300 flex items-center gap-1"
                      >
                        <Tag size={9} className="text-[#E5484D]" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[10px] font-mono text-slate-500">
                  Forgé par : <span className="text-white">{tmpl.authorName || 'Inconnu'}</span>
                </p>

                {/* Contrôles de Souveraineté (Auteur / Architecte) : Édition, Suppression & Upload R2 */}
                {isManageable && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <label
                      className="flex-1 py-1.5 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono text-slate-300 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                      title="Téléverser un aperçu R2"
                    >
                      <Upload size={11} />
                      <span>{uploadingUid === tmpl.uid ? 'Scellement...' : 'Aperçu R2'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        aria-label={`Téléverser un aperçu pour ${tmpl.title}`}
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPreview(tmpl, file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      title={`Modifier ${tmpl.title}`}
                      onClick={() => openEditForm(tmpl)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
                    >
                      <Edit3 size={12} />
                    </button>

                    <button
                      type="button"
                      title={`Dissoudre ${tmpl.title}`}
                      onClick={() => handleDeleteTemplate(tmpl)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectTemplate(tmpl)}
                className="w-full py-3 bg-white/5 hover:bg-[#E5484D] text-white font-black uppercase text-xs rounded-2xl border border-white/10 hover:border-transparent transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} /> Importer ce Modèle
              </button>
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-2 bg-black/20 border border-white/5 rounded-3xl">
            <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Aucun modèle public partagé pour l&apos;instant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}