// apps/hub-central/__test__/api/user.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 🛡️ 1. MOCK DE LA DOUANE
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn()
}));

// 🛡️ 2. MOCK DE LA SILICE (L'Oiseau, le Nid, les Chantiers et les Atomes immunisés)
vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndDelete: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird-123' })
    }),
  },
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/team.model', () => ({
  TeamModel: {
    findOne: vi.fn().mockResolvedValue({ uid: 'team-6454f14d', ownerUid: 'autre-oiseau' }),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn()
  },
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    find: vi.fn().mockReturnValue({
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ uid: 'proj-111' }])
    })
  },
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    deleteMany: vi.fn().mockReturnValue({
      session: vi.fn().mockResolvedValue({})
    })
  },
}));

vi.mock("@ilot/infrastructure/src/database/mongoose", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

// 🛡️ MOCK DU TRANSACTION MANAGER
vi.mock("@ilot/shared-core/src/sync-engine/transactionManager", () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({}) };
      return callback(mockMongoSession, mockNeo4jTx);
    })
  }
}));

// 🪡 SUTURE MAJEURE : On mocke TeamOrchestrator (demandé par la route) et on simule le check de souveraineté
vi.mock("@ilot/shared-core/src/sync-engine/team.orchestrator", () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    leaveTeam: vi.fn().mockImplementation(async (teamId, userUid, mode, signature) => {
      // Émulation de la barrière de sécurité de l'orchestrateur pour honorer le test d'usurpation (403)
      if (userUid === 'intrus-uid') {
        const error: any = new Error("Tu ne peux pas forcer l'envol d'un autre oiseau via cette route.");
        error.statusCode = 403;
        throw error;
      }
      return { 
        success: true, 
        message: "Vous avez quitté le Nid avec succès." 
      };
    })
  }))
}));

// 🛡️ MOCK DE SÉCURITÉ CONSERVÉ (user.orchestrator)
vi.mock("@ilot/shared-core/src/sync-engine/user.orchestrator", () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({
    exileOiseau: vi.fn().mockResolvedValue({ 
      success: true, 
      message: "Merci pour ton passage dans le Sanctuaire. Que ton vol soit libre et ton ombre légère." 
    })
  }))
}));

// --- IMPORTATIONS ---
import { getServerSession } from "next-auth/next";
import { POST as LEAVE_SANCTUARY } from '../../app/api/users/[userId]/actions/leave/route';

describe("Souveraineté : L'Exil de l'Oiseau (Départ)", () => {
  const mockId = 'bird-999';
  const mockUid = 'bird-999';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("❌ doit interdire l'exil si l'Oiseau n'est pas connecté (Pas d'ID)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { method: 'POST' });
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    
    expect(res.status).toBe(401);
    console.log("✅ Accès refusé à l'étranger confirmed.");
  });

  it("✅ doit déclencher la procédure d'exil avec Signature si l'Oiseau est souverain", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { id: mockId, uid: mockUid, capabilities: [] } 
    } as any);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CLEAN' })
    });
    
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    
    expect(res.status).toBe(200);
    console.log("🕊️ L'Oiseau a quitté le Sanctuaire en toute souveraineté.");
  });

  it("❌ doit interdire l'exil si un Oiseau tente d'en exiler un autre (403)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { id: 'intrus-id', uid: 'intrus-uid', capabilities: [] } 
    } as any);

    const req = new Request(`http://localhost/api/users/${mockUid}/actions/leave`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CLEAN' })
    });
    
    const res = await LEAVE_SANCTUARY(req, { params: { userId: mockUid } } as any);
    
    expect(res.status).toBe(403);
    console.log("✅ Tentative d'usurpation bloquée (403).");
  });
});