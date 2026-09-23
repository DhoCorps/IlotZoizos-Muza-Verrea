// apps/hub-central/components/ecommerce/stores/StoreForm.tsx
'use client';

import { useState } from 'react';
import { Store, Loader2, CheckCircle2 } from 'lucide-react';
import { ecommerce } from '../../../lib/apiClient';

export function StoreForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Appel de l'API client pour la création de la boutique[cite: 7]
      await ecommerce.createStore({ storeName, description, stripeAccountId });
      setSuccessMessage("Boutique scellée avec succès dans l'îlot !");
      
      // Temporisation pour laisser l'utilisateur contempler le sceau avant fermeture
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (error: any) {
      console.error("🔥 Échec de la création de la boutique :", error);
      // Récupération explicite du message d'erreur du backend (ex: 403 Indésirable, 400 Zod)[cite: 5, 7]
      setErrorMessage(error.message || "Une erreur est survenue lors du scellage de la boutique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Store size={16} className="text-[#E5484D]" /> Ouvrir une Boutique
        </h2>
        <button type="button" onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
      </div>

      {/* ⚠️ Affichage explicite des erreurs du backend (Douane vibratoire / Contrat) */}
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-mono flex items-center gap-2">
          ⚠️ <span>{errorMessage}</span>
        </div>
      )}

      {/* ✨ Retour visuel de succès */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-mono flex items-center gap-2">
          <CheckCircle2 size={14} /> <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Nom de la Boutique</label>
        <input 
          type="text" 
          value={storeName} 
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="ex: La Forge Typographique" 
          required
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Description</label>
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décris tes créations..." 
          rows={3}
          className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Stripe Connect ID (Optionnel)</label>
        <input 
          type="text" 
          value={stripeAccountId} 
          onChange={(e) => setStripeAccountId(e.target.value)}
          placeholder="acct_..." 
          className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-mono outline-none focus:border-[#E5484D]" 
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full py-4 bg-[#E5484D] hover:bg-[#d43b40] disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Scellage en cours...
          </>
        ) : (
          'Sceller la Boutique'
        )}
      </button>
    </form>
  );
}