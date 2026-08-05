// apps/hub-central/__test__/api/users.test.ts
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// 🛡️ 1. MOCK DE LA DOUANE (NextAuth)
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. MOCK DE LA SILICE (Modèles & Mongoose)
vi.mock("@ilot/infrastructure/src/database/mongoose", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@ilot/infrastructure/src/database/models/nosql/user.model", () => ({
  OiseauModel: {
    find: vi.fn(),
  },
}));

// 🕸️ 3. MOCK DU GRAPHE (Neo4j)
vi.mock("@ilot/infrastructure/src/database/neo4j", () => ({
  readFromGraph: vi.fn(),
}));

// --- IMPORTATIONS (Après les mocks) ---
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from "@ilot/infrastructure/src/database/models/nosql/user.model";
import { readFromGraph } from "@ilot/infrastructure/src/database/neo4j";
import { GET } from '../../app/api/users/route';

describe('La Volière Publique (GET /api/users)', () => {
  
  // Objet de requête fictif pour simuler le chaînage .select().limit().lean()
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  };

  beforeAll(() => {
    console.log("🐘 Sanctuaire API audit.");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // On réinitialise le comportement du find()
    vi.mocked(OiseauModel.find).mockReturnValue(mockQuery as any);
  });

  afterAll(() => {
    console.log("🧹 Sanctuaire api refermé.");
  });

  it('✅ doive repousser les étrangers (sans session) de la volière', async () => {
    vi.mocked(getServerSession).mockReturnValue(null as any);

    const req = new Request('http://localhost/api/users');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toMatch(/Garde-frontière|non autorisé|session/i);
    expect(OiseauModel.find).not.toHaveBeenCalled();
    console.log("✅ Étranger repoussé dans le Néant.");
  });

  it('✅ doive filtrer les Oiseaux et exclure les données sensibles (select -password -email)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird-1' } } as any);

    const mockOiseaux = [
      { uid: 'u1', pseudo: 'Zoizo_Libre', frequenceHEX: '#E5484D' },
      { uid: 'u2', pseudo: 'Zoizo_De_Sève', frequenceHEX: '#2F4F4F' },
    ];
    mockQuery.lean.mockResolvedValue(mockOiseaux);

    const req = new Request('http://localhost/api/users?search=Libre');
    const response = await GET(req);
    const data = await response.json();

    // Vérification du Panoptique : Pseudo, FrequenceHEX et UID
    expect(OiseauModel.find).toHaveBeenCalledWith({
      $or: [
        { pseudo: { $regex: 'Libre', $options: 'i' } },
        { frequenceHEX: { $regex: 'Libre', $options: 'i' } },
        { uid: 'Libre' } // Ajout récent de la route
      ],
    });
    // Vérification du niveau de sécurité (select)
    expect(mockQuery.select).toHaveBeenCalledWith('-password -email');
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(data.results.length).toBe(2);
    // Vérifier qu'il n'y a pas eu d'appel à Neo4j (puisque withResonance n'est pas passé)
    expect(readFromGraph).not.toHaveBeenCalled();
    console.log("🔍 Recensement filtré et sécurisé confirmed.");
  });

  it('✅ doive enrichir les données Mongo avec la Résonance Neo4j si l\'option withResonance est vraie', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird-1' } } as any);
    
    // Mocks des données Mongo
    const mockOiseaux = [
      { uid: 'u1', pseudo: 'Zoizo_1' },
      { uid: 'u2', pseudo: 'Zoizo_2' }
    ];
    mockQuery.lean.mockResolvedValue(mockOiseaux);

    // Mocks des données Neo4j
    const mockGraphRecords = [
      { uid: 'u1', resonanceCount: 42 },
      { uid: 'u2', resonanceCount: 0 }
    ];
    vi.mocked(readFromGraph).mockResolvedValue(mockGraphRecords);

    // L'URL contient withResonance=true
    const req = new Request('http://localhost/api/users?withResonance=true');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // L'appel à Neo4j a dû se faire avec les uids des oiseaux trouvés
    expect(readFromGraph).toHaveBeenCalledTimes(1);
    expect(readFromGraph).toHaveBeenCalledWith(expect.any(String), { uids: ['u1', 'u2'] });

    // Vérifier que la donnée fusionnée est correcte
    expect(data.results[0].resonance).toBe(42);
    expect(data.results[1].resonance).toBe(0);
    
    console.log("🕸️ Double lecture Mongo/Neo4j confirmée.");
  });

  it('✅ doive permettre un recensement limité si la recherche est vide', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird-1' } } as any);
    mockQuery.lean.mockResolvedValue([{ uid: 'u1', pseudo: 'Zoizo_1069' }]);

    const req = new Request('http://localhost/api/users');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(OiseauModel.find).toHaveBeenCalledWith({});
    expect(mockQuery.select).toHaveBeenCalledWith('-password -email');
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    console.log("🧹 Volière panoptique confirmée.");
  });
});