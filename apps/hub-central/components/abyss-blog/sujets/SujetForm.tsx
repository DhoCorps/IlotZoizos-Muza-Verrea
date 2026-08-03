// apps/hub-central/components/sujets/SujetForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Type, FileAudio, LayoutGrid, Upload, Music, ShieldCheck, ShoppingBag, Loader2 } from 'lucide-react';
import { storage } from '../../../lib/apiClient';

interface SujetFormProps {
  initialData?: any;
  userCapabilities?: string[];
  existingProjects?: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function SujetForm({ 
  initialData, 
  userCapabilities = [], 
  existingProjects = [],
  onSuccess, 
  onCancel 
}: SujetFormProps) {
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const isEdit = !!initialData;

  // 🪡 TAXONOMIE DYNAMIQUE : Catégories de sujets
  const [sujetCategories, setSujetCategories] = useState<{ value: string; label: string }[]>([
    { value: 'MONOLOGUE', label: 'Monologue' },
    { value: 'POETRY', label: 'Poésie' },
    { value: 'TUTORIAL', label: 'Tutoriel' },
    { value: 'TRACK_NOTE', label: 'Note de Piste' }
  ]);

  useEffect(() => {
    fetch('/api/taxonomy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.sujetCategories) {
          setSujetCategories(data.sujetCategories);
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
        const uploadResult = await storage.upload(selectedFile, 'sujet', initialData?.uid || 'nouveau-sujet');
        audioTrackUrl = uploadResult.url;
        setUploadingFile(false);
      }

      const productId = formData.get('productId')?.toString();
      const payload = {
        title: formData.get('title')?.toString(),
        content: formData.get('content')?.toString(),
        lyrics: formData.get('lyrics')?.toString() || null,
        copyright: formData.get('copyright')?.toString() || null,
        category: formData.get('category'),
        status: formData.get('status'),
        visibility: formData.get('visibility')?.toString() || 'PUBLIC', // 🪡 Souveraineté de visibilité
        connections: {
          relatedProjects: selectedProjects
        },
        media: {
          audioTrackUrl: audioTrackUrl
        },
        merchLink: productId ? { productId, displayMode: 'card' } : null
      };

      const url = isEdit ? `/api/sujets/${initialData.uid}` : '/api/sujets';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "La matrice a rejeté cette pensée.");
      }
      
      onSuccess();
    } catch (err: any) {
      console.error("🌊 Fracture lors de la sédimentation :", err);
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

      {/* Titre et Contenu Brut */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
          <Type size={12} /> {isEdit ? "Ajuster la Pensée" : "Nouveau Monologue"}
        </h4>
        
        <input 
          name="title" 
          defaultValue={initialData?.title} 
          placeholder="Titre du sujet" 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E5484D] font-bold" 
          required 
        />
        
        <textarea 
          name="content" 
          defaultValue={initialData?.content} 
          placeholder="Laisse couler l'onde..." 
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-slate-300 outline-none focus:border-[#E5484D] min-h-[160px] resize-y" 
          required
        />
      </div>

      {/* Paroles & Copyright / Merch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Music size={12} /> Paroles (Lyrics - Optionnel)
          </label>
          <textarea 
            name="lyrics" 
            defaultValue={initialData?.lyrics} 
            placeholder="Strophes, chants..." 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-300 outline-none focus:border-[#E5484D] font-mono h-28 resize-y" 
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} /> Mention de Copyright
            </label>
            <input 
              name="copyright" 
              defaultValue={initialData?.copyright || "© 2026 DhÖ. Tous droits réservés."} 
              placeholder="Ex: © 2026 DhÖ" 
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={12} /> ID Produit Marchand (Optionnel)
            </label>
            <input 
              name="productId" 
              defaultValue={initialData?.merchLink?.productId} 
              placeholder="Ex: prod_777" 
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]" 
            />
          </div>
        </div>
      </div>

      {/* Classification & Visibilité */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">État</label>
          <select name="status" defaultValue={initialData?.status || "DRAFT"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forme (Taxonomie)</label>
          <select name="category" defaultValue={initialData?.category || "MONOLOGUE"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]">
            {sujetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Souveraineté</label>
          <select name="visibility" defaultValue={initialData?.visibility || "PUBLIC"} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500">
            <option value="PUBLIC">🌍 Public</option>
            <option value="EXCHANGEABLE">🔄 Échangeable</option>
            <option value="VISIBLE">👁️ Visible</option>
            <option value="PRIVATE">🔒 Privé</option>
          </select>
        </div>
      </div>

      {/* Média : URL ou Téléversement Cloudflare R2 */}
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <FileAudio size={12} /> Fréquence Audio / Fichier (R2)
        </label>
        <div className="space-y-2">
          <input 
            type="url" 
            name="audioTrackUrl" 
            defaultValue={initialData?.media?.audioTrackUrl} 
            placeholder="https://... ou téléversez ci-dessous" 
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500" 
          />
          <div className="flex items-center gap-2">
            <label className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2 truncate">
              <Upload size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">{selectedFile ? selectedFile.name : "Joindre un fichier audio/médias"}</span>
              <input 
                type="file" 
                className="hidden" 
                accept="audio/*,video/*,text/*,application/pdf"
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

      {/* Le Tissu Connecteur (tom§hat§toes) */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
          <LayoutGrid size={12} /> Illumination du Maillage (Lier à des Chantiers)
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
        <p className="text-[8px] text-slate-500 uppercase">Maintenez CTRL/CMD pour sélectionner plusieurs Nœuds.</p>
      </div>

      {/* Boutons d'Action */}
      <div className="pt-6 flex flex-col gap-3">
        <button type="submit" disabled={loading} className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm text-white hover:bg-[#c43d41] hover:scale-[1.01] transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(229,72,77,0.2)]">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {uploadingFile ? "Sédimentation Cloudflare R2..." : "Sédimentation..."}</>
          ) : (
            isEdit ? "Appliquer la Mutation" : "Sceller le Texte"
          )}
        </button>
        
        <button type="button" onClick={onCancel} className="w-full py-2 text-[9px] uppercase font-mono text-slate-500 hover:text-slate-200 transition-colors">
          Refermer le Grimoire
        </button>
      </div>

    </form>
  );
}