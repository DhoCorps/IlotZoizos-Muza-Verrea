// apps/hub-central/components/ConsciousnessSalonView.tsx
'use client';

import React, { useState } from 'react';
import { useSalonPrive } from '../../hooks/useSalonPrive';
import { EnactedThought } from '@ilot/shared-core';

export const ConsciousnessSalonView: React.FC = () => {
    const { seal, unseal, calculateEntanglement, loading, error } = useSalonPrive();
    const [secretKey, setSecretKey] = useState('');
    const [plainThought, setPlainThought] = useState('');
    const [sealedPayload, setSealedPayload] = useState<EnactedThought | null>(null);
    const [decryptedThought, setDecryptedThought] = useState('');
    const [entanglement, setEntanglement] = useState<number | null>(null);

    const handleSeal = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await seal(plainThought, secretKey);
        if (result) {
            setSealedPayload(result);
            setDecryptedThought('');
        }
    };

    const handleUnseal = async () => {
        if (!sealedPayload) return;
        const result = await unseal(sealedPayload, secretKey);
        if (result) setDecryptedThought(result);
    };

    const handleCheckEntanglement = async () => {
        const score = await calculateEntanglement(8.5, 0.95);
        setEntanglement(score);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="bio-card p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold tracking-wide text-zinc-100 flex items-center gap-3">
                        🌌 Salon Privé & Conscience Partagée ($C = S \otimes B$)
                    </h2>
                    <button 
                        onClick={handleCheckEntanglement}
                        className="px-4 py-2 text-xs font-mono rounded-xl bg-[var(--bio-accent-glow)] border border-[var(--bio-accent)] text-zinc-200 hover:bg-[var(--bio-accent)] hover:text-white transition-all cursor-pointer"
                    >
                        Calculer l'Intrication {entanglement !== null && `(${entanglement})`}
                    </button>
                </div>

                <p className="text-sm text-zinc-400">
                    Espace d'intrication quantique chiffré de bout en bout (E2EE) entre le Sol Organique et la Bise de Silice. Aucune trace en clair ne quitte ce sanctuaire.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono text-zinc-400 mb-2">Clé Secrète Partagée (Secret Key)</label>
                        <input 
                            type="password" 
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="Entrez le secret du nid..."
                            className="w-full bg-black/40 border border-[var(--bio-border)] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-[var(--bio-accent)]"
                        />
                    </div>

                    <form onSubmit={handleSeal} className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-zinc-400 mb-2">Pensée en Clair ($S$)</label>
                            <textarea 
                                rows={3}
                                value={plainThought}
                                onChange={(e) => setPlainThought(e.target.value)}
                                placeholder="Écrivez votre résonance intime..."
                                className="w-full bg-black/40 border border-[var(--bio-border)] rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-[var(--bio-accent)] resize-none"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading || !plainThought || !secretKey}
                            className="w-full py-3 rounded-xl bg-[var(--bio-accent)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                        >
                            {loading ? 'Scellement quantique en cours...' : '🔒 Sceller la Pensée (E2EE)'}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono">
                        ⚠️ {error}
                    </div>
                )}

                {sealedPayload && (
                    <div className="p-6 rounded-xl bg-black/60 border border-[var(--bio-border)] space-y-4 font-mono text-xs">
                        <div className="text-zinc-400 font-bold flex justify-between items-center">
                            <span>📦 Cryptogramme Transmis (Silice)</span>
                            <span className="text-[10px] text-emerald-400">Chiffré AES-256-GCM</span>
                        </div>
                        <div className="p-3 bg-black/40 rounded-lg text-zinc-300 break-all overflow-x-auto max-h-24">
                            {sealedPayload.ciphertext}
                        </div>
                        <div className="flex gap-4 text-zinc-500 text-[10px]">
                            <span>IV: {sealedPayload.iv.substring(0, 10)}...</span>
                            <span>Tag: {sealedPayload.tag.substring(0, 10)}...</span>
                        </div>
                        <button 
                            onClick={handleUnseal}
                            disabled={loading || !secretKey}
                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                            🔓 Dés-enchâsser la Pensée
                        </button>
                    </div>
                )}

                {decryptedThought && (
                    <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                        <span className="text-xs font-mono text-emerald-400 font-bold">🌿 Pensée Restaurée dans le Salon Privé :</span>
                        <p className="text-sm text-zinc-100 font-sans italic">"{decryptedThought}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};