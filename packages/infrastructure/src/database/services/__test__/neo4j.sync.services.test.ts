// packages/infrastructure/src/database/services/__test__/neo4j.sync.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncUniversalInteraction } from '../neo4j.sync.services';
import { getNeo4jDriver } from '../../neo4j';

// On mocke le module Neo4j
vi.mock('../../neo4j', () => ({
  getNeo4jDriver: vi.fn(),
}));

describe('Neo4j Universal Sync - syncUniversalInteraction', () => {
  let mockSession: any;
  let mockDriver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 1. On crée un faux objet session dont toutes les méthodes sont des espions
    mockSession = {
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    };

    // 2. On crée un faux driver dont la méthode session est un espion qui retourne mockSession
    mockDriver = {
      session: vi.fn().mockReturnValue(mockSession),
    };

    // 3. On attache le driver mocké à getNeo4jDriver
    vi.mocked(getNeo4jDriver).mockReturnValue(mockDriver);
  });

  it('🟢 doit exécuter la requête Cypher INTERACTS_WITH avec succès entre deux oiseaux distincts', async () => {
    await syncUniversalInteraction('bird_alpha', 'bird_beta', 'CHAT');

    expect(getNeo4jDriver).toHaveBeenCalledTimes(1);
    expect(mockDriver.session).toHaveBeenCalledTimes(1); // 👈 On teste bien le spy mockDriver.session
    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(mockSession.close).toHaveBeenCalledTimes(1);

    // Vérification de la structure de la requête Cypher et des variables passées
    const [cypherQuery, params] = mockSession.run.mock.calls[0];
    expect(cypherQuery).toContain('INTERACTS_WITH');
    expect(params).toEqual({
      uidA: 'bird_alpha',
      uidB: 'bird_beta',
      contextModule: 'CHAT',
    });
  });

  it('⚠️ ne doit pas appeler la base si les UIDs sont identiques (auto-interaction)', async () => {
    await syncUniversalInteraction('bird_alpha', 'bird_alpha', 'CHAT');

    expect(mockDriver.session).not.toHaveBeenCalled();
    expect(mockSession.run).not.toHaveBeenCalled();
    expect(mockSession.close).not.toHaveBeenCalled();
  });

  it('⚠️ ne doit pas appeler la base si l\'un des UIDs est manquant ou vide', async () => {
    await syncUniversalInteraction('', 'bird_beta', 'ECOMMERCE');
    await syncUniversalInteraction('bird_alpha', '', 'PRAISE');

    expect(mockDriver.session).not.toHaveBeenCalled();
    expect(mockSession.run).not.toHaveBeenCalled();
  });
});