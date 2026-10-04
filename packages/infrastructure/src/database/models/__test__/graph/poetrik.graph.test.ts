// packages/infrastructure/src/database/neo4j/__test__/poetrik.graph.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoetrikGraph } from '../../graph/poetrik.graph';

describe('Neo4j Graph Queries : Poetrik & Oracle Lexical', () => {
  let mockTx: any;

  beforeEach(() => {
    // Mock léger d'une Transaction Neo4j
    mockTx = {
      run: vi.fn().mockResolvedValue({ records: [] })
    };
  });

  it('🟢 doit générer la requête MERGE pour sédimenter un Nœud Poème', async () => {
    const poemData = { uid: 'poem_123', title: 'Les Vents', language: 'fr', format: 'FREE_VERSE' };
    await PoetrikGraph.upsertPoemNode(mockTx, poemData);
    
    expect(mockTx.run).toHaveBeenCalledTimes(1);
    const [cypher, params] = mockTx.run.mock.calls[0];
    expect(cypher).toContain('MERGE (p:Poem { uid: $uid })');
    expect(params).toEqual(poemData);
  });

  it('🟢 doit générer la relation AUTHORED entre un Oiseau (User) et un Poème', async () => {
    await PoetrikGraph.linkAuthorToPoem(mockTx, 'user_99', 'poem_123');
    
    const [cypher, params] = mockTx.run.mock.calls[0];
    expect(cypher).toContain('MERGE (u)-[r:AUTHORED]->(p)');
    expect(params).toEqual({ authorUid: 'user_99', poemUid: 'poem_123' });
  });

  it('🟢 doit générer la relation INSPIRED_BY (Le Tissage des Muses)', async () => {
    await PoetrikGraph.linkPoemInspiration(mockTx, 'poem_new', 'poem_source');
    
    const [cypher, params] = mockTx.run.mock.calls[0];
    expect(cypher).toContain('MERGE (p1)-[r:INSPIRED_BY]->(p2)');
    expect(params).toEqual({ sourcePoemUid: 'poem_new', targetPoemUid: 'poem_source' });
  });

  it('🟢 doit générer la requête MERGE pour sédimenter un Nœud Mot (Oracle Lexical)', async () => {
    const wordData = { 
      uid: 'lex_fr_oiseau', 
      word: 'oiseau', 
      languageCode: 'fr', 
      phoneticIpa: '/wa.zo/', 
      syllableCount: 2 
    };
    await PoetrikGraph.upsertWordNode(mockTx, wordData);
    
    const [cypher, params] = mockTx.run.mock.calls[0];
    expect(cypher).toContain('MERGE (w:Word { uid: $uid })');
    expect(params).toEqual(wordData);
  });

  it('🟢 doit générer la relation phonétique RHYMES_WITH entre deux Mots', async () => {
    await PoetrikGraph.linkWordsRhyme(mockTx, 'lex_fr_oiseau', 'lex_fr_roseau', 'rich', '95%');
    
    const [cypher, params] = mockTx.run.mock.calls[0];
    expect(cypher).toContain('MERGE (w1)-[r:RHYMES_WITH { type: $type }]->(w2)');
    expect(params).toEqual({ 
      sourceWordUid: 'lex_fr_oiseau', 
      targetWordUid: 'lex_fr_roseau', 
      type: 'rich', 
      match: '95%' 
    });
  });
});