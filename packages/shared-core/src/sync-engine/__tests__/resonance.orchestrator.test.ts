// packages/shared-core/src/sync-engine/__tests__/resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { TransactionManager } from '../transactionManager';
import { getNeo4jSession } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

// Mocks de l'infrastructure Neo4j et TransactionManager
vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn()
    }
}));

vi.mock('@ilot/infrastructure', () => ({
    getNeo4jSession: vi.fn()
}));

describe('ResonanceOrchestrator - Le Tisserand et Résonance Transversale', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('weaveCrossDomainLink', () => {
        const orchestrator = new ResonanceOrchestrator();

        it('❌ doit rejeter le tissage si l’acteur n’a pas les privilèges système requis', async () => {
            const signature = { actorUid: 'user-bird', capabilities: ['READ'] };

            await expect(
                orchestrator.weaveCrossDomainLink('src-1', 'Sujet', 'tgt-1', 'Product', 'ILLUMINATES', signature)
            ).rejects.toThrow(IlotError);
        });

        it('🕸️ doit tisser avec succès un pont transdisciplinaire si l’acteur est autorisé', async () => {
            const signature = { actorUid: 'architect-uid', capabilities: [CAPABILITIES.SYSTEM.ALL] };

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({
                        records: [{ get: (key: string) => ({}) }]
                    })
                };
                return await callback({}, mockNeo4jTx);
            });

            const result = await orchestrator.weaveCrossDomainLink('src-1', 'Sujet', 'tgt-1', 'Product', 'ILLUMINATES', signature);
            expect(result.success).toBe(true);
            expect(TransactionManager.execute).toHaveBeenCalled();
        });

        it('❌ doit lever une erreur si l’un des nœuds est introuvable dans le Graphe', async () => {
            const signature = { actorUid: 'architect-uid', capabilities: ['*'] };

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({ records: [] }) // Aucun enregistrement retourné
                };
                return await callback({}, mockNeo4jTx);
            });

            await expect(
                orchestrator.weaveCrossDomainLink('src-ghost', 'Sujet', 'tgt-ghost', 'Product', 'ILLUMINATES', signature)
            ).rejects.toThrow("L'un des deux nœuds est introuvable dans le Graphe.");
        });
    });

    describe('addSocialEcho', () => {
        const orchestrator = new ResonanceOrchestrator();

        it('❌ doit rejeter l’écho si l’oiseau est un fantôme (pas d’actorUid)', async () => {
            const signature = { actorUid: '', capabilities: [] };

            await expect(
                orchestrator.addSocialEcho('target-1', 'Sujet', 'TEXT', 'Superbe', signature)
            ).rejects.toThrow("Oiseau fantôme.");
        });

        it('💬 doit sédimenter un écho social avec succès', async () => {
            const signature = { actorUid: 'bird-uid-1', capabilities: [] };

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({ records: [] })
                };
                return await callback({}, mockNeo4jTx);
            });

            const result = await orchestrator.addSocialEcho('target-1', 'Sujet', 'EMOJI', '🔥', signature);
            expect(result.success).toBe(true);
            expect(result.content).toBe('🔥');
            expect(result.type).toBe('EMOJI');
        });
    });

    describe('getResonances', () => {
        const orchestrator = new ResonanceOrchestrator();

        it('🔍 doit récupérer toutes les résonances connectées à un nœud via Neo4j', async () => {
            const mockSession = {
                run: vi.fn().mockResolvedValue({
                    records: [
                        {
                            get: (key: string) => {
                                const map: any = {
                                    relationType: 'ILLUMINATES',
                                    neighborType: 'Project',
                                    neighborUid: 'proj-1',
                                    neighborTitle: 'Cyberpunk Project',
                                    neighborName: null
                                };
                                return map[key];
                            }
                        }
                    ]
                }),
                close: vi.fn().mockResolvedValue(undefined)
            };

            (getNeo4jSession as any).mockReturnValue(mockSession);

            const resonances = await orchestrator.getResonances('center-uid');
            expect(resonances).toHaveLength(1);
            expect(resonances[0].relation).toBe('ILLUMINATES');
            expect(resonances[0].title).toBe('Cyberpunk Project');
            expect(mockSession.close).toHaveBeenCalled();
        });
    });

    describe('findTransversalResonances', () => {
        const orchestrator = new ResonanceOrchestrator();

        it('📈 doit calculer les résonances transversales basées sur les tags partagés', async () => {
            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({
                        records: [
                            {
                                get: (key: string) => {
                                    const map: any = {
                                        peerUid: 'peer-bird-2',
                                        sharedTags: ['neo4j', 'typescript'],
                                        commonCount: { toNumber: () => 2 }
                                    };
                                    return map[key];
                                }
                            }
                        ]
                    })
                };
                return await callback({}, mockNeo4jTx);
            });

            const results = await orchestrator.findTransversalResonances('target-bird-1');
            expect(results).toHaveLength(1);
            expect(results[0].peerUid).toBe('peer-bird-2');
            expect(results[0].sharedTags).toEqual(['neo4j', 'typescript']);
            expect(results[0].score).toBe(4); // 2 * 2
        });
    });
});