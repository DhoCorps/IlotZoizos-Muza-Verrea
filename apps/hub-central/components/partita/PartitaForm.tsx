// apps/hub-central/components/partitions/PartitaForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Music, FileAudio, LayoutGrid, Upload, ShoppingBag, Loader2 } from 'lucide-react';
import { storage } from '../../lib/apiClient';

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

      if (selectedFile) {
        setUploadingFile(true);
        const uploadResult = await storage.upload(selectedFile, 'partita', initialData?.uid || 'nouvelle-partita');
        audioTrackUrl = uploadResult.url;
        setUploadingFile(false);
      }

      const productId = formData.get('productId')?.toString();

      const payload = {
        title: formData.get('title')?.toString(),
        content: formData.get('content')?.toString(),
        instrument: formData.get('instrument'),
        format: formData.get('format'),
        tuning: formData.get('tuning')?.toString() || 'E1-A1-D2-G2',
        status: formData.get('status'),
        visibility: formData.get('visibility')?.toString() || 'PUBLIC',
        connections: {
          relatedProjects: selectedProjects
        },
        media: {
          audioTrackUrl: audioTrackUrl
        },
        merchLink: productId ? { productId, displayMode: 'card' } : null
      };

      const url = isEdit ? `/api/partitions/${initialData.uid}` : '/api/partitions';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "La matrice a rejeté cette partition.");
      }
      
      onSuccess();
    } catch (err: any) {
      console.error("🌊 Fracture lors de la sédimentation de la partition :", err);
      setErrorMsg(err.message);
      setUploadingFile(false);
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

      {/* Caractéristiques Techniques de la Partition (Instruments Dynamiques) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrument</label>
          <select name="instrument" defaultValue={initialData?.instrument || "BASS"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            {instruments.map(inst => (
              <option key={inst.value} value={inst.value}>{inst.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Format</label>
          <select name="format" defaultValue={initialData?.format || "ABC"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="ABC">Notation ABC</option>
            <option value="TAB">Tablature Brut</option>
            <option value="CHORDPRO">ChordPro (Accords/Paroles)</option>
            <option value="MUSICXML">MusicXML Raw</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accordage</label>
          <input 
            name="tuning" 
            defaultValue={initialData?.tuning || "E1-A1-D2-G2"} 
            placeholder="Ex: E1-A1-D2-G2" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
          />
        </div>
      </div>

      {/* Zone de Notation / Code Musical */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Notation Musicale / Code (ABC ou Tab)</span>
          <span className="text-[8px] text-slate-600 font-mono">Ex: C: E1 A1 D2 G2</span>
        </label>
        <textarea 
          name="content" 
          defaultValue={initialData?.content} 
          placeholder="Inscris tes notes, ta tablature ou tes accords ici..." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-slate-200 outline-none focus:border-[#E5484D] font-mono min-h-[160px] resize-y" 
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* État de Publication */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</label>
          <select name="status" defaultValue={initialData?.status || "DRAFT"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="DRAFT">Brouillon (Intime)</option>
            <option value="PUBLISHED">Publié (Ouvert)</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>

        {/* Droits et Souveraineté de Visibilité */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Visibilité & Souveraineté
          </label>
          <select 
            name="visibility" 
            defaultValue={initialData?.visibility || "PUBLIC"} 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
          >
            <option value="PUBLIC">🌍 Public</option>
            <option value="EXCHANGEABLE">🔄 Échangeable (Troc / Marketplace)</option>
            <option value="VISIBLE">👁️ Visible (Hors marché)</option>
            <option value="PRIVATE">🔒 Privé</option>
          </select>
        </div>
      </div>

      {/* E-Commerce Marchand */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <ShoppingBag size={12} /> Produit Associé (Optionnel)
        </label>
        <input 
          name="productId" 
          defaultValue={initialData?.merchLink?.productId} 
          placeholder="ID Produit E-Commerce (ex: prod_bass_01)" 
          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" 
        />
      </div>

      {/* Média Audio (URL ou R2) */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <FileAudio size={12} /> Fréquence Audio / Piste de Démonstration
        </label>
        <div className="space-y-2">
          <input 
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
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Maillage aux Chantiers */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
          <LayoutGrid size={12} /> Ancrer à des Chantiers de l'Îlot
        </label>
        <select 
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