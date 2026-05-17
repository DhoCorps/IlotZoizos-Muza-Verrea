// apps/hub-central/__test__/api/users.test.ts
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// 🛡️ 1. MOCK DE LA DOUANE (NextAuth)
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. MOCK DE LA SILICE (Modèles & Mongoose)
// On utilise les chemins EXACTS de route.ts pour stopper les fuites
vi.mock("@ilot/infrastructure/src/database/mongoose", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@ilot/infrastructure/src/database/models/nosql/user.model", () => ({
  OiseauModel: {
    find: vi.fn(),
  },
}));

// --- IMPORTATIONS (Après les mocks) ---
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from "@ilot/infrastructure/src/database/models/nosql/user.model";
import { GET } from '../../app/api/users/route';

describe('La Volière Publique (GET /api/users)', () => {
  
  // Objet de requête fictif pour simuler le chaînage .limit().lean()
  const mockQuery = {
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
    // 🪡 SUTURE : Suppression du 's' parasite -> mockReturnValue
    vi.mocked(getServerSession).mockReturnValue(null as any);

    const req = new Request('http://localhost/api/users');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toMatch(/Garde-frontière|non autorisé|session/i);
    expect(OiseauModel.find).not.toHaveBeenCalled();
    console.log("✅ Étranger repoussé dans le Néant.");
  });

  it('✅ doive filtrer les Oiseaux par Pseudo ou Aura (La Résonance)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird-1' } } as any);

    const mockOiseaux = [
      { uid: 'u1', pseudo: 'Zoizo_Libre', frequenceHEX: '#E5484D' },
      { uid: 'u2', pseudo: 'Zoizo_De_Sève', frequenceHEX: '#2F4F4F' },
    ];
    // On simule le retour de lean()
    mockQuery.lean.mockResolvedValue(mockOiseaux);

    const req = new Request('http://localhost/api/users?search=Libre');
    const response = await GET(req);
    const data = await response.json();

    // Vérification du Panoptique : Pseudo et FrequenceHEX
    expect(OiseauModel.find).toHaveBeenCalledWith({
      $or: [
        { pseudo: { $regex: 'Libre', $options: 'i' } },
        { frequenceHEX: { $regex: 'Libre', $options: 'i' } },
      ],
    });
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(data.results.length).toBe(2);
    console.log("🔍 Recensement filtré confirmed.");
  });

  it('✅ doive permettre un recensement limité si la recherche est vide', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird-1' } } as any);
    mockQuery.lean.mockResolvedValue([{ uid: 'u1', pseudo: 'Zoizo_1069' }]);

    const req = new Request('http://localhost/api/users');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(OiseauModel.find).toHaveBeenCalledWith({});
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    console.log("🧹 Volière panoptique confirmée.");
  });
});