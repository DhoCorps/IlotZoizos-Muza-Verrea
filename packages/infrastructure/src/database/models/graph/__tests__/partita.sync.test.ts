// packages/infrastructure/src/database/models/graph/__tests__/partita.sync.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ancrerPartitaDansGraphe } from '../partita.sync.graph';

// Mock de la session Neo4j pour isoler les tests de la base de données physique
vi.mock('../../../neo4j', () => ({
  getNeo4jSession: () => ({
    run: vi.fn().mockResolvedValue({
      records: [{ get: () => ({ properties: { uid: 'partita_1', title: 'Ligne Fretless N°4' } }) }]
    }),
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('🎸 Partita Neo4j Graph Synchronization', () => {
  it('🟢 doit ancrer une partition et tisser ses relations dans le graphe', async () => {
    const partitaData = {
      uid: 'partita_1',
      authorUid: 'oiseau_1',
      title: 'Ligne Fretless N°4',
      instrument: 'BASS',
      format: 'ABC',
      visibility: 'PUBLIC',
      relatedProjects: ['proj_1'],
      productId: 'prod_1'
    };

    const result = await ancrerPartitaDansGraphe(partitaData);
    
    expect(result).toBeDefined();
    expect(result.uid).toBe('partita_1');
    expect(result.title).toBe('Ligne Fretless N°4');
  });
});