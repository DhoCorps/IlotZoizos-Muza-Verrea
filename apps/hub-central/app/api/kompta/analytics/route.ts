export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { KomptaStatsEngine, MonthlyStatsOrchestrator, ERPFinancialStats, StoreTrafficStats } from '@ilot/shared-core';
import { getCachedKomptaAnalytics } from '@/lib/cache/kompta.cache';

// 🚀 NOUVEAU : On définit explicitement la structure complète du payload pour TypeScript
interface UnifiedAnalyticsData {
  revenue: ERPFinancialStats;
  traffic: StoreTrafficStats;
}

// ==========================================
// 📊 GET : Dashboard Analytique ERP (Strictement Privé / Aura + Cache)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const url = new URL(req.url);
    
    // 1. Extraction des paramètres ou Fallbacks intelligents
    let yearMonth = url.searchParams.get('yearMonth');
    // Si aucun UID de boutique n'est précisé, on suppose que le marchand gère sa boutique principale
    const storeUid = url.searchParams.get('storeUid') || currentUser.uid;

    // Fallback sur le mois courant si non spécifié
    if (!yearMonth) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      yearMonth = `${year}-${month}`;
    }

    // 2. Interrogation du Cache Chirurgical
    // 🛡️ CORRECTION : On force TypeScript à accepter que le résultat soit soit l'objet unifié, soit null
    let analyticsData: UnifiedAnalyticsData | null = (await getCachedKomptaAnalytics(currentUser.uid, storeUid, yearMonth)) as UnifiedAnalyticsData | null;

    // 3. Cache Miss : Recalcul via les Orchestrateurs
    if (!analyticsData) {
      const monthlyOrchestrator = new MonthlyStatsOrchestrator();

      // 🚀 Parallélisation massive des calculs ERP et de Trafic
      const [revenueStats, trafficStats] = await Promise.all([
        KomptaStatsEngine.aggregateFinancialStats(currentUser.uid, yearMonth),
        monthlyOrchestrator.getStoreTraffic(storeUid, yearMonth)
      ]);

      // L'assignation passe désormais sans erreur car le type de analyticsData l'autorise
      analyticsData = {
        revenue: revenueStats,
        traffic: trafficStats
      };
    }

    // 4. Retour du payload unifié
    return NextResponse.json({
      success: true,
      data: analyticsData
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KOMPTA ANALYTICS ERROR');
  }
});