import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EconomyService } from '../economy.services'; // Ajuste le chemin selon ton arborescence
import { OiseauInventoryModel } from '../../models/nosql/userInventory.model';

// Mock du modèle Mongoose
vi.mock('../../models/nosql/userInventory.model', () => ({
    OiseauInventoryModel: {
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));

describe('EconomyService (L\'Économie de la Canopée)', () => {
    let mockInventoryDoc: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Création d'un faux document inventaire simulant un objet Mongoose avec une méthode .save()
        mockInventoryDoc = {
            userUid: 'bird_test_1',
            parchemins: 10,
            plumes: 10,
            vinyles: 10,
            sampleNotes: 5,
            totamtoes: 50,
            alveoleLevel: 1,
            unlockedUnlocks: [],
            updatedAt: new Date(),
            save: vi.fn().mockResolvedValue(true),
        };
    });

    describe('getInventory', () => {
        it('🟢 doit récupérer un inventaire existant', async () => {
            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            const inventory = await EconomyService.getInventory('bird_test_1');

            expect(OiseauInventoryModel.findOne).toHaveBeenCalledWith({ userUid: 'bird_test_1' });
            expect(inventory.userUid).toBe('bird_test_1');
        });

        it('🟢 doit initialiser un nouvel inventaire avec le pécule de départ si aucun n existe', async () => {
            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(null);
            vi.mocked(OiseauInventoryModel.create).mockResolvedValueOnce(mockInventoryDoc);

            const inventory = await EconomyService.getInventory('bird_new_1');

            expect(OiseauInventoryModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userUid: 'bird_new_1',
                    parchemins: 5,
                    plumes: 5,
                    vinyles: 2,
                    totamtoes: 10,
                    alveoleLevel: 1,
                    unlockedUnlocks: [],
                })
            );
            expect(inventory).toBeDefined();
        });
    });

    describe('addResources', () => {
        it('🟢 doit ajouter correctement des ressources à l inventaire de l oiseau', async () => {
            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            const updated = await EconomyService.addResources('bird_test_1', {
                parchemins: 5,
                totamtoes: 20,
            });

            expect(updated.parchemins).toBe(15); // 10 initial + 5
            expect(updated.totamtoes).toBe(70); // 50 initial + 20
            expect(mockInventoryDoc.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('upgradeAlveole', () => {
        it('🟢 doit permettre d agrandir l Alvéole si les ressources sont suffisantes (Niveau 1 -> 2)', async () => {
            mockInventoryDoc.alveoleLevel = 1;
            mockInventoryDoc.parchemins = 20;
            mockInventoryDoc.plumes = 20;
            mockInventoryDoc.vinyles = 10;
            mockInventoryDoc.totamtoes = 40;

            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            const upgraded = await EconomyService.upgradeAlveole('bird_test_1');

            expect(upgraded.alveoleLevel).toBe(2);
            // Vérifie que les coûts (Niveau 2 : 10 parchemins, 10 plumes, 5 vinyles, 20 totamtoes) ont été déduits
            expect(upgraded.parchemins).toBe(10);
            expect(upgraded.plumes).toBe(10);
            expect(upgraded.vinyles).toBe(5);
            expect(upgraded.totamtoes).toBe(20);
            expect(mockInventoryDoc.save).toHaveBeenCalledTimes(1);
        });

        it('🔴 doit rejeter l expansion si les ressources sont insuffisantes', async () => {
            mockInventoryDoc.alveoleLevel = 1;
            mockInventoryDoc.parchemins = 2; // Trop bas (coût = 10)

            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            await expect(EconomyService.upgradeAlveole('bird_test_1')).rejects.toThrow(
                "Ressources insuffisantes dans l'Alvéole pour lancer cette expansion architecturale !"
            );
            expect(mockInventoryDoc.save).not.toHaveBeenCalled();
        });

        it('🔴 doit lever une erreur si l Alvéole a déjà atteint son niveau maximal (4)', async () => {
            mockInventoryDoc.alveoleLevel = 4;

            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            await expect(EconomyService.upgradeAlveole('bird_test_1')).rejects.toThrow(
                "L'Alvéole a déjà atteint sa forme légendaire (Caverne aux Trésors Ultime)."
            );
        });
    });

    describe('unlockFeature', () => {
        it('🟢 doit déverrouiller un outil valide (ex: letrin_bucket) si le stock le permet', async () => {
            mockInventoryDoc.plumes = 20; // Coût = 15

            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            const result = await EconomyService.unlockFeature('bird_test_1', 'letrin_bucket');

            expect(result.unlockedUnlocks).toContain('letrin_bucket');
            expect(result.plumes).toBe(5); // 20 - 15
            expect(mockInventoryDoc.save).toHaveBeenCalledTimes(1);
        });

        it('🔴 doit rejeter le déblocage si l outil est déjà possédé', async () => {
            mockInventoryDoc.unlockedUnlocks = ['letrin_bucket'];

            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            await expect(EconomyService.unlockFeature('bird_test_1', 'letrin_bucket')).rejects.toThrow(
                "Vous possédez déjà cette capacité."
            );
        });

        it('🔴 doit rejeter le déblocage si l artefact demandé n existe pas dans le registre', async () => {
            vi.mocked(OiseauInventoryModel.findOne).mockResolvedValueOnce(mockInventoryDoc);

            await expect(EconomyService.unlockFeature('bird_test_1', 'artefact_inconnu')).rejects.toThrow(
                "Cet artefact ou outil n'existe pas dans le registre de l'Îlot."
            );
        });
    });
});