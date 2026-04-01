import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleOrchestrator } from '../role.orchestrator';
import { RoleModel, PermissionModel, connectToDatabase } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';

/**
 * 🛡️ LE BOUCLIER DE TEST
 */
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    RoleModel: {
      create: vi.fn(),
      find: vi.fn(() => ({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })),
      findOne: vi.fn(() => ({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      })),
    },
    PermissionModel: {
      create: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })),
      findOne: vi.fn(() => ({
        lean: vi.fn().mockResolvedValue(null),
      })),
    },
  };
});

// On mocke le TransactionManager pour qu'il exécute directement le callback
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn((name, callback) => {
      const fakeMongoSession = {};
      const fakeNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [] }),
      };
      return callback(fakeMongoSession, fakeNeo4jTx);
    }),
  },
}));

describe('RoleOrchestrator', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permissions', () => {
    it('doit créer une permission avec succès', async () => {
      const mockData = { intitule: 'Lire', code: 'READ', description: 'Accès lecture' };
      vi.mocked(PermissionModel.create).mockResolvedValue(mockData as any);

      const result = await RoleOrchestrator.createPermission(mockData);
      
      expect(PermissionModel.create).toHaveBeenCalledWith(mockData);
      expect(result.code).toBe('READ');
    });

    it('doit récupérer une permission par son UID ou ID', async () => {
      const mockPerm = { uid: 'perm_123', intitule: 'Écrire' };
      // Simulation du comportement findOne().lean()
      vi.mocked(PermissionModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockPerm),
      } as any);

      const result = await RoleOrchestrator.getPermission('perm_123');
      expect(result.uid).toBe('perm_123');
    });

    it('doit échouer si la permission est introuvable', async () => {
      vi.mocked(PermissionModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(RoleOrchestrator.getPermission('unknown'))
        .rejects.toThrow("Permission introuvable dans les archives.");
    });
  });

  describe('Roles', () => {
    const mockRoleData = {
      intitule: 'Gardien',
      description: 'Veille sur le Nexus',
      status: 'active'
    };

    it('doit forger un grade (Role) dans Mongo et Neo4j', async () => {
      const mockedCreate = vi.mocked(RoleModel.create);
      
      // Simulation du retour Mongoose (tableau pour les transactions)
      mockedCreate.mockResolvedValue([{
        uid: 'role_999',
        ...mockRoleData,
        intitule: 'GARDIEN' // Normalisé par l'orchestrateur
      }] as any);

      const result = await RoleOrchestrator.createRole(mockRoleData);

      // Vérifications
      expect(TransactionManager.execute).toHaveBeenCalledWith("Forge de Grade", expect.any(Function));
      expect(mockedCreate).toHaveBeenCalledWith(
        [expect.objectContaining({ intitule: 'GARDIEN' })],
        expect.any(Object)
      );
      expect(result.intitule).toBe('GARDIEN');
      expect(result.uid).toBe('role_999');
    });

    it('doit récupérer tous les rôles avec leurs permissions', async () => {
      const mockRoles = [{ intitule: 'ADMIN', permissions: [] }];
      vi.mocked(RoleModel.find).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockRoles),
      } as any);

      const result = await RoleOrchestrator.getAllRoles();
      expect(result).toHaveLength(1);
      expect(RoleModel.find).toHaveBeenCalled();
    });

    it('doit récupérer un rôle spécifique par son UID', async () => {
      const mockRole = { uid: 'role_456', intitule: 'MODÉRATEUR' };
      vi.mocked(RoleModel.findOne).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockRole),
      } as any);

      const result = await RoleOrchestrator.getRole('role_456');
      expect(result.intitule).toBe('MODÉRATEUR');
    });

    it('doit lever une erreur si le grade est absent du Bunker', async () => {
      vi.mocked(RoleModel.findOne).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(RoleOrchestrator.getRole('void'))
        .rejects.toThrow("Ce grade n'existe pas dans le Bunker.");
    });
  });
});