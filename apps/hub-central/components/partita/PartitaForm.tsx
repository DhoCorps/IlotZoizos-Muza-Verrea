// apps/hub-central/src/components/partita/PartitaForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Music, FileAudio, LayoutGrid, Upload, ShoppingBag, Loader2, Globe, Shield } from 'lucide-react';
import { storage } from '@/lib/apiClient';
import { toast } from 'sonner';

interface PartitaFormProps {
  initialData?: any;
  existingProjects?: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartitaForm({ 
  initialData, 
  existingProjects = [],
  onSuccess, 
  onCancel 
}: PartitaFormProps) {
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const isEdit = !!initialData;

  // 🛡️ Gestion dynamique du rôle pour le Pacte de Filiation
  const defaultCopyright = initialData?.cryptoSeal?.copyrightMetadata || initialData?.copyrightMetadata || {};
  const defaultFiliation = defaultCopyright?.filiation || {};
  const [copyrightRole, setCopyrightRole] = useState(defaultCopyright.role || 'CREATOR');

  // 🪡 TAXONOMIE DYNAMIQUE : Instruments de musique
  const [instruments, setInstruments] = useState<{ value: string; label: string }[]>([
    { value: 'BASS', label: 'Basse / Fretless 🎸' },
    { value: 'GUITAR', label: 'Guitare 🎸' },
    { value: 'PIANO', label: 'Piano / Clavier 🎹' },
    { value: 'DRUMS', label: 'Batterie 🥁' },
    { value: 'VOCAL', label: 'Chant / Voix 🎤' },
    { value: 'OTHER', label: 'Autre / Synth 🎛️' }
  ]);

  useEffect(() => {
    fetch('/api/taxonomy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.instruments) {
          setInstruments(data.instruments);
        }
      })
      .catch(() => {/* Fallback silencieux sur les valeurs par défaut */});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    const selectedProjects = Array.from(formData.getAll('relatedProjects'));

    try {
      let audioTrackUrl = formData.get('audioTrackUrl')?.toString() || initialData?.media?.audioTrackUrl || null;

      // 1. Upload optionnel du fichier audio d'accompagnement
      if (selectedFile) {
        setUploadingFile(true);
        const uploadResult = await storage.upload(selectedFile, 'partita', initialData?.uid || 'nouvelle-partita');
        audioTrackUrl = uploadResult.url;
        setUploadingFile(false);
      }

      const productId = formData.get('productId')?.toString();

      // 🛡️ Construction du Sceau & Pacte de Filiation
      const role = formData.get('copyrightRole')?.toString() || 'CREATOR';
      const isExclusiveIlot = formData.get('isExclusiveIlot') === 'on';
      const isExternalSource = role !== 'CREATOR';
      
      const filiationData = isExternalSource ? {
        isExternalSource: true,
        sourceAuthorName: formData.get('sourceAuthorName')?.toString() || '',
        sourceWorkTitle: formData.get('sourceWorkTitle')?.toString() || '',
        claimStatus: 'PENDING_CLAIM'
      } : undefined;

      // 2. Préparation du payload
      const payload = {
        title: formData.get('title')?.toString(),
        content: formData.get('content')?.toString(),
        instrument: formData.get('instrument'),
        format: formData.get('format'),
        tuning: formData.get('tuning')?.toString() || 'E1-A1-D2-G2',
        status: formData.get('status'),
        visibility: formData.get('visibility')?.toString() || 'PUBLIC',
        
        // 🔍 Bloc SEO
        seo: {
          metaTitle: formData.get('seoMetaTitle')?.toString() || '',
          metaDescription: formData.get('seoMetaDescription')?.toString() || '',
        },

        // 📜 Sceau Cryptographique & Souveraineté
        cryptoSeal: {
          copyrightMetadata: {
            role,
            isExclusiveIlot,
            license: formData.get('license')?.toString() || 'MIT / Libre Canopée',
            filiation: filiationData
          }
        },

        connections: {
          relatedProjects: selectedProjects
        },
        media: {
          audioTrackUrl: audioTrackUrl
        },
        merchLink: productId ? { productId, displayMode: 'card' } : null
      };

      // Validation de sécurité Frontend (pour faire écho au backend)
      if (!payload.title || !payload.content) {
         throw new Error("Une partition nécessite au moins un titre et une notation.");
      }
      if (isExternalSource && (!filiationData?.sourceAuthorName || !filiationData?.sourceWorkTitle)) {
         throw new Error("Le Pacte de Filiation exige le nom de l'auteur original et le titre de l'œuvre source.");
      }

      // 3. Appel de la route API Partita
      const url = isEdit ? `/api/partita/${initialData.slug || initialData.uid}` : '/api/partita';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "La matrice a rejeté cette partition.");
      }
      
      // 4. Succès et notification
      if (!isEdit && data.digitalSignature) {
          toast.success(`Sceau d'antériorité apposé : ${data.digitalSignature.substring(0, 10)}... 🛡️`);
      } else {
          toast.success("Partition sédimentée avec succès ! ✨");
      }

      onSuccess();
    } catch (err: any) {
      console.error("🌊 Fracture lors de la sédimentation de la partition :", err);
      setErrorMsg(err.message);
      setUploadingFile(false);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
      
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs font-mono uppercase tracking-widest">
          {errorMsg}
        </div>
      )}

      {/* Titre et Configuration Musicale */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <Music size={12} /> {isEdit ? "Ajuster la Partition" : "Nouvelle Composition / Tablature"}
        </h4>
        
        <input 
          name="title" 
          defaultValue={initialData?.title} 
          placeholder="Titre de la partition (ex: Ligne Fretless N°4)" 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E5484D] font-bold" 
          required 
        />
      </div>

      {/* Caractéristiques Techniques de la Partition */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="instrument" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrument</label>
          <select id="instrument" name="instrument" defaultValue={initialData?.instrument || "BASS"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            {instruments.map(inst => (
              <option key={inst.value} value={inst.value}>{inst.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="format" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Format</label>
          <select id="format" name="format" defaultValue={initialData?.format || "ABC"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="ABC">Notation ABC</option>
            <option value="TAB">Tablature Brut</option>
            <option value="CHORDPRO">ChordPro (Accords/Paroles)</option>
            <option value="MUSICXML">MusicXML Raw</option>
            <option value="GUITARPRO">Fichier .gp (AlphaTab)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="tuning" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accordage</label>
          <input 
            id="tuning"
            name="tuning" 
            defaultValue={initialData?.tuning || "E1-A1-D2-G2"} 
            placeholder="Ex: E1-A1-D2-G2" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
          />
        </div>
      </div>

      {/* Zone de Notation / Code Musical */}
      <div className="space-y-2">
        <label htmlFor="content" className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Notation Musicale / Code (ABC ou Tab)</span>
          <span className="text-[8px] text-slate-600 font-mono">Ex: C: E1 A1 D2 G2</span>
        </label>
        <textarea 
          id="content"
          name="content" 
          defaultValue={initialData?.content} 
          placeholder="Inscris tes notes, ta tablature ou tes accords ici... Pour un fichier Guitar Pro, dépose le texte base64." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-slate-200 outline-none focus:border-[#E5484D] font-mono min-h-[160px] resize-y" 
          required
        />
      </div>

      {/* ========================================== */}
      {/* 🛡️ SOUVERAINETÉ & PACTE DE FILIATION (SCEAU) */}
      {/* ========================================== */}
      <div className="p-4 bg-[#E5484D]/5 border border-[#E5484D]/20 rounded-xl space-y-4">
        <label className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <Shield size={12} /> Propriété Intellectuelle & Filiation
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {/* 🚀 LIAISON D'ACCESSIBILITÉ POUR LE TEST */}
            <label htmlFor="copyrightRole" className="text-[9px] font-bold text-slate-400 uppercase">Mon Rôle</label>
            <select 
              id="copyrightRole"
              name="copyrightRole" 
              value={copyrightRole}
              onChange={(e) => setCopyrightRole(e.target.value)}
              className="w-full bg-black/40 border border-[#E5484D]/20 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]"
            >
              <option value="CREATOR">Créateur Original (Composition)</option>
              <option value="SUBLIMATOR">Sublimateur (Arrangement / Tablature)</option>
              <option value="CURATOR">Passeur (Copie fidèle d'une œuvre)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="license" className="text-[9px] font-bold text-slate-400 uppercase">Licence de ma partition</label>
            <input 
              id="license"
              name="license" 
              defaultValue={defaultCopyright.license || "MIT / Libre Canopée"} 
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" 
            />
          </div>
        </div>

        {/* Pacte de Filiation (Affiché uniquement si pas Créateur) */}
        {copyrightRole !== 'CREATOR' && (
          <div className="p-3 bg-black/30 border border-white/5 rounded-lg space-y-3 mt-2">
            <p className="text-[9px] text-slate-500 font-mono uppercase">
              Pacte de Filiation : Déclaration de l'œuvre source
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input 
                name="sourceAuthorName" 
                defaultValue={defaultFiliation.sourceAuthorName} 
                placeholder="Auteur Original (ex: J.S. Bach)" 
                className="w-full bg-black/40 border border-amber-500/20 p-2.5 rounded-lg text-xs text-white outline-none focus:border-amber-500" 
                required={copyrightRole !== 'CREATOR'}
              />
              <input 
                name="sourceWorkTitle" 
                defaultValue={defaultFiliation.sourceWorkTitle} 
                placeholder="Œuvre Source (ex: Cello Suite 1)" 
                className="w-full bg-black/40 border border-amber-500/20 p-2.5 rounded-lg text-xs text-white outline-none focus:border-amber-500" 
                required={copyrightRole !== 'CREATOR'}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <input 
            type="checkbox" 
            id="isExclusiveIlot" 
            name="isExclusiveIlot" 
            defaultChecked={defaultCopyright.isExclusiveIlot} 
            className="accent-[#E5484D]" 
          />
          <label htmlFor="isExclusiveIlot" className="text-[10px] font-mono text-slate-400 cursor-pointer">
            Exclusivité Îlot Zoizos (Distribution restreinte à la Canopée)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* État de Publication */}
        <div className="space-y-2">
          <label htmlFor="status" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</label>
          <select id="status" name="status" defaultValue={initialData?.status || "DRAFT"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="DRAFT">Brouillon (Intime)</option>
            <option value="PUBLISHED">Publié (Ouvert)</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>

        {/* Droits et Souveraineté de Visibilité */}
        <div className="space-y-2">
          <label htmlFor="visibility" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Visibilité
          </label>
          <select 
            id="visibility"
            name="visibility" 
            defaultValue={initialData?.visibility || "PUBLIC"} 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
          >
            <option value="PUBLIC">🌍 Public</option>
            <option value="EXCHANGEABLE">🔄 Échangeable (Troc)</option>
            <option value="PRIVATE">🔒 Privé</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🔍 BLOC SEO (Indexation) */}
      {/* ========================================== */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Globe size={12} /> Indexation SEO (Optionnel)
        </label>
        <div className="space-y-3">
          <input 
            name="seoMetaTitle" 
            defaultValue={initialData?.seo?.metaTitle} 
            placeholder="Méta-Titre (Ex: Ligne de Basse Fretless - Tablature ABC)" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500" 
            maxLength={60}
          />
          <textarea 
            name="seoMetaDescription" 
            defaultValue={initialData?.seo?.metaDescription} 
            placeholder="Méta-Description courte pour les moteurs de recherche..." 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 min-h-[80px] resize-y" 
            maxLength={160}
          />
        </div>
      </div>

      {/* Média Audio (URL ou R2) */}
      <div className="space-y-2">
        <label htmlFor="audioTrackUrl" className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <FileAudio size={12} /> Piste de Démonstration (Audio)
        </label>
        <div className="space-y-2">
          <input 
            id="audioTrackUrl"
            type="url" 
            name="audioTrackUrl" 
            defaultValue={initialData?.media?.audioTrackUrl} 
            placeholder="https://... ou téléversez ci-dessous" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500 font-mono" 
          />
          <div className="flex items-center gap-2">
            <label className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2 truncate">
              <Upload size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">{selectedFile ? selectedFile.name : "Joindre un fichier audio (MP3, WAV...)"}</span>
              <input 
                type="file" 
                className="hidden" 
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
              />
            </label>
            {selectedFile && (
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                className="px-2 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px]"
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Maillage aux Chantiers */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <label htmlFor="relatedProjects" className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
          <LayoutGrid size={12} /> Ancrer à des Chantiers de l'Îlot
        </label>
        <select 
          id="relatedProjects"
          name="relatedProjects" 
          multiple 
          defaultValue={initialData?.connections?.relatedProjects || []} 
          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white h-24 custom-scrollbar outline-none focus:border-[#E5484D]"
        >
          {existingProjects.map((p: any) => (
            <option key={p.uid} value={p.uid}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="pt-4 flex flex-col gap-3">
        <button type="submit" disabled={loading} className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white hover:bg-[#c43d41] transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(229,72,77,0.2)]">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {uploadingFile ? "Sédimentation Cloudflare R2..." : "Enregistrement..."}</>
          ) : (
            isEdit ? "Appliquer les Modifications" : "Sceller la Partition"
          )}
        </button>
        
        <button type="button" onClick={onCancel} className="w-full py-2 text-[9px] uppercase font-mono text-slate-500 hover:text-slate-200 transition-colors">
          Refermer le Grimoire
        </button>
      </div>

    </form>
  );
}