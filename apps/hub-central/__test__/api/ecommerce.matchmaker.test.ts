import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/ecommerce/barter/matchmaker/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockRun = vi.fn();
const mockClose = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: (...args: any[]) => mockRun(...args),
    close: (...args: any[]) => mockClose(...args)
  }))
}));

describe('API Ecommerce - Matchmaker (GET /api/ecommerce/barter/matchmaker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter l’accès si l’oiseau n’est pas identifié (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/barter/matchmaker');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('✅ doit retourner les correspondances harmoniques basées sur Neo4j', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-courant-1' }
    } as any);

    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => {
            if (key === 'matchUid') return 'oiseau-cible-2';
            if (key === 'matchPseudo') return 'ChanteurDesBois';
            if (key === 'itemsTheyHaveThatYouWant') return ['prod_1'];
            if (key === 'itemsYouHaveThatTheyWant') return ['prod_2'];
            return null;
          }
        }
      ]
    });

    const req = new Request('http://localhost:3000/api/ecommerce/barter/matchmaker');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.matches.length).toBe(1);
    expect(data.matches[0].matchPseudo).toBe('ChanteurDesBois');
    expect(mockClose).toHaveBeenCalled();
  });
});