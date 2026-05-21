// packages/shared-core/src/sync-engine/__tests__/task.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';

// 🛡️ SUTURE 1 : Mock des modèles Silice (MongoDB)
vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    // findOne est attendu directement par un await sans .lean() ici
    findOne: vi.fn().mockResolvedValue({ 
      uid: 'proj_123', 
      creatorUid: 'bird_sigma',
      ownerUid: 'team_nexus' 
    })
  }
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    create: vi.fn().mockImplementation((data) => {
      const doc = Array.isArray(data) ? data[0] : data;
      // 🪡 SUTURE : Simulation du .toObject() appelé dans fosterTask
      return Promise.resolve([{ 
        toObject: () => ({ ...doc, _id: 'mongo_id_789', documents: [] }) 
      }]); 
    }),
    findOneAndUpdate: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({ uid: 'task_789', content: { title: 'Mutation OK' }, documents: [] });
      m.lean = vi.fn().mockResolvedValue({ uid: 'task_789', content: { title: 'Mutation OK' }, documents: [] });
      return m;
    }),
    findOneAndDelete: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({ uid: 'task_789' });
      m.lean = vi.fn().mockResolvedValue({ uid: 'task_789' });
      return m;
    }),
    findOne: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({ uid: 'task_789', documents: [] });
      m.session = vi.fn().mockResolvedValue({ uid: 'task_789', documents: [] });
      return m;
    }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 })
  }
}));

// Mock du storageService pour éviter les appels R2/S3
vi.mock('../../../../../apps/hub-central/modules/storage/storage.service', () => ({
  storageService: {
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

// 🛡️ SUTURE 2 : Mock global du TransactionManager avec contrôle de l'Aura
let mockCaps: string[] = [CAPABILITIES.TASK.CREATE];
const mockNeo4jRun = vi.fn();

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = {
        run: mockNeo4jRun.mockImplementation((query) => {
          if (query.includes('AS allCaps')) {
            return Promise.resolve({ records: [{ get: () => mockCaps }] });
          }
          if (query.includes('RETURN collect(child.uid) AS childUids')) {
            return Promise.resolve({ records: [{ get: () => [] }] });
          }
          return Promise.resolve({ records: [] });
        })
      };
      return callback(null as any, mockNeo4jTx as any);
    })
  }
}));

describe("TaskOrchestrator - Intégrité et Sécurité des Atomes", () => {
  let orchestrator: TaskOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskOrchestrator();
    mockCaps = [CAPABILITIES.TASK.CREATE];
  });

  it("✅ doit fonder un atome par Souveraineté (Creator)", async () => {
    const taskPayload = { projectUid: 'proj_123', content: { title: 'Suture de Paix' } };
    const signature: ActionSignature = { actorUid: 'bird_sigma', capabilities: [] };

    const result = await orchestrator.fosterTask(taskPayload as any, signature);

    expect(result).toBeDefined();
    expect(result.content.title).toBe('Suture de Paix');
    expect(mockNeo4jRun).toHaveBeenCalledWith(expect.stringContaining("CREATE (t:Task"), expect.anything());
  });

  it("✅ doit fonder un atome par Aura Territoriale", async () => {
    mockCaps = [CAPABILITIES.TASK.CREATE];
    const taskPayload = { projectUid: 'proj_123', title: 'Atome Partagé' };
    const guestSignature: ActionSignature = { actorUid: 'bird_invite', capabilities: [] };

    const result = await orchestrator.fosterTask(taskPayload as any, guestSignature);

    expect(result.creatorUid).toBe('bird_invite');
    expect(mockNeo4jRun).toHaveBeenCalled();
  });

  it("❌ doit rejeter la fondation si l'aura est insuffisante", async () => {
    mockCaps = [CAPABILITIES.PROJECT.READ]; 
    const taskPayload = { projectUid: 'proj_123', title: 'Intrusion' };
    const badSignature: ActionSignature = { actorUid: 'bird_spectateur', capabilities: [] };

    await expect(orchestrator.fosterTask(taskPayload as any, badSignature))
      .rejects.toThrow("Ton Aura ne résonne pas assez fort sur ce territoire.");
  });

  it("❌ doit annuler si le Graphe échoue (Atomicité)", async () => {
    mockNeo4jRun.mockRejectedValueOnce(new Error("Graphe corrompu"));
    const taskPayload = { projectUid: 'proj_123', title: 'Atome Fantôme' };
    const signature: ActionSignature = { actorUid: 'bird_sigma', capabilities: ['*'] };

    await expect(orchestrator.fosterTask(taskPayload as any, signature))
      .rejects.toThrow("Graphe corrompu");
  });

  it("🎭 doit muter un atome avec les droits requis", async () => {
    const signature: ActionSignature = { actorUid: 'bird_sigma', capabilities: [CAPABILITIES.TASK.UPDATE] };
    const result = await orchestrator.updateTask('task_789', { status: 'DONE' } as any, signature);
    
    // Le mock retourne 'Mutation OK'
    expect(result.content.title).toBe('Mutation OK');
    expect(mockNeo4jRun).toHaveBeenCalledWith(expect.stringContaining("SET t.updatedAt"), expect.anything());
  });

  it("💀 doit désintégrer un atome si l'Architecte l'ordonne", async () => {
    const adminSignature: ActionSignature = { actorUid: 'architect_prime', capabilities: ['*'] };
    const result = await orchestrator.disintegrateTask('task_789', adminSignature);
    
    expect(result.success).toBe(true);
    expect(TaskModel.deleteMany).toHaveBeenCalled();
  });
});