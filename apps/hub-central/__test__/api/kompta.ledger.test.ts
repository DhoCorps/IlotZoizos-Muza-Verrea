import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/kompta/ledger/route';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
}));

describe('GET /api/kompta/ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit retourner le grand livre et calculer les métriques exactes', async () => {
    const mockEntries = [
      { type: 'CREDIT', amountCents: 1000 },
      { type: 'DEBIT', amountCents: 250 },
    ];
    
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
    expect(json.data.summary.totalCredits).toBe(10);
    expect(json.data.summary.totalDebits).toBe(2.5);
    expect(json.data.summary.netBalance).toBe(7.5);
    
    // Vérifie que la recherche s'effectue bien sur le nouvel UID canonique de l'oiseau
    expect(LedgerEntryModel.find).toHaveBeenCalledWith({ ownerUid: 'bird_test_123' });
  });
});