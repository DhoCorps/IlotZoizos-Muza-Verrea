import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { TeamModel, UserModel, connectToDatabase, getNeo4jDriver } from '@ilot/infrastructure';

/**
 * 🛡️ LE BOUCLIER DE TEST
 */
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    UserModel: {
      findOne: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    },
    TeamModel: {
      create: vi.fn(),
    },
    getNeo4jDriver: vi.fn().mockReturnValue({
      session: vi.fn().mockReturnValue({
        beginTransaction: vi.fn().mockReturnValue({
          run: vi.fn(),
          commit: vi.fn(),
          rollback: vi.fn(),
        }),
        close: vi.fn(),
      }),
    }),
  };
});

describe('TeamOrchestrator - fosterTeam', () => {
  const mockTeamData = {
    name: "Nom de l'équipe",
    creatorUid: "user-123",
    description: "Description",
    // Ajouter ces champs pour satisfaire l'interface
    category: "SOCIAL",
    nuances: ["test"],
    isPrivate: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // On simule que le créateur existe avec le nom attendu par la requête Cypher
    vi.mocked(UserModel.findOne).mockResolvedValue({ 
      _id: 'mongo_id_123', 
      uid: 'user_123', 
      username: 'OiseauTest' 
    } as any);
    vi.mocked(UserModel.findByIdAndUpdate).mockResolvedValue({ uid: 'user_123' } as any);
  });

  it('doit forger un nid dans Mongo ET Neo4j avec succès', async () => {
    const mockedCreate = vi.mocked(TeamModel.create);
    const mockedDriver = vi.mocked(getNeo4jDriver());
    
    const mockedTx = {
      run: vi.fn().mockResolvedValue({ records: [] }),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };

    const mockedSession = {
      beginTransaction: vi.fn().mockReturnValue(mockedTx),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(mockedDriver.session).mockReturnValue(mockedSession as any);

    // Retour Mongoose (Tableau pour les transactions)
    mockedCreate.mockResolvedValue([{
      uid: 'team_999',
      ...mockTeamData,
    }] as any);

    const result = await TeamOrchestrator.fosterTeam(mockTeamData);

    // ✅ ASSERTIONS CORRIGÉES
    expect(UserModel.findOne).toHaveBeenCalled();
    expect(mockedCreate).toHaveBeenCalled();
    
    // On vérifie que la requête contient bien MERGE (la nouvelle réalité du code)
   expect(mockedTx.run).toHaveBeenCalledWith(
   expect.stringContaining('MERGE (t:Team'),
   expect.objectContaining({
      creatorName: "OiseauTest",
      creatorUid: "user-123", // 🎯 Correction du tiret : "user-123" et non "user_123"
      name: "Nom de l'équipe",
      parentId: null,         // 🎯 Ajout nécessaire car envoyé par l'orchestrateur
      teamUid: "team_999",
      })
    );
    
    expect(mockedTx.commit).toHaveBeenCalled();
    expect(result.team.uid).toBe('team_999');
  });

  it('doit échouer si MongoDB refuse la création', async () => {
    const mockedDriver = vi.mocked(getNeo4jDriver());
    const mockedTx = {
      run: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(mockedDriver.session).mockReturnValue({
      beginTransaction: vi.fn().mockReturnValue(mockedTx),
      close: vi.fn(),
    } as any);

    const mockedCreate = vi.mocked(TeamModel.create);
    mockedCreate.mockRejectedValue(new Error('Erreur de Silice'));

    await expect(TeamOrchestrator.fosterTeam(mockTeamData))
      .rejects.toThrow('Erreur de Silice');
    
    expect(mockedTx.rollback).toHaveBeenCalled();
  });

  it('doit échouer si le créateur est introuvable', async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(null);

    await expect(TeamOrchestrator.fosterTeam(mockTeamData))
      .rejects.toThrow('Créateur introuvable.');

    expect(TeamModel.create).not.toHaveBeenCalled();
  });
});