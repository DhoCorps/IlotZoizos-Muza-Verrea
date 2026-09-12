// Fichier : src/services/cache/users.cache.ts
import { unstable_cache } from 'next/cache';
import { connectToDatabase, OiseauModel } from "@ilot/infrastructure";
import { IOiseau } from '@ilot/types';
import { ObservatoryEngine } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// CACHE : La Volière Publique (Recensement)
// -------------------------------------------------------------------------
export const getCachedOiseaux = unstable_cache(
  async (searchPhrase: string | null) => {
    await connectToDatabase();
    
    let query: Record<string, any> = {};
    if (searchPhrase) {
      query.$or = [
        { slug: { $regex: searchPhrase, $options: 'i' } },
        { pseudo: { $regex: searchPhrase, $options: 'i' } },
        { capabilities: { $regex: searchPhrase, $options: 'i' } }
      ];
    }
    
    return await OiseauModel.find(query)
      .select('uid slug pseudo frequenceHEX capabilities signature')
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
// -------------------------------------------------------------------------
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
  )(); // Exécution immédiate encapsulée
};

// -------------------------------------------------------------------------
// CACHE : Récupération du Profil ET Calcul de l'Observatoire
// -------------------------------------------------------------------------
export const getCachedObservatoryReport = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const userProfile = await OiseauModel.findOne({
         $or: [{ slug: targetSlug }, { uid: targetSlug }]
       }).lean() as any;
       
      if (!userProfile) return null;
      
      // Synthèse de la Sève
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