import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/kompta/ledger/route';
import { LedgerEntryModel } from '@ilot/infrastructure';

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
}));

describe('GET /api/kompta/ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
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
    } as any);

    const req = new Request('http://localhost/api/kompta/ledger');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.summary.totalCredits).toBe(10);
    expect(json.data.summary.totalDebits).toBe(2.5);
    expect(json.data.summary.netBalance).toBe(7.5);
  });
});