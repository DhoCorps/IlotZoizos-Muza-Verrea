'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, X } from 'lucide-react';

export default function ConsentBanner() {
    const [hasConsented, setHasConsented] = useState<boolean | null>(null);

    useEffect(() => {
        // Vérifie si un choix a déjà été enregistré dans la Silice locale du navigateur
        const consent = localStorage.getItem('ilot_consent_analytics');
        if (consent !== null) {
            const isGranted = consent === 'granted';
            setHasConsented(isGranted);
            updateGoogleConsent(isGranted);
        } else {
            setHasConsented(false);
        }
    }, []);

    const updateGoogleConsent = (granted: boolean) => {
        if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
            (window as any).gtag('consent', 'update', {
                analytics_storage: granted ? 'granted' : 'denied',
                ad_storage: 'denied', // Par défaut, on protège les données publicitaires
                ad_user_data: 'denied',
                ad_personalization: 'denied',
            });
        }
    };

    const handleAccept = () => {
        localStorage.setItem('ilot_consent_analytics', 'granted');
        setHasConsented(true);
        updateGoogleConsent(true);
    };

    const handleDeny = () => {
        localStorage.setItem('ilot_consent_analytics', 'denied');
        setHasConsented(false);
        updateGoogleConsent(false);
    };

    // Si l'Oiseau a déjà choisi, on masque la bannière
    if (hasConsented !== false && localStorage.getItem('ilot_consent_analytics') !== null) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-center text-[#E5484D] shrink-0">
                    <Shield size={20} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                        Souveraineté & Observation
                    </h3>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                        L'Îlot observe les flux de la canopée pour améliorer son écosystème. Acceptes-tu l'illumination des analyses anonymes via GA4 ?
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleAccept}
                            className="flex-1 py-2.5 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-[10px] rounded-xl shadow-[0_0_15px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-1.5"
                        >
                            <Check size={14} /> Consentir
                        </button>
                        <button
                            onClick={handleDeny}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase text-[10px] rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                        >
                            <X size={14} /> Refuser
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}