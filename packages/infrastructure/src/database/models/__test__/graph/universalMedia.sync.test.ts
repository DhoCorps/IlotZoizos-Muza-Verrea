import { describe, it, expect, vi } from 'vitest';
import { UniversalMediaGraph } from '../../graph/universalMedia.graph';

describe('UniversalMedia Graph Logic', () => {
  it('devrait forger la bonne requête Cypher pour ancrer le média', async () => {
    // On simule une transaction Neo4j
    const mockTx = {
      run: vi.fn().mockResolvedValue({ records: ['mock_record_matrix'] }),
    } as any;

    const params = {
      creatorId: 'oiseau_666',
      mediaId: 'uuid-1234-5678',
      type: 'AUDIO_STEM',
      sourceApp: 'DHO',
    };

    const result = await UniversalMediaGraph.anchorMedia(mockTx, params);

    // L'épreuve de vérité : on vérifie que le driver a bien été appelé 1 fois
    expect(mockTx.run).toHaveBeenCalledTimes(1);
    
    const [queryCall, paramsCall] = mockTx.run.mock.calls[0];

    // On vérifie les mots de pouvoir (Cypher)
    expect(queryCall).toContain('MERGE (o:Oiseau { uid: $creatorId })');
    expect(queryCall).toContain('MERGE (m:UniversalMedia { mediaId: $mediaId })');
    expect(queryCall).toContain('MERGE (o)-[r:CREATED]->(m)');
    
    // On vérifie que les paramètres injectés sont les bons
    expect(paramsCall).toEqual(params);
    
    // Le retour attendu
    expect(result).toEqual(['mock_record_matrix']);
  });

  it('devrait générer la bonne requête de purge cosmique (DETACH DELETE)', async () => {
    const mockTx = {
      run: vi.fn().mockResolvedValue(true),
    } as any;

    await UniversalMediaGraph.purgeMedia(mockTx, 'uuid-0000');

    expect(mockTx.run).toHaveBeenCalledTimes(1);
    const [queryCall, paramsCall] = mockTx.run.mock.calls[0];

    expect(queryCall).toContain('DETACH DELETE m');
    expect(paramsCall).toEqual({ mediaId: 'uuid-0000' });
  });
});