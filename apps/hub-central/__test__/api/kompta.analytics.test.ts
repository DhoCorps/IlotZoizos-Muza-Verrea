import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/kompta/analytics/route';
import { NextRequest } from 'next/server';
import { KomptaStatsEngine, MonthlyStatsOrchestrator } from '@ilot/shared-core';
import * as cacheModule from '@/lib/cache/kompta.cache';

// 🛡️ Mock des gardiens d'API
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return handler(req, context, { uid: 'bird_marchand_123', capabilities: ['*'] });
  },
  handleRouteError: vi.fn((err) => new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 })),
}));

// 🛡️ Mock des orchestrateurs
vi.mock('@ilot/shared-core', () => ({
  KomptaStatsEngine: {
    aggregateFinancialStats: vi.fn(),
  },
  MonthlyStatsOrchestrator: vi.fn().mockImplementation(() => ({
    getStoreTraffic: vi.fn(),
  })),
}));

// 🛡️ Mock du Cache
vi.mock('@/lib/cache/kompta.cache', () => ({
  getCachedKomptaAnalytics: vi.fn()
}));

describe('GET /api/kompta/analytics - ERP Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner un payload unifié avec les revenus et le trafic depuis les orchestrateurs (Cache Miss)', async () => {
    vi.mocked(cacheModule.getCachedKomptaAnalytics).mockResolvedValue(null); // Force Cache Miss

    const mockRevenue = {
      yearMonth: '2026-08',
      caTTC: 2400,
      caHT: 2000,
      tvaCollected: 400,
      platformFees: 100,
      netMargin: 1900,
      transactionCount: 2
    };

    const mockTraffic = {
      storeUid: 'store_123',
      yearMonth: '2026-08',
      dailyTraffic: [{ date: '2026-08-01', visitors: 10, pageViews: 25 }],
      historicalMonthlyTraffic: [{ date: '2026-07', visitors: 150, pageViews: 400 }]
    };

    vi.mocked(KomptaStatsEngine.aggregateFinancialStats).mockResolvedValue(mockRevenue);
    
    const mockGetStoreTraffic = vi.fn().mockResolvedValue(mockTraffic);
    vi.mocked(MonthlyStatsOrchestrator).mockImplementation(() => ({
      getStoreTraffic: mockGetStoreTraffic,
    }) as any);

    const req = new NextRequest('http://localhost/api/kompta/analytics?yearMonth=2026-08&storeUid=store_123');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    
    // Vérification de l'unification des données
    expect(json.data.revenue).toEqual(mockRevenue);
    expect(json.data.traffic).toEqual(mockTraffic);

    // Vérification des appels
    expect(KomptaStatsEngine.aggregateFinancialStats).toHaveBeenCalledWith('bird_marchand_123', '2026-08');
    expect(mockGetStoreTraffic).toHaveBeenCalledWith('store_123', '2026-08');
  });

  it('🟢 doit utiliser le mois courant et l\'uid de l\'utilisateur si aucun paramètre n\'est fourni', async () => {
    vi.mocked(cacheModule.getCachedKomptaAnalytics).mockResolvedValue(null);

    // Simulation pour la date courante (pour tester le fallback dynamique)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));

    const mockGetStoreTraffic = vi.fn().mockResolvedValue({});
    vi.mocked(MonthlyStatsOrchestrator).mockImplementation(() => ({
      getStoreTraffic: mockGetStoreTraffic,
    }) as any);

    const req = new NextRequest('http://localhost/api/kompta/analytics');
    const res = await GET(req, { params: Promise.resolve({}) });
    
    expect(res.status).toBe(200);
    
    // Vérifie les fallbacks (yearMonth = YYYY-MM actuel, storeUid = currentUser.uid)
    expect(KomptaStatsEngine.aggregateFinancialStats).toHaveBeenCalledWith('bird_marchand_123', '2026-09');
    expect(mockGetStoreTraffic).toHaveBeenCalledWith('bird_marchand_123', '2026-09');

    vi.useRealTimers();
  });

  it('🟢 doit retourner les données directement depuis le cache (Cache Hit) sans solliciter les orchestrateurs', async () => {
    const mockCachedData = {
      revenue: { caTTC: 5000, netMargin: 4500 },
      traffic: { dailyTraffic: [] }
    };

    // Simulation d'un Cache Hit
    vi.mocked(cacheModule.getCachedKomptaAnalytics).mockResolvedValue(mockCachedData as any);
    
    const mockGetStoreTraffic = vi.fn();
    vi.mocked(MonthlyStatsOrchestrator).mockImplementation(() => ({
      getStoreTraffic: mockGetStoreTraffic,
    }) as any);

    const req = new NextRequest('http://localhost/api/kompta/analytics?yearMonth=2026-08');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(mockCachedData);

    // 🚀 Les orchestrateurs lourds ne doivent pas être appelés
    expect(KomptaStatsEngine.aggregateFinancialStats).not.toHaveBeenCalled();
    expect(mockGetStoreTraffic).not.toHaveBeenCalled();
  });
});