import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MutationService } from '../mutation.services';
import { syncService } from '../sync.services';
import { IlotError } from '../../../../../shared-core/src/errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

vi.mock('../sync.services', () => ({
    syncService: {
        teams: { fosterTeam: vi.fn() },
        oiseaux: { appliquerFluctuation: vi.fn() },
        projects: { fosterProject: vi.fn() },
        kanban: { updateTask: vi.fn() },
    },
}));

describe('MutationService (Le Répartiteur & Douanier des Mutants)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createNest', () => {
        it('🟢 doit fonder un nid avec succès si l oiseau a les capacités et un nom moralement sûr', async () => {
            const userCaps = [CAPABILITIES.TEAM.CREATE];
            const userUid = 'bird_creator_1';
            const data = { name: 'Canopée Sélénite' };
            
            vi.mocked(syncService.teams.fosterTeam).mockResolvedValueOnce({ 
                uid: 'team_123',
                success: true,
                status: 'success',
                mongo: {},
                neo4j: {}
            } as any);

            const result = await MutationService.createNest(data, userCaps, userUid);

            expect(result).toHaveProperty('uid', 'team_123');
            expect(syncService.teams.fosterTeam).toHaveBeenCalledWith(
                data,
                expect.objectContaining({ actorUid: userUid, capabilities: userCaps })
            );
        });

        it('🔴 doit rejeter avec une erreur 403 si l oiseau n a pas l aura/les capacités requises', async () => {
            const userCaps = ['some:other:capability'];
            const userUid = 'bird_weak_1';
            const data = { name: 'Nid Serein' };

            await expect(MutationService.createNest(data, userCaps, userUid)).rejects.toThrow(IlotError);
            
            try {
                await MutationService.createNest(data, userCaps, userUid);
            } catch (err: any) {
                // On accepte soit statusCode, soit code selon l'implémentation de l'IlotError
                expect(err.statusCode === 403 || err.code === 403 || err.code === 'FORBIDDEN').toBe(true);
            }
            
            expect(syncService.teams.fosterTeam).not.toHaveBeenCalled();
        });

        it('🔴 doit rejeter avec une erreur 400 si le nom du nid ne passe pas la vérification morale', async () => {
            const userCaps = ['*']; 
            const userUid = 'bird_dark_1';
            // 💡 On utilise un mot interdit par le vrai MoralChecker (ex: "haine") pour déclencher le refus
            const data = { name: 'Haine Eternelle' };

            await expect(MutationService.createNest(data, userCaps, userUid)).rejects.toThrow(IlotError);

            try {
                await MutationService.createNest(data, userCaps, userUid);
            } catch (err: any) {
                expect(err.statusCode === 400 || err.code === 400 || err.code === 'BAD_REQUEST').toBe(true);
            }

            expect(syncService.teams.fosterTeam).not.toHaveBeenCalled();
        });
    });

    describe('triggerCaprice', () => {
        it('🟢 doit déclencher une fluctuation de l oiseau avec succès en forgeant une signature par défaut si absente', async () => {
            const oiseauUid = 'bird_1';
            const color = '#2A3B4C';
            const entropy = 5;

            vi.mocked(syncService.oiseaux.appliquerFluctuation).mockResolvedValueOnce(true as any);

            await MutationService.triggerCaprice(oiseauUid, color, entropy);

            expect(syncService.oiseaux.appliquerFluctuation).toHaveBeenCalledWith(
                oiseauUid,
                entropy,
                expect.objectContaining({ actorUid: oiseauUid, capabilities: ['*'] }),
                color
            );
        });
    });

    describe('sealProject', () => {
        it('🟢 doit sceller un projet en déléguant à fosterProject avec la bonne signature', async () => {
            const userCaps = ['*'];
            const userUid = 'bird_architect_1';
            const projectData = { title: 'Îlot Zoizos' };

            vi.mocked(syncService.projects.fosterProject).mockResolvedValueOnce({ 
                uid: 'proj_1',
                success: true,
                status: 'success',
                mongo: {},
                neo4j: {}
            } as any);

            const result = await MutationService.sealProject(projectData, userCaps, userUid);

            expect(result).toHaveProperty('uid', 'proj_1');
            expect(syncService.projects.fosterProject).toHaveBeenCalledWith(
                projectData,
                { actorUid: userUid, capabilities: userCaps }
            );
        });
    });

    describe('moveTask', () => {
        it('🟢 doit déplacer une tâche Kanban en utilisant updateTask', async () => {
            const userCaps = ['*'];
            const userUid = 'bird_worker_1';
            const taskUid = 'task_99';
            const newStatus = 'DONE';

            vi.mocked(syncService.kanban.updateTask).mockResolvedValueOnce(true as any);

            await MutationService.moveTask(taskUid, newStatus, userCaps, userUid);

            expect(syncService.kanban.updateTask).toHaveBeenCalledWith(
                taskUid,
                { status: newStatus },
                { actorUid: userUid, capabilities: userCaps }
            );
        });
    });
});