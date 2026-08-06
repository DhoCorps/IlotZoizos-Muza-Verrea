import { useState } from 'react';
import { resonanceService } from '@ilot/infrastructure';
import { ResonanceType } from '@ilot/types';

export const useResonance = (targetSlug: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLink = async (action: 'WEAVE' | 'SEVER', type: ResonanceType, entityId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await resonanceService.toggleResonance({ targetSlug, action, type, entityId });
      return result; // Retourne { success, isHarmonic }
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { toggleLink, isLoading, error };
};