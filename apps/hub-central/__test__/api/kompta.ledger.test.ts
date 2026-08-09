import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/kompta/ledger/route';
import { LedgerEntryModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    LedgerEntryModel: {
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn(),
    }
  };
});

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
}));

describe('GET /api/kompta/ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit retourner le grand livre et calculer les métriques exactes', async () => {
    const mockEntries = [
      { type: 'CREDIT', amountCents: 1000 },
      { type: 'DEBIT', amountCents: 250 },
    ];
    
    vi.mocked(LedgerEntryModel.find().sort().lean).mockResolvedValue(mockEntries as any);

    const req = new Request('http://localhost/api/kompta/ledger');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.summary.totalCredits).toBe(10);
    expect(json.data.summary.totalDebits).toBe(2.5);
    expect(json.data.summary.netBalance).toBe(7.5);
  });
});