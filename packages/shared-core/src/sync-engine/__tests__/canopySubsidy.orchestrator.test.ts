import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopySubsidyOrchestrator } from '../canopySubsidy.orchestrator';
import { SubsidyModel } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mocks
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SubsidyModel: {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
    }
  };
});

vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: {
    transfer: vi.fn().mockResolvedValue(true)
  }
}));

// Mock indispensable du TransactionManager pour isoler Mongo et Neo4j
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('CanopySubsidyOrchestrator - Système de Subventions & Graphe', () => {
  let orchestrator: CanopySubsidyOrchestrator;
  const signature = { actorUid: 'bird_voter_1', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new CanopySubsidyOrchestrator();
  });

  it('🟢 doit fonder une subvention et lier l\'auteur dans le graphe (fosterSubsidy)', async () => {
    vi.mocked(SubsidyModel.create).mockResolvedValue([{ uid: 'sub_new', title: 'Nouveau Projet' }] as any);

    const payload = {
      title: 'Nouveau Projet',
      motivation: 'Pour la communauté',
      requestedAmount: 500,
      currency: 'TOX'
    };

    const result = await orchestrator.fosterSubsidy(payload, signature);

    expect(result.uid).toBe('sub_new');
    expect(SubsidyModel.create).toHaveBeenCalled();
  });

  it('🟢 doit permettre à un oiseau de voter et générer l\'arête :VOTED_FOR (castVote)', async () => {
    const mockSubsidy = {
      uid: 'sub_1',
      voteCount: 0,
      voterUids: [],
      save: vi.fn().mockResolvedValue(true)
    };
    
    vi.mocked(SubsidyModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(mockSubsidy)
    } as any);

    await orchestrator.castVote('sub_1', signature);

    expect(mockSubsidy.voteCount).toBe(1);
    expect(mockSubsidy.voterUids).toContain('bird_voter_1');
    expect(mockSubsidy.save).toHaveBeenCalled();
  });

  it('🔴 ne doit pas compter deux fois le vote d\'un même oiseau (IlotError CONFLICT)', async () => {
    const mockSubsidy = {
      uid: 'sub_1',
      voteCount: 1,
      voterUids: ['bird_voter_1'], // L'oiseau a déjà voté
      save: vi.fn()
    };
    
    vi.mocked(SubsidyModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(mockSubsidy)
    } as any);

    await expect(orchestrator.castVote('sub_1', signature)).rejects.toThrow(IlotError);
    expect(mockSubsidy.voteCount).toBe(1); // Pas d'incrément
    expect(mockSubsidy.save).not.toHaveBeenCalled();
  });

  it('🟢 doit exécuter un tirage et verser la dotation au gagnant', async () => {
    const mockWinner = {
      uid: 'sub_win',
      requesterUid: 'bird_winner',
      requestedAmount: 100,
      currency: 'TOX',
      title: 'Projet Test',
      status: 'PENDING',
      voteCount: 15, // Suffisant pour le topTier
      save: vi.fn().mockResolvedValue(true)
    };
    
    vi.mocked(SubsidyModel.find).mockResolvedValue([mockWinner] as any);

    // Force le tirage à toujours retourner le gagnant (bypass de l'aléatoire)
    vi.spyOn(orchestrator as any, 'weightedRandomDraw').mockReturnValue(mockWinner);

    await orchestrator.executeMonthlyDraw();

    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalled();
    expect(mockWinner.status).toBe('PAID');
    expect(mockWinner.save).toHaveBeenCalled();
  });
});