import { describe, it, expect, vi, beforeEach } from 'vitest';
import { weaveFollowLink, severFollowLink } from '../../graph/subscription.graph'; 
import { getNeo4jSession } from '../../../neo4j'; 

// 🎭 Auto-mocking de Vitest
vi.mock('../../../neo4j');

describe('🕸️ Requêtes Cypher : FOLLOWS (Canopée Tampon)', () => {
  let mockRun: any;
  let mockClose: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRun = vi.fn();
    mockClose = vi.fn();

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose,
    } as any);
  });

  it('🟢 devrait forger un lien FOLLOWS entre un User et sa Cible', async () => {
    mockRun.mockResolvedValue({
      records: [{
        get: (key: string) => ({
          properties: { createdAt: '2026-09-21T10:00:00Z', targetType: 'BLOG' }
        })
      }]
    });

    const result = await weaveFollowLink('user-1', 'monologue-99', 'BLOG');

    expect(mockRun).toHaveBeenCalledTimes(1);
    const [cypherCall, paramsCall] = mockRun.mock.calls[0];

    expect(cypherCall).toContain('MATCH (u:User { uid: $subscriberUid })');
    expect(cypherCall).toContain('MATCH (t { uid: $targetUid })');
    expect(cypherCall).toContain('MERGE (u)-[r:FOLLOWS]->(t)');
    
    expect(paramsCall.subscriberUid).toBe('user-1');
    expect(paramsCall.targetUid).toBe('monologue-99');
    expect(result.targetType).toBe('BLOG');
    
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('🟢 devrait désintégrer (DELETE) un lien FOLLOWS existant', async () => {
    mockRun.mockResolvedValue({ records: [] });

    const result = await severFollowLink('user-1', 'monologue-99');

    expect(mockRun).toHaveBeenCalledTimes(1);
    const cypherCall = mockRun.mock.calls[0][0];
    
    expect(cypherCall).toContain('DELETE r');
    expect(result).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('🔴 devrait lever une erreur si la cible ou le User est introuvable (Fantôme)', async () => {
    mockRun.mockResolvedValue({ records: [] });

    await expect(weaveFollowLink('user-ghost', 'target-ghost', 'USER'))
      .rejects
      .toThrow("Cannot weave link");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});