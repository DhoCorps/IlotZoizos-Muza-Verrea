import { ResonanceType } from '@ilot/types';

interface ResonanceActionParams {
  targetSlug: string;
  action: 'WEAVE' | 'SEVER';
  type: ResonanceType;
  entityId?: string;
}

export const resonanceService = {
  /**
   * Modifie l'état de résonance (Abonnement/Désabonnement)
   */
  async toggleResonance({ targetSlug, action, type, entityId }: ResonanceActionParams) {
    const response = await fetch(`/api/users/${targetSlug}/resonance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, type, entityId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "La matrice a rejeté la connexion.");
    }

    return response.json();
  }
};