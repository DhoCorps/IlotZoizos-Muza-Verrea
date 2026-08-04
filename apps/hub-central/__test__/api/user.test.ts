// apps/hub-central/__test__/api/user.test.ts
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// 🛡️ 1. MOCK DE LA DOUANE (NextAuth)
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. MOCK DE LA SILICE (Modèles & Mongoose)
vi.mock("@ilot/infrastructure/src/database/models/nosql/user.model", () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(), // 🪡 LA SUTURE EST ICI
    findOneAndDelete: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird-123' })
    }),
  },
}));

vi.mock("@ilot/infrastructure/src/database/models/nosql/team.model", () => ({
  TeamModel: {
    find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockResolvedValue({ uid: 'team-6454f14d', ownerUid: 'autre-oiseau' }),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteMany: vi.fn()
  },
}));

vi.mock("@ilot/infrastructure/src/database/models/nosql/project.model", () => ({
  ProjectModel: {
    find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }),
    deleteMany: vi.fn()
  },
}));

vi.mock("@ilot/infrastructure/src/database/models/nosql/task.model", () => ({
  TaskModel: {
    deleteMany: vi.fn(),
    updateMany: vi.fn()
  },
}));

// 🛡️ 3. MOCK DU TRANSACTION MANAGER (Harmonisé avec exileOiseau)
vi.mock('../../../packages/shared-core/src/sync-engine/transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = { 
        run: vi.fn().mockImplementation((query) => {
          // On retourne une structure conforme pour countFound / deletedCount
          return Promise.resolve({ 
            records: [{ get: () => ({ toNumber: () => 1 }) }] 
          });
        }) 
      };
      return await callback(null as any, mockNeo4jTx as any);
    })
  }
}));

// 🛡️ 4. INGESTION DU COMPOSANT API NETTOYÉ
import { POST as LEAVE_SANCTUARY } from '../../app/api/users/[slug]/actions/leave/route';
import { getServerSession } from "next-auth/next";

describe("Souveraineté : L'Exil de l'Oiseau (Départ)", () => {
  const mockId = 'mongo-id-123';
  const mockUid = 'bird-123';
  const mockTeamUid = 'team-6454f14d';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("❌ doit interdire l'exil si l'Oiseau n'est pas connecté (Pas d'ID)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { 
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN', teamId: mockTeamUid })
    });
    
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    expect(res.status).toBe(401);
  });

  it("✅ doit déclencher la procedure d'exil avec Signature si l'Oiseau est souverain", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { id: mockId, uid: mockUid, capabilities: [] } 
    } as any);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { 
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN', teamId: mockTeamUid })
    });
    
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    
    // Si res.status est 500, c'est que l'orchestrateur a lancé une exception non gérée
    expect(res.status).toBe(200);
  });

  it("❌ doit interdire l'exil si un Oiseau tente d'en exiler un autre (403)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { id: 'intrus-id', uid: 'intrus-uid', capabilities: [] } 
    } as any);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { 
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN', teamId: mockTeamUid })
    });
    
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    
    expect(res.status).toBe(403);
  });
});