import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forgerNidDansGraphe } from '../../graph/team.graph';
import { getNeo4jSession } from '../../../neo4j';

// 🎯 On aligne le chemin du mock sur le chemin absolu ou relatif exact attendu par le module graph
vi.mock('../../../neo4j', () => ({
    getNeo4jSession: vi.fn(),
}));

describe('forgerNidDansGraphe (Neo4j Service)', () => {
    let mockSession: {
        run: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        delete (global as any).__mockUser;
        mockSession = {
            run: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // Configuration du mock via vi.mocked() nativement supportée par Vitest
        vi.mocked(getNeo4jSession).mockReturnValue(mockSession as any);
    });

    it('🟢 doit forger un nid avec succès et retourner ses propriétés', async () => {
        const mockTeamData = {
            teamUid: 'team_123',
            name: 'Canopée Studio',
            creatorUid: 'bird_creator_1',
            category: 'SOCIAL',
            nuances: ['#2A3B4C'],
            isPrivate: false,
        };

        const mockRecord = {
            get: vi.fn().mockReturnValue({
                properties: {
                    uid: 'team_123',
                    name: 'Canopée Studio',
                    category: 'SOCIAL',
                },
            }),
        };

        mockSession.run.mockResolvedValueOnce({
            records: [mockRecord],
        });

        const result = await forgerNidDansGraphe(mockTeamData);

        expect(getNeo4jSession).toHaveBeenCalledTimes(1);
        expect(mockSession.run).toHaveBeenCalledTimes(1);
        expect(mockSession.close).toHaveBeenCalledTimes(1);
        expect(result).toHaveProperty('uid', 'team_123');
        expect(result).toHaveProperty('name', 'Canopée Studio');
    });

    it('🔴 doit lever une erreur si Neo4j ne renvoie aucun enregistrement', async () => {
        const mockTeamData = {
            teamUid: 'team_456',
            name: 'Nid Orphelin',
            creatorUid: 'bird_creator_2',
            category: 'SYSTEM',
            nuances: [],
            isPrivate: true,
        };

        mockSession.run.mockResolvedValueOnce({
            records: [],
        });

        await expect(forgerNidDansGraphe(mockTeamData)).rejects.toThrow(
            "Neo4j n'a renvoyé aucun enregistrement après la création du nid."
        );
        expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
});