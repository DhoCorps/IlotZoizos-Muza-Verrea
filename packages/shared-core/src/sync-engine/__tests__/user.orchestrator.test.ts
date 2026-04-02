import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserOrchestrator } from '../user.orchestrator';
import { baguerOiseau } from '@ilot/infrastructure';

/**
 * 🛡️ LE BOUCLIER DE TEST
 * On intercepte le module d'infrastructure pour ne pas réellement
 * solliciter Neo4j pendant les tests unitaires.
 */
vi.mock('@ilot/infrastructure', () => ({
  baguerOiseau: vi.fn(),
}));

describe('UserOrchestrator - syncUserCreation', () => {
  // 🩸 CORRECTION ICI : On satisfait l'interface stricte de l'Orchestrateur
  const mockUserData = {
    uid: 'user_999',
    username: 'OiseauDeNuit',
    role: 'MEMBRE',     // <- Le champ obligatoire attendu depuis MongoDB
    roles: ['MEMBRE'],  // <- Le champ optionnel
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit baguer l\'oiseau avec succès dans Neo4j', async () => {
    // 1. Préparation de l'espion
    const mockedBaguer = vi.mocked(baguerOiseau);
    const mockNode = { identity: { low: 1 }, properties: mockUserData };
    
    mockedBaguer.mockResolvedValue(mockNode as any);

    // 2. Action
    const result = await UserOrchestrator.syncUserCreation(mockUserData);

    // 3. Vérifications (L'infrastructure, elle, n'attend que le tableau "roles")
    expect(mockedBaguer).toHaveBeenCalledWith({
      uid: mockUserData.uid,
      username: mockUserData.username,
      roles: mockUserData.roles, 
    });
    
    expect(result.status).toBe('success');
    expect(result.source).toBe('neo4j');
    expect(result.data).toEqual(mockNode);
    expect(result.timestamp).toBeDefined();
  });

  it('doit remonter une erreur si le baguage échoue', async () => {
    // 1. On simule un échec de l'infrastructure (ex: Neo4j hors ligne)
    const mockedBaguer = vi.mocked(baguerOiseau);
    mockedBaguer.mockRejectedValue(new Error('Erreur de Graphe'));

    // 2. Action & Vérification
    await expect(UserOrchestrator.syncUserCreation(mockUserData))
      .rejects.toThrow('Erreur de Graphe');

    // On vérifie que l'erreur a bien été logguée
    expect(mockedBaguer).toHaveBeenCalledTimes(1);
  });
});