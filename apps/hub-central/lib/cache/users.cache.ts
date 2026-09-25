// Fichier : src/services/cache/users.cache.ts
import { unstable_cache } from 'next/cache';
import { connectToDatabase, OiseauModel } from "@ilot/infrastructure";
import { IOiseau } from '@ilot/types';
import { ObservatoryEngine } from '@ilot/shared-core';

interface LeanOiseauDocument extends Omit<IOiseau, 'emotionalIntensity' | 'entropieActive' | 'currentAcceptance'> {
  emotionalIntensity?: number;
  entropieActive?: number;
  currentAcceptance?: number;
  username?: string;
  [key: string]: unknown;
}

// Type pour les filtres de la volière publique (Rétrocompatible string ou objet RH)
export type OiseauSearchFilters = string | null | {
  search?: string | null;
  professionalStatus?: string;
  remotePreference?: string;
  maxRate?: number;
};

// -------------------------------------------------------------------------
// CACHE : La Volière Publique (Recensement & Filtres RH SSOT)
// -------------------------------------------------------------------------
export const getCachedOiseaux = unstable_cache(
  async (filters?: OiseauSearchFilters) => {
    await connectToDatabase();
    
    const query: Record<string, unknown> & {
      $or?: Array<Record<string, unknown>>;
    } = {};

    // Normalisation des arguments (supporte un string direct ou un objet de filtres avancés)
    const searchPhrase = typeof filters === 'string' ? filters : filters?.search;
    const professionalStatus = typeof filters === 'object' && filters !== null ? filters.professionalStatus : undefined;
    const remotePreference = typeof filters === 'object' && filters !== null ? filters.remotePreference : undefined;
    const maxRate = typeof filters === 'object' && filters !== null ? filters.maxRate : undefined;

    // 🔍 Filtre textuel (Recherche globale)
    if (searchPhrase) {
      query.$or = [
        { slug: { $regex: searchPhrase,$options: 'i' } },
        { pseudo: { $regex: searchPhrase,$options: 'i' } },
        { capabilities: { $regex: searchPhrase,$options: 'i' } }
      ];
    }

    // 💼 Filtres RH unifiés (SSOT cvProfile)
    if (professionalStatus) {
      query['cvProfile.professionalStatus'] = professionalStatus;
    }

    if (remotePreference) {
      query['cvProfile.remotePreference'] = remotePreference;
    }

    if (maxRate !== undefined) {
      // Le TJM est stocké en centimes dans la Silice
      query['cvProfile.freelanceDailyRateCents'] = { $lte: maxRate * 100 };
    }
    
    return await OiseauModel.find(query)
      .select('uid slug pseudo frequenceHEX capabilities signature cvProfile')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  },
  ['public-users-query'],
  {
    revalidate: 120,
    tags: ['users', 'voliere']
  }
);

// -------------------------------------------------------------------------
// CACHE CHIRURGICAL : Récupération d'un profil spécifique
// ---------------------------------------------------------
export const getCachedOiseau = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      return await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as IOiseau | null;
    },
    [`user-profile-${targetSlug}`],
    {
      revalidate: 60,
      tags: ['users', 'profile', `profile-${targetSlug}`]
    }
  )();
};

// -------------------------------------------------------------------------
// CACHE : Récupération du Profil ET Calcul de l'Observatoire
// -------------------------------------------------------------------------
export const getCachedObservatoryReport = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const userProfile = (await OiseauModel.findOne({
         $or: [{ slug: targetSlug }, { uid: targetSlug }]
       }).lean()) as LeanOiseauDocument | null;
       
      if (!userProfile) return null;
      
      const observatoryData = {
        dependencies: [
          { id: 'dep-1', status: 1 },
          { id: 'dep-2', status: 1 }
        ],
        tasks: [
          { estimatedTime: 30, realTime: 25, weight: 3 },
          { estimatedTime: 60, realTime: 60, weight: 5 }
        ],
        exchanges: [
          { type: 'GIFT' as const, value: 40 },
          { type: 'TAKE' as const, value: 15 }
        ],
        emotionalIntensity: userProfile.emotionalIntensity || userProfile.entropieActive || 45,
        currentAcceptance: userProfile.currentAcceptance || 3
      };
      
      const report = ObservatoryEngine.generateReport(observatoryData);
      const birdName = userProfile.pseudo || userProfile.username || `Oiseau_${targetSlug.slice(-4)}`;
      
      return { birdName, report };
    },
    [`observatory-report-${targetSlug}`],
    {
       revalidate: 60,
       tags: ['observatory', `profile-${targetSlug}`]
    }
  )();
};