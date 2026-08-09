'use client';

import React, { useState } from 'react';
import { Upload, X, Music, Disc, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SampleUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SampleUploadModal: React.FC<SampleUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tempoBpm, setTempoBpm] = useState('120');
  const [musicalKey, setMusicalKey] = useState('C minor');
  const [style, setStyle] = useState('Cyberpunk');
  const [allowRadio, setAllowRadio] = useState(true);
  const [allowBlindTest, setAllowBlindTest] = useState(true);
  const [allowShowcase, setAllowShowcase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Veuillez sélectionner une brindille audio (MP3 ou WAV).');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('tempoBpm', tempoBpm);
    formData.append('musicalKey', musicalKey);
    formData.append('style', style);
    formData.append('allowRadio', String(allowRadio));
    formData.append('allowBlindTest', String(allowBlindTest));
    formData.append('allowShowcase', String(allowShowcase));

    try {
      const res = await fetch('/api/samples/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erreur lors de l’envoi');

      toast.success('Sample gravé et sédimenté avec succès dans SamploTek ! 💿');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur upload sample :', err);
      toast.error(err.message || 'Impossible de sceller le sample dans le Nexus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Disc className="text-red-500 animate-pulse" size={20} />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">Graver un Nouveau Sample • SamploTek</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* Sélection de Fichier */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-400">Fichier Audio (MP3, WAV)</label>
            <div className="border-2 border-dashed border-slate-700 hover:border-red-500/50 rounded-2xl p-6 text-center transition-colors cursor-pointer relative bg-slate-950/30">
              <input 
                type="file" 
                accept="audio/mp3,audio/wav,audio/ogg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center space-y-2">
                <Upload className="text-red-500" size={24} />
                <p className="text-xs font-mono text-slate-300">
                  {file ? <span className="text-red-400 font-bold">{file.name}</span> : "Glisse ton sample ici ou clique pour explorer"}
                </p>
                <span className="text-[10px] font-mono text-slate-500">Poids max conseillé : 15 Mo</span>
              </div>
            </div>
          </div>

          {/* Titre et Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Titre de l'œuvre</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Kick Canopée 01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Style / Genre</label>
              <input 
                type="text" 
                required
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex: Cyberpunk, Ambient"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* BPM et Tonalité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Tempo (BPM)</label>
              <input 
                type="number" 
                required
                min={40}
                max={300}
                value={tempoBpm}
                onChange={(e) => setTempoBpm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Tonalité (Key)</label>
              <input 
                type="text" 
                required
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                placeholder="Ex: A minor, C major"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Permissions de Diffusion */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider">Permissions de Diffusion dans la Canopée</label>
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={allowRadio}
                  onChange={(e) => setAllowRadio(e.target.checked)}
                  className="accent-red-600 w-4 h-4 rounded"
                />
                <span className="text-xs font-mono text-slate-300">Diffuser sur la Radio de l'Îlot</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={allowBlindTest}
                  onChange={(e) => setAllowBlindTest(e.target.checked)}
                  className="accent-red-600 w-4 h-4 rounded"
                />
                <span className="text-xs font-mono text-slate-300">Intégrer dans les sessions de Blind-Test</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={allowShowcase}
                  onChange={(e) => setAllowShowcase(e.target.checked)}
                  className="accent-red-600 w-4 h-4 rounded"
                />
                <span className="text-xs font-mono text-slate-300">Autoriser le Diaporama Universel (Showcase)</span>
              </label>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-mono text-xs text-slate-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {isSubmitting ? 'Scellement...' : 'Graver le Sample'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};