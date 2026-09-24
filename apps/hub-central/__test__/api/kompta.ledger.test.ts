import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/kompta/ledger/route';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';
import * as cacheModule from '@/lib/cache/kompta.cache';

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
  handleRouteError: vi.fn(),
}));

// 🛡️ Mock du nouveau système de cache
vi.mock('@/lib/cache/kompta.cache', () => ({
  getCachedUserLedger: vi.fn()
}));

describe('GET /api/kompta/ledger - ERP & Fiscalité', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner le grand livre depuis la base (Cache Miss) et calculer les métriques ERP exactes', async () => {
    const mockEntries = [
      { type: 'CREDIT', amountCents: 1200, amountHTCents: 1000, taxCents: 200, feeCents: 50, counterpartyPseudo: 'ClientA' },
      { type: 'DEBIT', amountCents: 250 },
    ];
    
    // On simule une absence de cache
    vi.mocked(cacheModule.getCachedUserLedger).mockResolvedValue(null);

    // 🛡️ SUTURE CHIRURGICALE : On espionne .find() pour qu'il retourne directement l'objet chaîné simulé
    vi.spyOn(LedgerEntryModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEntries),
      }),
    } as unknown as ReturnType<typeof LedgerEntryModel.find>);

    const req = new NextRequest('http://localhost/api/kompta/ledger');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.summary.totalCredits).toBe(12);
    expect(json.data.summary.totalDebits).toBe(2.5);
    expect(json.data.summary.netBalance).toBe(9.5);
    
    // 🚀 Vérification des nouvelles métriques ERP / Fiscales
    expect(json.data.summary.totalHTCredits).toBe(10);
    expect(json.data.summary.totalTaxCollected).toBe(2);
    expect(json.data.summary.totalPlatformFees).toBe(0.5);
    expect(json.data.entries[0].counterpartyPseudo).toBe('ClientA');

    // Vérifie que la recherche s'effectue bien sur l'UID canonique de l'oiseau
    expect(LedgerEntryModel.find).toHaveBeenCalledWith({ ownerUid: 'bird_test_123' });
    expect(cacheModule.getCachedUserLedger).toHaveBeenCalledWith('bird_test_123');
  });

  it('🟢 doit retourner le grand livre depuis le Cache (Cache Hit) sans appeler la base de données', async () => {
    const mockCachedEntries = [
      { type: 'CREDIT', amountCents: 5000, amountHTCents: 5000, taxCents: 0, feeCents: 0 }
    ];

    // On simule un cache chaud
    vi.mocked(cacheModule.getCachedUserLedger).mockResolvedValue(mockCachedEntries);
    
    vi.spyOn(LedgerEntryModel, 'find');

    const req = new NextRequest('http://localhost/api/kompta/ledger');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.summary.totalCredits).toBe(50);
    expect(json.data.summary.totalHTCredits).toBe(50);
    
    // 🚀 La base de données n'est pas interrogée
    expect(LedgerEntryModel.find).not.toHaveBeenCalled();
    expect(cacheModule.getCachedUserLedger).toHaveBeenCalledWith('bird_test_123');
  });
});