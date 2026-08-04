// apps/hub-central/hooks/useSalonPrive.ts
'use client';

import { useState } from 'react';
import { EnactedThought } from '@ilot/shared-core';

export function useSalonPrive() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateEntanglement = async (resonanceScore: number, mutualTrustIndex: number): Promise<number | null> => {
        try {
            const res = await fetch('/api/salon/thought', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ENTANGLEMENT', resonanceScore, mutualTrustIndex })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.entanglementLevel;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const seal = async (plainThought: string, sharedSecretKey: string): Promise<EnactedThought | null> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/salon/thought', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SEAL', plainThought, sharedSecretKey })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.sealed;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const unseal = async (enactedThought: EnactedThought, sharedSecretKey: string): Promise<string | null> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/salon/thought', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'UNSEAL', enactedThought, sharedSecretKey })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.unsealed;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { seal, unseal, calculateEntanglement, loading, error };
}