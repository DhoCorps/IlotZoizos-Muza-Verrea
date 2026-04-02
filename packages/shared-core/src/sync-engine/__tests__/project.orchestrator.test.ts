import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectOrchestrator } from '../project.orchestrator';
import { ProjectModel, UserModel, TeamModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager'; // On l'importe pour le dompter

// ✨ SUTURE DE HOISTING : On prépare l'espion Neo4j
const { mockNeo4jRun } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn().mockResolvedValue({ records: [] })
}));

// 🛡️ Mock de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  ProjectModel: { create: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() },
  UserModel: { findOne: vi.fn() },
  TeamModel: { findOne: vi.fn() },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRun,
    beginTransaction: vi.fn().mockReturnValue({
      run: mockNeo4jRun,
      commit: vi.fn().mockResolvedValue(null),
      rollback: vi.fn().mockResolvedValue(null),
    }),
    close: vi.fn().mockResolvedValue(null),
  }),
}));

describe('ProjectOrchestrator - Fondation de Chantier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🕊️ NEUTRALISATION DU TRANSACTION MANAGER (Fin du timeout de 10s)
    // On force l'exécution immédiate du callback avec des mocks
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (name, callback) => {
      return callback(null as any, { run: mockNeo4jRun } as any);
    });
  });

  it('doit créer un projet dans Mongo et tisser le lien OWNER_OF dans Neo4j', async () => {
    const mockProject = { uid: 'proj-123', name: 'Renewall', status: 'CONCEPT' };
    const mockOwner = { _id: 'mongo-id-owner', username: 'DhÖ' };

    (UserModel.findOne as any).mockResolvedValue(mockOwner);
    (ProjectModel.create as any).mockResolvedValue([mockProject]);

    const result = await ProjectOrchestrator.fosterProject({
      name: 'Renewall',
      ownerUid: 'user-999'
    });

    // ✅ ASSERTIONS
    expect(result.success).toBe(true);
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (owner { uid: $ownerUid })'),
      expect.objectContaining({ ownerUid: 'user-999' })
    );
    
    expect(ProjectModel.create).toHaveBeenCalled();
  });
});