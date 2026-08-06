import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/users/recruitable/route';
import { getServerSession } from 'next-auth/next';

const mocks = vi.hoisted(() => {
  const mockFindLeanFn = vi.fn();
  const mockFindChainingFn = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: mockFindLeanFn
  }));
  return {
    mockFindLean: mockFindLeanFn, mockFindChaining: mockFindChainingFn, mockConnectToDatabase: vi.fn().mockResolvedValue(true),
    mockNeo4jRun: vi.fn().mockResolvedValue({ records: [] }), mockOiseauModel: { find: mockFindChainingFn }
  };
});

const { mockFindLean, mockFindChaining, mockConnectToDatabase, mockNeo4jRun } = mocks;

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mocks.mockConnectToDatabase, OiseauModel: mocks.mockOiseauModel,
  getNeo4jSession: vi.fn().mockImplementation(() => ({ run: mocks.mockNeo4jRun, close: vi.fn() }))
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({ OiseauModel: mocks.mockOiseauModel }));

describe('API Users - Recrutables pour un Nid (/api/users/recruitable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockNeo4jRun.mockResolvedValue({ records: [] }); // Par défaut, Neo4j ne trouve personne
    mockFindLean.mockResolvedValue([]);
  });

  it('🔴 doit repousser les étrangers non identifiés (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/users/recruitable?teamSlug=nid-alpha');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('invisible aux étrangers');
  });

  it('🔴 doit rejeter si le teamSlug manque à l’appel (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);

    const req = new Request('http://localhost/api/users/recruitable?search=artisan'); // Manque teamSlug
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('teamSlug est requis');
  });

  it('🔥 doit gérer une rupture du Graphe Neo4j avec élégance (500)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);
    mockNeo4jRun.mockRejectedValueOnce(new Error("Neo4j déconnecté"));

    const req = new Request('http://localhost/api/users/recruitable?teamSlug=nid-alpha');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Graphe est momentanément muet');
  });

  it('🟢 doit lister les Oiseaux recrutables en excluant ceux déjà dans le Nid (200)', async () => {
    // Le visiteur actuel
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);
    
    // Neo4j renvoie qu'un Oiseau est DÉJÀ dans le Nid (bird_2)
    mockNeo4jRun.mockResolvedValueOnce({
      records: [
        { get: () => 'bird_2' } // bird_2 est déjà membre
      ]
    });

    mockFindLean.mockResolvedValueOnce([
      { uid: 'bird_3', slug: 'artisan-3', pseudo: 'Artisan Nouveau' }
    ]);

    const req = new Request('http://localhost/api/users/recruitable?teamSlug=nid-alpha&search=Artisan');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].slug).toBe('artisan-3');

    // On vérifie que la requête Mongoose contient bien le filtre `$nin` (Not In)
    // avec le currentUser (bird_1) et le membre existant (bird_2)
    expect(mockFindChaining).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: { $nin: ['bird_1', 'bird_2'] },
        $or: [
          { slug: { $regex: 'Artisan', $options: 'i' } },
          { pseudo: { $regex: 'Artisan', $options: 'i' } },
          { capabilities: { $regex: 'Artisan', $options: 'i' } }
        ]
      })
    );
  });
});