'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    ShieldQuestion, 
    Swords, 
    Loader2, 
    Lock, 
    Unlock, 
    User, 
    Skull,
    Trophy,
    Scale,
    Heart
} from 'lucide-react';
import { BirdProfile } from '@/components/profile/BirdProfile';
import SovereignLeaderboard from '@/components/sovereign/SovereignLeaderboard';
import { MediationModal } from '@/components/mediation/MediationModal'; // 🕊️ Sas de Médiation
import { PantheonPraises } from '@/components/pantheon/PantheonPraises'; // 🌟 Panthéon des Éloges

export default function ProfilePage({ params }: { params?: { slug?: string } }) {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const [guessInput, setGuessInput] = useState('');
    
    // 🕊️ État d'ouverture de la modale de médiation
    const [isMediationOpen, setIsMediationOpen] = useState(false);

    // Détermination de l'Oiseau ciblé (soit via l'URL, soit soi-même par défaut)
    const currentUserUid = (session?.user as any)?.uid;
    const targetSlug = params?.slug || currentUserUid;
    const isOwner = currentUserUid === targetSlug;

    // 📡 SUTURE REACT QUERY : Récupération des données du profil et du statut du mini-jeu
    const { data: profileData, isLoading } = useQuery({
        queryKey: ['profile', targetSlug],
        queryFn: async () => {
            const res = await fetch(`/api/users/${targetSlug}`);
            if (!res.ok) throw new Error("Empreinte introuvable.");
            return res.json();
        },
        enabled: status === 'authenticated' && !!targetSlug,
    });

    // ⚔️ SUTURE REACT QUERY : Mutation pour tenter de deviner le sobriquet
    const guessMutation = useMutation({
        mutationFn: async (guess: string) => {
            const res = await fetch(`/api/users/${targetSlug}/guess-pseudo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guess })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Le sort a échoué.");
            return data;
        },
        onSuccess: (data) => {
            if (data.success && data.isCorrect) {
                toast.success(`🎉 Incroyable ! Tu as percé le secret et pillé ${data.lootAmount} ressources !`);
                queryClient.invalidateQueries({ queryKey: ['profile', targetSlug] });
            } else {
                toast.error("❌ Faux ! Le sceau de l'Oiseau a résisté à ta tentative.");
            }
            setGuessInput('');
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleGuessSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guessInput.trim()) return;
        guessMutation.mutate(guessInput.trim());
    };

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-slate-500" />
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-4">
                <Skull className="w-12 h-12 text-slate-600" />
                <p className="text-sm font-mono uppercase tracking-widest">Ce sanctuaire est vide ou a été dissous.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in fade-in duration-500">
            
            {/* 🛡️ LE JEU DU SOBRIQUET (Zone de Pillage) */}
            <div className="relative overflow-hidden p-8 bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl">
                {/* Aura visuelle de fond (Gris bleuté et teintes sombres) */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-700/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-slate-800/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    
                    {/* Explications et Lore */}
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldQuestion size={12} /> Sceau d'Identité
                            </span>
                            
                            {/* 🕊️ Bouton de signalement (uniquement sur le profil des autres) */}
                            {!isOwner && (
                                <button
                                    onClick={() => setIsMediationOpen(true)}
                                    className="px-3 py-1 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 rounded-full text-[10px] font-bold text-rose-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                                >
                                    <Scale size={12} /> Signaler
                                </button>
                            )}
                        </div>
                        
                        {isOwner ? (
                            <>
                                <h2 className="text-2xl font-black uppercase text-slate-100">Ton Coffre-Fort</h2>
                                <p className="text-xs font-mono text-slate-400 leading-relaxed">
                                    Ton sobriquet organique est scellé. S'ils le devinent, ils pilleront ton Alvéole à hauteur du nombre de tentatives nécessaires. Protège ton secret.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-black uppercase text-slate-100">Le Pillage du Sceau</h2>
                                <p className="text-xs font-mono text-slate-400 leading-relaxed">
                                    Cet oiseau dissimule sa véritable fréquence. Devine son véritable sobriquet pour briser son sceau et piller les ressources de son Alvéole !
                                </p>
                            </>
                        )}
                    </div>

                    {/* Zone d'Interaction (Propriétaire vs Visiteur) */}
                    <div className="flex-1 w-full max-w-md bg-slate-950 border border-slate-800 p-6 rounded-2xl">
                        {isOwner ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Véritable Sobriquet</span>
                                    <Lock size={14} className="text-slate-500" />
                                </div>
                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
                                    <span className="text-lg font-black tracking-widest text-slate-200">
                                        {profileData.pseudo || "Inconnu"}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono uppercase">
                                    <span className="text-slate-500">Tentatives subies :</span>
                                    <span className="text-slate-300 font-bold">{profileData.guessAttempts || 0}</span>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleGuessSubmit} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Tenter une percée</span>
                                    <Unlock size={14} className="text-slate-400" />
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={guessInput}
                                        onChange={(e) => setGuessInput(e.target.value)}
                                        placeholder="Ex: Faucon Sélénite..." 
                                        className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-200 outline-none focus:border-slate-500 transition-colors"
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={guessMutation.isPending}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black uppercase text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {guessMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
                                    Tenter le Pillage
                                </button>
                            </form>
                        )}
                    </div>

                </div>
            </div>

            {/* 🌿 LE PROFIL CLASSIQUE & SANCTUAIRE */}
            <div className="pt-8 border-t border-slate-800/50 space-y-12">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <User size={18} className="text-slate-500" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-300">
                            Sanctuaire & Artefacts
                        </h3>
                    </div>
                    
                    <BirdProfile 
                        birdName={profileData.nickname || profileData.pseudo || "Oiseau Anonyme"} 
                    />
                </div>

                {/* 🌟 LE PANTHÉON DES ÉLOGES (Alimente le Bouclier Karmique) */}
                <div className="pt-8 border-t border-slate-800/50 flex flex-col items-center">
                    <div className="w-full flex items-center gap-2 mb-6">
                        <Heart size={18} className="text-amber-400" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-300">
                            Panthéon des Éloges
                        </h3>
                    </div>
                    
                    <PantheonPraises 
                        targetUid={profileData.uid || targetSlug} 
                        targetPseudo={profileData.pseudo || "Oiseau"} 
                    />
                </div>

                {/* 🏆 LE HALL OF FAME */}
                <div className="pt-8 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-6">
                        <Trophy size={18} className="text-amber-400" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-300">
                            Panthéon de la Canopée
                        </h3>
                    </div>
                    
                    <SovereignLeaderboard />
                </div>
            </div>

            {/* 🕊️ Modale du Sas de Médiation */}
            <MediationModal 
                isOpen={isMediationOpen}
                onClose={() => setIsMediationOpen(false)}
                targetUid={profileData.uid || targetSlug}
                targetPseudo={profileData.pseudo || "Oiseau"}
            />

        </div>
    );
}