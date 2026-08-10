// packages/infrastructure/src/database/models/graph/__tests__/letrin.sync.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ancrerLetrinDansGraphe } from '../../graph/letrin.sync.graph';

// Mock de la session Neo4j pour valider le contrat d'ancrage typographique
vi.mock('../../../neo4j', () => ({
  getNeo4jSession: () => ({
    run: vi.fn().mockResolvedValue({
      records: [{ get: () => ({ properties: { uid: 'letrin_1', title: 'Police Cyberpunk' } }) }]
    }),
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('🔠 Letr\'In Neo4j Graph Synchronization', () => {
  it('🟢 doit ancrer un projet typographique Letr\'In et ses liaisons dans le graphe', async () => {
    const letrinData = {
      uid: 'letrin_1',
      authorUid: 'oiseau_1',
      title: 'Police Cyberpunk',
      resolution: 16,
      visibility: 'EXCHANGEABLE',
      relatedProjects: ['proj_1'],
      productId: 'prod_2'
    };

    const result = await ancrerLetrinDansGraphe(letrinData);
    
    expect(result).toBeDefined();
    expect(result.uid).toBe('letrin_1');
    expect(result.title).toBe('Police Cyberpunk');
  });
});