// apps/hub-central/components/observatory/ObservatoryContainer.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ObservatoryDashboard } from './ObservatoryDashboard';
import { VibratoryReport } from '@ilot/shared-core';

interface ObservatoryContainerProps {
    userId: string;
}

export const ObservatoryContainer: React.FC<ObservatoryContainerProps> = ({ userId }) => {
    const [report, setReport] = useState<VibratoryReport | null>(null);
    const [birdName, setBirdName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchObservatoryData() {
            try {
                setLoading(true);
                const res = await fetch(`/api/users/${userId}/observatory`);
                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.error || "Impossible d'écouter la fréquence de l'Oiseau.");
                }

                setReport(data.report);
                setBirdName(data.birdName);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (userId) {
            fetchObservatoryData();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="p-6 bg-[#1a2129] border border-[#3a4654] rounded-xl text-slate-400 text-center animate-pulse">
                🔬 Auscultation de la sève et des résonances en cours...
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="p-6 bg-rose-950/30 border border-rose-900 rounded-xl text-rose-300 text-center">
                ⚠️ Interférence dans le flux : {error || "Aucun rapport vibratoire disponible."}
            </div>
        );
    }

    return <ObservatoryDashboard report={report} birdName={birdName} />;
};