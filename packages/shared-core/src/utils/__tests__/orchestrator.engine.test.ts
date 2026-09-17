import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCanonicalUid, ensureUniqueSlug, safeSyncUniversalInteraction } from '../orchestrator.engine';
import { findEntityBySlugOrUid, syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
    findEntityBySlugOrUid: vi.fn(),
    syncUniversalInteraction: vi.fn(),
    SystemGraphDlqModel: {
        create: vi.fn()
    }
}));

describe('Orchestrator Utils - Utilitaires Globaux de Synchronisation', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =====================================================================
    // 1. resolveCanonicalUid
    // =====================================================================
    describe('resolveCanonicalUid', () => {
        const MockModel = {} as never; // Faux modèle Mongoose typé

        it('🟢 doit retourner l\'UID si l\'entité est trouvée', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'entity_123', slug: 'mon-entite' } as never);
            
            const uid = await resolveCanonicalUid(MockModel, 'mon-entite', 'TestEntity');
            
            expect(uid).toBe('entity_123');
            expect(findEntityBySlugOrUid).toHaveBeenCalledWith(MockModel, 'mon-entite');
        });

        it('🔴 doit lever une IlotError 404 si l\'entité est introuvable', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
            
            await expect(resolveCanonicalUid(MockModel, 'inconnu', 'Oiseau'))
                .rejects.toThrow(IlotError);
            
            await expect(resolveCanonicalUid(MockModel, 'inconnu', 'Oiseau'))
                .rejects.toThrow(/Oiseau introuvable dans la Silice/);
        });
    });

    // =====================================================================
    // 2. ensureUniqueSlug
    // =====================================================================
    describe('ensureUniqueSlug', () => {
        it('🟢 doit retourner le slug de base s\'il n\'y a pas de collision', async () => {
            const MockModel = {
                findOne: vi.fn().mockReturnValue({
                    session: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue(null) // Aucune collision
                    })
                })
            };

            const result = await ensureUniqueSlug(MockModel as never, 'mon-slug', {});
            expect(result).toBe('mon-slug');
        });

        it('🟠 doit retourner le slug avec un suffixe cryptographique en cas de collision', async () => {
            const MockModel = {
                findOne: vi.fn().mockReturnValue({
                    session: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue({ uid: 'exist_123' }) // Collision !
                    })
                })
            };

            const result = await ensureUniqueSlug(MockModel as never, 'mon-slug', {});
            
            // On vérifie avec une Regex : le slug de base + un tiret + 4 caractères hexadécimaux
            expect(result).toMatch(/^mon-slug-[a-f0-9]{4}$/);
        });
    });

    // =====================================================================
    // 3. safeSyncUniversalInteraction
    // =====================================================================
    describe('safeSyncUniversalInteraction', () => {
        it('⚪ doit ignorer silencieusement si la source et la cible sont identiques', async () => {
            await safeSyncUniversalInteraction('bird_1', 'bird_1', 'PRAISE', 'testOp');
            expect(syncUniversalInteraction).not.toHaveBeenCalled();
            expect(SystemGraphDlqModel.create).not.toHaveBeenCalled();
        });

        it('🟢 doit exécuter le tissage avec succès', async () => {
            vi.mocked(syncUniversalInteraction).mockResolvedValueOnce(undefined as never);
            
            await safeSyncUniversalInteraction('bird_1', 'bird_2', 'PRAISE', 'testOp');
            
            expect(syncUniversalInteraction).toHaveBeenCalledWith('bird_1', 'bird_2', 'PRAISE');
            expect(SystemGraphDlqModel.create).not.toHaveBeenCalled();
        });

        it('🟠 doit basculer l\'opération en DLQ si la Matrice Neo4j rejette le tissage', async () => {
            vi.mocked(syncUniversalInteraction).mockRejectedValueOnce(new Error('Neo4j timeout'));
            vi.mocked(SystemGraphDlqModel.create).mockResolvedValueOnce({} as never);

            await safeSyncUniversalInteraction('bird_1', 'bird_2', 'PRAISE', 'testOp');

            expect(syncUniversalInteraction).toHaveBeenCalled();
            expect(SystemGraphDlqModel.create).toHaveBeenCalledWith(expect.objectContaining({
                operationName: 'syncUniversalInteraction_testOp',
                status: 'PENDING_RETRY',
                error: 'Neo4j timeout'
            }));
        });

        it('🔴 ne doit PAS faire crasher l\'application même si la DLQ échoue elle-même', async () => {
            vi.mocked(syncUniversalInteraction).mockRejectedValueOnce(new Error('Neo4j timeout'));
            vi.mocked(SystemGraphDlqModel.create).mockRejectedValueOnce(new Error('Mongo timeout'));

            // On s'attend à ce que l'appel ne throw AUCUNE erreur (résilience totale)
            await expect(
                safeSyncUniversalInteraction('bird_1', 'bird_2', 'PRAISE', 'testOp')
            ).resolves.toBeUndefined();
        });
    });
});