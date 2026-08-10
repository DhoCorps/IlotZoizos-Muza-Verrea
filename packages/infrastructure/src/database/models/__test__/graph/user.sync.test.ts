import { describe, it, expect, vi, beforeEach } from 'vitest';
import { franchirLaPorte, propagerCouleur, OiseauEssence } from '../../graph/user.graph';
import { getNeo4jSession } from '../../../neo4j';

// Mock du module neo4j avec vi.fn()
vi.mock('../../../neo4j', () => ({
    getNeo4jSession: vi.fn(),
}));

describe('Oiseau Graph Service (franchirLaPorte & propagerCouleur)', () => {
    let mockSession: {
        run: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = undefined;
        mockSession = {
            run: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // Liaison propre du mock avec typage Vitest
        vi.mocked(getNeo4jSession).mockReturnValue(mockSession as any);
    });

    describe('franchirLaPorte', () => {
        it('🟢 doit permettre à un oiseau (Essence) de franchir la porte et retourner ses propriétés Neo4j', async () => {
            const oiseauEssence: OiseauEssence = {
                uid: 'bird_dhö_1',
                pseudo: 'DhÖ Master',
                frequenceHEX: '#8b9dc3',
            };

            const mockRecord = {
                get: vi.fn().mockReturnValue({
                    properties: {
                        uid: 'bird_dhö_1',
                        pseudo: 'DhÖ Master',
                        frequenceHEX: '#8b9dc3',
                    },
                }),
            };

            mockSession.run.mockResolvedValueOnce({
                records: [mockRecord],
            });

            const result = await franchirLaPorte(oiseauEssence);

            expect(getNeo4jSession).toHaveBeenCalledTimes(1);
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(mockSession.close).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('uid', 'bird_dhö_1');
            expect(result).toHaveProperty('pseudo', 'DhÖ Master');
            expect(result).toHaveProperty('frequenceHEX', '#8b9dc3');
        });
    });

    describe('propagerCouleur', () => {
        it('🟢 doit mettre à jour la fréquence HEX d\'un oiseau dans le graphe avec succès', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [],
            });

            await propagerCouleur('bird_dhö_1', '#ff0000');

            expect(getNeo4jSession).toHaveBeenCalledTimes(1);
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(mockSession.close).toHaveBeenCalledTimes(1);
            expect(mockSession.run).toHaveBeenCalledWith(
                expect.any(String),
                { uid: 'bird_dhö_1', frequenceHEX: '#ff0000' }
            );
        });
    });
});