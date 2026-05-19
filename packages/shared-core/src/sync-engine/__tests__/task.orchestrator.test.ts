// packages/shared-core/src/sync-engine/__tests__/task.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

// 🛡️ SUTURE 1 : Mock des modèles Silice (MongoDB)
vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    findOne: vi.fn().mockImplementation(() => ({
      // On simule un projet où l'oiseau 'bird_sigma' est le créateur
      lean: vi.fn().mockResolvedValue({ 
        uid: 'proj_123', 
        creatorUid: 'bird_sigma',
        ownerUid: 'team_nexus' 
      })
    }))
  }
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    create: vi.fn().mockImplementation((data) => {
      const doc = Array.isArray(data) ? data[0] : data;
      return Promise.resolve([{ ...doc, _id: 'mongo_id_789', documents: [] }]); // 🪡 SUTURE : Ajout du champ documents
    }),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'task_789', content: { title: 'Mutation OK' }, documents: [] })
    })),
    findOneAndDelete: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'task_789' })
    }))
  }
}));

// 🛡️ SUTURE 2 : Mock global du TransactionManager avec contrôle de l'Aura
let mockCaps: string[] = [CAPABILITIES.TASK.CREATE];

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = {
        run: vi.fn().mockImplementation((query) => {
          // Simulation du retour hybride Neo4j (allCaps)
          if (query.includes('RETURN collect(r.capabilities)')) {
            return Promise.resolve({ 
              records: [{ get: () => mockCaps }] 
            });
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
  const mockCreatorUid = 'bird_sigma';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskOrchestrator();
    mockCaps = [CAPABILITIES.TASK.CREATE]; // Aura par défaut
  });

  it("✅ doit fonder un atome par Souveraineté (Creator)", async () => {
    const taskPayload = {
      projectUid: 'proj_123',
      content: { title: 'Suture de Paix' },
    };

    // L'acteur est le creatorUid défini dans le mock ProjectModel
    const signature: ActionSignature = {
      actorUid: 'bird_sigma',
      capabilities: [] // Même sans caps, la souveraineté suffit
    };

    const result = await orchestrator.fosterTask(taskPayload as any, signature);

    expect(result).toBeDefined();
    expect(result.content.title).toBe('Suture de Paix');
    expect(TransactionManager.execute).toHaveBeenCalledWith("Fondation d'Atome", expect.any(Function));
  });

  it("✅ doit fonder un atome par Aura Territoriale (Non-Creator avec droit)", async () => {
    mockCaps = [CAPABILITIES.TASK.CREATE];
    
    const taskPayload = { projectUid: 'proj_123', title: 'Atome Partagé' };
    const guestSignature: ActionSignature = { 
      actorUid: 'bird_invite', 
      capabilities: [] 
    };

    const result = await orchestrator.fosterTask(taskPayload as any, guestSignature);

    expect(result.uid).toBeDefined();
    expect(result.creatorUid).toBe('bird_invite');
  });

  it("❌ doit rejeter la fondation si l'Aura est absente du territoire", async () => {
    mockCaps = [CAPABILITIES.PROJECT.READ]; // L'oiseau peut voir mais pas créer
    
    const taskPayload = { projectUid: 'proj_123', title: 'Intrusion' };
    const badSignature: ActionSignature = { actorUid: 'bird_spectateur', capabilities: [] };

    await expect(
      orchestrator.fosterTask(taskPayload as any, badSignature)
    ).rejects.toThrow("Ton Aura ne résonne pas assez fort sur ce territoire.");
  });

  it("🎭 doit muter un atome avec les droits requis", async () => {
    const signature: ActionSignature = {
      actorUid: 'bird_sigma',
      capabilities: [CAPABILITIES.TASK.UPDATE]
    };

    const result = await orchestrator.updateTask('task_789', { status: 'DONE' } as any, signature);
    expect(result.content.title).toBe('Mutation OK');
  });

  it("💀 doit désintégrer un atome si l'Architecte l'ordonne", async () => {
    const adminSignature: ActionSignature = {
      actorUid: 'architect_prime',
      capabilities: ['*']
    };

    const result = await orchestrator.disintegrateTask('task_789', adminSignature);
    expect(result.success).toBe(true);
  });
});