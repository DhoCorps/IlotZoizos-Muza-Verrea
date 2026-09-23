// apps/hub-central/app/[locale]/(inceptions)/marchand/components/StoreCard.tsx
'use client';

import React, { useState } from 'react';
import { Store, ShieldCheck, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StoreCardProps {
  store: {
    uid: string;
    slug?: string;
    storeName: string;
    description?: string;
    isVerified?: boolean;
    stripeAccountId?: string;
    ownerUid?: string;
  };
  currentUser?: {
    uid: string;
    capabilities?: string[];
  };
  onDissolved?: (storeUid: string) => void;
}

export function StoreCard({ store, currentUser, onDissolved }: StoreCardProps) {
  const [isDissolving, setIsDissolving] = useState(false);

  // 🛡️ Vérification de la souveraineté de l'entité (Propriétaire ou Architecte)
  const isOwner = currentUser && currentUser.uid === store.ownerUid;
  const isArchitect = currentUser?.capabilities?.includes('*');
  const canManage = isOwner || isArchitect;

  const handleDissolve = async () => {
    if (!confirm(`Voulez-vous vraiment dissoudre la boutique "${store.storeName}" de la matrice ?`)) {
      return;
    }

    setIsDissolving(true);
    try {
      const identifier = store.slug || store.uid;
      const res = await fetch(`/api/ecommerce/stores/${identifier}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Échec de la dissolution de la boutique.");
      }

      toast.success("La boutique a été dissoute avec succès.");
      if (onDissolved) {
        onDissolved(store.uid);
      }
    } catch (error: any) {
      console.error("🔥 Erreur lors de la dissolution de la boutique :", error);
      toast.error(error.message || "Erreur interne lors de la dissolution.");
    } finally {
      setIsDissolving(false);
    }
  };

  return (
    <div className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-4 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
            <ShieldCheck size={12} /> {store.isVerified ? 'Vérifiée' : 'En attente'}
          </span>
          <Store className="text-cyan-400" size={20} />
        </div>

        <div>
          {/* 🌐 Lien vers la route dynamique de consultation (Silice / Public) */}
          <Link href={`/stores/${store.slug || store.uid}`} className="group inline-flex items-center gap-2">
            <h3 className="text-xl font-black uppercase text-white group-hover:text-cyan-300 transition-colors">
              {store.storeName}
            </h3>
            <ExternalLink size={14} className="text-slate-500 group-hover:text-cyan-300 transition-colors" />
          </Link>
          <p className="text-xs text-slate-400 font-sans mt-1">{store.description || "Aucune description renseignée."}</p>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-slate-500 block">Stripe Connect :</span>
          <code className="text-[10px] font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 text-cyan-400 block truncate">
            {store.stripeAccountId || 'Non lié (Paiement direct requis)'}
          </code>
        </div>
      </div>

      {/* ⚙️ Actions de gestion propriétaire (Dissolution / Suppression sécurisée) */}
      {canManage && (
        <div className="pt-4 border-t border-white/5 flex items-center justify-end">
          <button
            onClick={handleDissolve}
            disabled={isDissolving}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-mono uppercase transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDissolving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Dissoudre
          </button>
        </div>
      )}
    </div>
  );
}