// packages/shared-core/src/sync-engine/__tests__/sujet.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SujetOrchestrator } from '../sujet.orchestrator';
import { SujetModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', () => ({
  SujetModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'node_mock' }] }) })),
  },
}));

describe('SujetOrchestrator - Atelier de Pensée (Monologues)', () => {
  let orchestrator: SujetOrchestrator;
  const adminSignature = { actorUid: 'admin_1', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_author', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SujetOrchestrator();
  });

  describe('fosterSujet', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'est pas l\'auteur et n\'a pas la capacité root', async () => {
      await expect(
        orchestrator.fosterSujet({ authorUid: 'other_bird' }, userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit forger un sujet dans MongoDB et Neo4j avec succès', async () => {
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce(null)
      } as any);

      vi.mocked(SujetModel.create).mockResolvedValueOnce([
        { uid: 'sujet_1', title: 'Pensée Silencieuse', slug: 'pensee-silencieuse', authorUid: 'bird_author' }
      ] as any);

      const res = await orchestrator.fosterSujet({ title: 'Pensée Silencieuse', authorUid: 'bird_author' }, userSignature as any);
      
      expect(res.mongo.uid).toBe('sujet_1');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSujet', () => {
    it('🔴 doit rejeter (404) si le sujet est introuvable (par uid ou slug)', async () => {
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(null);
      await expect(
        orchestrator.updateSujet('inconnu', {}, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit mettre à jour un sujet par son slug ou son uid avec succès', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author' };
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(mockSujet as any);
             
      vi.mocked(SujetModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockSujet, title: 'Updated' })
      } as any);

      const res = await orchestrator.updateSujet('mon-sujet', { title: 'Updated' }, userSignature as any);
      
      expect(res.mongo.title).toBe('Updated');
    });
  });

  describe('disintegrateSujet', () => {
    it('🔴 doit rejeter (403) si l\'acteur n\'est ni l\'auteur ni admin', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author' };
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(mockSujet as any);

      await expect(
        orchestrator.disintegrateSujet('mon-sujet', { actorUid: 'intruder', capabilities: [] } as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit désintégrer le sujet avec succès si l\'acteur est l\'auteur', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author' };
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(mockSujet as any);
      vi.mocked(SujetModel.deleteOne).mockResolvedValueOnce({ deletedCount: 1 } as any);

      const res = await orchestrator.disintegrateSujet('mon-sujet', userSignature as any);
      
      expect(res.success).toBe(true);
    });
  });
});