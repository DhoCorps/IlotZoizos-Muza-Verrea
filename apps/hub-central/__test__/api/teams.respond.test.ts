import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/teams/[slug]/respond/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOneLean = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  TeamModel: {
    findOne: vi.fn().mockImplementation(() => ({
      lean: mockFindOneLean
    }))
  },
  OiseauModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue(true)
  },
  ProjectModel: {
    find: vi.fn().mockImplementation(() => ({
      session: vi.fn().mockImplementation(() => ({ lean: vi.fn().mockResolvedValue([]) }))
    }))
  },
  TaskModel: {
    deleteMany: vi.fn().mockResolvedValue(true),
    updateMany: vi.fn().mockResolvedValue(true)
  },
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue({
      records: [{ get: () => ['team:read'] }]
    }),
    close: vi.fn()
  }))
}));

const mockNeo4jTxRun = vi.fn().mockResolvedValue({ records: [1] });
const mockTransactionManagerExecute = vi.fn().mockImplementation(async (name, callback) => {
  return await callback({}, { run: mockNeo4jTxRun });
});

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: (...args: any[]) => mockTransactionManagerExecute(...args)
  }
}));

describe('API Teams - Réponse au Pacte / Respond (/api/teams/[slug]/respond)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('🔴 doit rejeter si l’action est invalide ou manquante (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_1' }
    } as any);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVALID_ACTION' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Mouvement invalide");
  });

  it('🔴 doit renvoyer 404 si le Nid est introuvable', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_1' }
    } as any);

    mockFindOneLean.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("volatilisé");
  });

  it('🟢 doit accepter le pacte avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_1' }
    } as any);

    mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1', name: 'Escouade Alpha' });

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Pacte signé");
    expect(mockTransactionManagerExecute).toHaveBeenCalled();
  });

  it('🟢 doit refuser et purger le pacte avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_1' }
    } as any);

    mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1', name: 'Escouade Alpha' });

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'PURGE_REFUSE' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("intégralement nettoyées");
    expect(mockTransactionManagerExecute).toHaveBeenCalled();
  });
});