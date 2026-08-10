'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, ShieldAlert } from 'lucide-react';

interface LeaderboardOiseau {
    uid: string;
    pseudo?: string;
    nickname?: string;
    ifvScore: number;
    profileStatus: string;
    avatarUrl?: string;
}

export default function SovereignLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardOiseau[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch('/api/sovereign/leaderboard');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Échec de l'exploration du panthéon.");
                setLeaderboard(data.leaderboard || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    if (loading) {
        return (
            <div className="p-8 text-center text-xs font-mono text-slate-500 animate-pulse">
                Exploration des flux lumineux de la canopée...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-950/40 border border-red-900 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert size={16} /> {error}
            </div>
        );
    }

    return (
        <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl max-w-xl mx-auto space-y-6">
            <div className="border-b border-slate-800/80 pb-4 flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Trophy className="text-amber-400" size={20} /> Hall of Fame &bull; Les Lumineux
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Sparkles size={12} /> Élite Respectable
                </span>
            </div>

            {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">
                    Aucun Oiseau n'a encore atteint le sommet de la fréquence vibratoire.
                </p>
            ) : (
                <div className="space-y-3">
                    {leaderboard.map((bird, index) => (
                        <div 
                            key={bird.uid}
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs font-mono ${
                                    index === 0 ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' :
                                    index === 1 ? 'bg-slate-300/20 border border-slate-300/50 text-slate-300' :
                                    index === 2 ? 'bg-amber-700/20 border border-amber-700/50 text-amber-600' :
                                    'bg-slate-800 text-slate-500'
                                }`}>
                                    #{index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-200">
                                        {bird.pseudo || bird.nickname || 'Oiseau Anonyme'}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-500">
                                        UID : {bird.uid.substring(0, 12)}...
                                    </p>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-900/50">
                                    IFV : {bird.ifvScore}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}