// apps/hub-central/hooks/useEmotionDigestion.ts
'use client';

import { useState, useEffect } from 'react';
import { SeveEngine } from '@ilot/shared-core';

interface UseEmotionDigestionProps {
    emotionalIntensity: number; // De 0 à 100
    currentAcceptance: number;  // De 1 à 10
}

export function useEmotionDigestion({ emotionalIntensity, currentAcceptance }: UseEmotionDigestionProps) {
    const [stasisDuration, setStasisDuration] = useState<number>(0);
    const [isStasisActive, setIsStasisActive] = useState<boolean>(false);

    useEffect(() => {
        // Calcul mathématique de la stase nécessaire
        const duration = SeveEngine.calculateStasisTime(emotionalIntensity, currentAcceptance);
        setStasisDuration(duration);

        // Seuil critique : si le besoin de stase dépasse 15 unités, l'Îlot enveloppe l'Oiseau
        if (duration > 15) {
            setIsStasisActive(true);
            console.log(`🌙 [Stase] Surcharge détectée (${duration} min de recul requis). L'Îlot bascule en Refuge Nocturne.`);
        } else {
            setIsStasisActive(false);
        }
    }, [emotionalIntensity, currentAcceptance]);

    return {
        stasisDuration,
        isStasisActive,
        // Permet à l'oiseau de briser manuellement la stase s'il se sent prêt
        breakStasis: () => setIsStasisActive(false)
    };
}