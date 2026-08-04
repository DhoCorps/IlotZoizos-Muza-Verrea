// apps/hub-central/components/VisualFilterProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface VisualFilterContextType {
    globalPulsation: number;
    themeMode: 'ecological-grey' | 'stasis-red';
}

const VisualFilterContext = createContext<VisualFilterContextType>({
    globalPulsation: 50,
    themeMode: 'ecological-grey',
});

export const VisualFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [globalPulsation, setGlobalPulsation] = useState<number>(50);
    const [themeMode, setThemeMode] = useState<'ecological-grey' | 'stasis-red'>('ecological-grey');

    useEffect(() => {
        // Simulation ou appel au service backend Node.js pour récupérer le Pg de la volière
        const fetchEcosystemPulse = async () => {
            try {
                // const res = await fetch('/api/ecosystem/pulse');
                // const data = await res.json();
                // setGlobalPulsation(data.pulsation);

                // Valeur simulée pour l'harmonie de l'Îlot
                const simulatedPulse = 65; 
                setGlobalPulsation(simulatedPulse);

                if (simulatedPulse < 30) {
                    setThemeMode('stasis-red');
                    document.documentElement.style.setProperty('--bg-primary', '#1a0507');
                    document.documentElement.style.setProperty('--accent-color', '#e11d48');
                    document.documentElement.style.setProperty('--filter-saturation', '0.8');
                } else {
                    setThemeMode('ecological-grey');
                    document.documentElement.style.setProperty('--bg-primary', '#11161d'); // Gris-bleuté écologique
                    document.documentElement.style.setProperty('--accent-color', '#38bdf8');
                    document.documentElement.style.setProperty('--filter-saturation', '1');
                }
            } catch (err) {
                console.error("⚠️ Impossible de synchroniser la pulsation visuelle de l'Îlot:", err);
            }
        };

        fetchEcosystemPulse();
        const interval = setInterval(fetchEcosystemPulse, 60000); // Synchronisation chaque minute
        return () => clearInterval(interval);
    }, []);

    return (
        <VisualFilterContext.Provider value={{ globalPulsation, themeMode }}>
            <div className="transition-colors duration-1000 min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {children}
            </div>
        </VisualFilterContext.Provider>
    );
};

export const useVisualFilter = () => useContext(VisualFilterContext);