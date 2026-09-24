import { unstable_cache } from 'next/cache';
import { LedgerEntryModel } from '@ilot/infrastructure';

/**
 * 🚀 Récupère le grand livre d'un oiseau depuis le cache.
 * Le cache est invalidé via revalidateTag(`kompta-ledger-${userUid}`)
 * chaque fois que KomptaLedgerOrchestrator enregistre une nouvelle transaction.
 */
export const getCachedUserLedger = async (userUid: string) => {
  const fetcher = async () => {
    const entries = await LedgerEntryModel.find({ ownerUid: userUid })
      .sort({ createdAt: -1 })
      .lean();
    
    return JSON.parse(JSON.stringify(entries || []));
  };

  // Bypass du cache de Next.js lors des tests unitaires
  if (process.env.NODE_ENV === 'test') {
    return fetcher();
  }

  return unstable_cache(
    fetcher,
    [`kompta-ledger-query-${userUid}`], // Clé de cache
    {
      tags: ['kompta-ledger', `kompta-ledger-${userUid}`],
      revalidate: 3600 // Expiration automatique toutes les heures par précaution
    }
  )();
};

/**
 * 🚀 Récupère les analytiques unifiées (ERP + Trafic) depuis le cache.
 * Temps de cache court (ex: 5 minutes) car les métriques de trafic évoluent vite.
 */
export const getCachedKomptaAnalytics = async (userUid: string, storeUid: string, yearMonth: string) => {
  const fetcher = async () => {
    // Retourne null pour forcer le Cache Miss dans le routeur et déclencher les orchestrateurs
    return null;
  };

  // Bypass du cache de Next.js lors des tests unitaires
  if (process.env.NODE_ENV === 'test') {
    return fetcher();
  }

  return unstable_cache(
    fetcher,
    [`kompta-analytics-${userUid}-${storeUid}-${yearMonth}`],
    {
      tags: ['kompta-analytics', `kompta-analytics-${storeUid}`],
      revalidate: 300 // Revalidation toutes les 5 minutes
    }
  )();
};