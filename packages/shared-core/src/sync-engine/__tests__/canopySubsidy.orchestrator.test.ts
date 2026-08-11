// packages/shared-core/src/sync-engine/__tests__/canopySubsidy.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopySubsidyOrchestrator } from '../canopySubsidy.orchestrator';
import { SubsidyModel } from '../../../../infrastructure/src/database/models/nosql/subsidy.model';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';

// 🛡️ Mocks
vi.mock('../../../../infrastructure/src/database/models/nosql/subsidy.model', () => ({
  SubsidyModel: {
    findById: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: {
    transfer: vi.fn().mockResolvedValue(true)
  }
}));

describe('CanopySubsidyOrchestrator - Système de Subventions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit permettre à un oiseau de voter et incrémenter le voteCount', async () => {
    const mockSubsidy = {
      _id: 'sub_1',
      voteCount: 0,
      voterUids: [],
      save: vi.fn().mockResolvedValue(true)
    };
    vi.mocked(SubsidyModel.findById).mockResolvedValue(mockSubsidy);

    await CanopySubsidyOrchestrator.voteForSubsidy('sub_1', 'bird_voter_1');

    expect(mockSubsidy.voteCount).toBe(1);
    expect(mockSubsidy.voterUids).toContain('bird_voter_1');
  });

  it('🔴 ne doit pas compter deux fois le vote d\'un même oiseau', async () => {
    const mockSubsidy = {
      _id: 'sub_1',
      voteCount: 1,
      voterUids: ['bird_voter_1'],
      save: vi.fn()
    };
    vi.mocked(SubsidyModel.findById).mockResolvedValue(mockSubsidy);

    await CanopySubsidyOrchestrator.voteForSubsidy('sub_1', 'bird_voter_1');

    expect(mockSubsidy.voteCount).toBe(1); // Pas d'incrément
  });

  it('🟢 doit exécuter un tirage et verser la dotation au gagnant', async () => {
    const mockWinner = {
      _id: 'sub_1',
      requesterUid: 'bird_winner',
      requestedAmount: 100,
      currency: 'TOX',
      title: 'Projet Test',
      status: 'PENDING',
      voteCount: 15, // Pour qu'il soit dans topTier
      save: vi.fn().mockResolvedValue(true)
    };
    
    vi.mocked(SubsidyModel.find).mockResolvedValue([mockWinner]);

    // Force le tirage à toujours retourner le gagnant si nécessaire
    vi.spyOn(CanopySubsidyOrchestrator as any, 'weightedRandomDraw').mockReturnValue(mockWinner);

    await CanopySubsidyOrchestrator.executeMonthlyDraw();

    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalled();
    expect(mockWinner.status).toBe('PAID');
    });
});