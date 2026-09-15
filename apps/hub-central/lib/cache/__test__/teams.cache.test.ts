// Fichier : __test__/cache/teams.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedUserTeams, getCachedTeamDetails } from '@/lib/cache/teams.cache';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

// 🛡️ MOCK INTELLIGENT DE NEO4J : Répond correctement selon le Cypher exécuté
vi.mock('@ilot/infrastructure', () => ({
  TeamModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn(async (cypher: string) => {
      if (cypher.includes('INVITED_TO')) {
        return {
          records: [
            {
              get: (key: string) => {
                if (key === 'uid') return 'bird_invite';
                if (key === 'pseudo') return 'Invité';
                if (key === 'relType') return 'INVITED_TO';
                return null;
              },
            },
          ],
        };
      }
      return { records: [] };
    }),
    close: vi.fn().mockResolvedValue(true),
  })),
}));

describe('Cache : Teams Cache Helpers (Nids)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedUserTeams', () => {
    it('doit récupérer les équipes d\'un utilisateur avec hydratation Neo4j et Mongo, et injecter l\'Architecte si absent', async () => {
      const mockNeo4jSession = {
        run: vi.fn().mockImplementation(async (cypher: string) => {
          if (cypher.includes('FOUNDED|MEMBER_OF|INVITED_TO')) {
            return {
              records: [
                { get: (key: string) => (key === 'teamUid' ? 'team_1' : 'FOUNDED') },
              ],
            };
          }
          if (cypher.includes('MATCH (m:User)')) {
            return {
              records: [
                { get: (key: string) => (key === 'uid' ? 'bird_2' : key === 'pseudo' ? 'Second' : null) },
              ],
            };
          }
          return { records: [] };
        }),
        close: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(getNeo4jSession).mockReturnValueOnce(mockNeo4jSession as any);

      const mockTeams = [{ uid: 'team_1', name: 'Nid Principal', ownerUid: 'bird_1' }];
      vi.mocked(TeamModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTeams),
      } as any);

      const result = await getCachedUserTeams('bird_1');

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('team_1');
      expect(result[0].members[0]).toMatchObject({
        uid: 'bird_1',
        pseudo: "L'Architecte (Fondateur)",
        signature: 'Créateur',
      });
    });

    it('doit retourner un tableau vide si l\'utilisateur n\'appartient à aucun nid', async () => {
      vi.mocked(getNeo4jSession).mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ records: [] }),
        close: vi.fn().mockResolvedValue(true),
      } as any);

      const result = await getCachedUserTeams('bird_solitaire');

      expect(result).toEqual([]);
      expect(TeamModel.find).not.toHaveBeenCalled();
    });
  });

  describe('getCachedTeamDetails', () => {
    it('doit récupérer les détails d\'un nid spécifique, ses invitations Neo4j et ses capacités', async () => {
      const mockTeam = { uid: 'team_1', slug: 'nid-secret', name: 'Nid Secret' };
      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      const mockGetCaps = vi.fn().mockResolvedValueOnce(['MANAGE_TEAM']);

      const result = await getCachedTeamDetails('nid-secret', 'bird_1', mockGetCaps);

      expect(result).toEqual({
        team: mockTeam,
        caps: ['MANAGE_TEAM'],
        invitations: [
          { uid: 'bird_invite', pseudo: 'Invité', status: 'PENDING' },
        ],
      });
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'nid-secret' }, { uid: 'nid-secret' }],
      });
      expect(mockGetCaps).toHaveBeenCalledWith('bird_1', 'team_1');
    });

    it('doit retourner null si l\'équipe n\'est pas trouvée dans la Silice', async () => {
      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const mockGetCaps = vi.fn();

      const result = await getCachedTeamDetails('nid-inconnu', 'bird_1', mockGetCaps);

      expect(result).toBeNull();
      expect(mockGetCaps).not.toHaveBeenCalled();
    });
  });
});