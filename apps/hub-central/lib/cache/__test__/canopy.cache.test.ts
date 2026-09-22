import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedSubsidies, 
  executeCachedVote, 
  getCachedCanopyStats, 
  getCachedAwards 
} from '@/lib/cache/canopy.cache';
import { SubsidyModel, MessageModel, CanopyAwardModel } from '@ilot/infrastructure';
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  SubsidyModel: {
    find: vi.fn(),
  },
  MessageModel: {
    findOne: vi.fn(),
  },
  CanopyAwardModel: {
    find: vi.fn(),
  },
}));

// 🛡️ Mock de la classe ES6 CanopySubsidyOrchestrator et de sa méthode d'instance castVote
const mockCastVote = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  CanopySubsidyOrchestrator: class {
    castVote = mockCastVote;
  },
}));

describe('Cache : Canopy Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit récupérer la liste des subventions en environnement de test', async () => {
    const mockSubsidies = [{ uid: 'sub_1', title: 'Aide studio' }];
    vi.mocked(SubsidyModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockSubsidies),
        }),
      }),
    } as any);

    const result = await getCachedSubsidies();

    expect(result).toEqual(mockSubsidies);
    expect(SubsidyModel.find).toHaveBeenCalledWith({});
  });

  it('doit exécuter le vote de subvention directement en mode test via l\'orchestrateur', async () => {
    mockCastVote.mockResolvedValueOnce(undefined as any);

    await executeCachedVote('sub_1', 'bird_test_1');

    expect(mockCastVote).toHaveBeenCalledWith('sub_1', {
      actorUid: 'bird_test_1',
      capabilities: []
    });
  });

  it('doit récupérer les stats globales de la canopée', async () => {
    const mockStat = { message: 'Bilan OK', isSystemBroadcast: true };
    vi.mocked(MessageModel.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockStat),
        }),
      }),
    } as any);

    const result = await getCachedCanopyStats();

    expect(result).toEqual(mockStat);
    expect(MessageModel.findOne).toHaveBeenCalledWith({ isSystemBroadcast: true });
  });

  it('doit récupérer les awards filtrés par mois ou globaux', async () => {
    const mockAwards = [{ uid: 'award_1', yearMonth: '2026-03' }];
    vi.mocked(CanopyAwardModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockAwards),
        }),
      }),
    } as any);

    const result = await getCachedAwards('2026-03');

    expect(result).toEqual(mockAwards);
    expect(CanopyAwardModel.find).toHaveBeenCalledWith({ yearMonth: '2026-03' });
  });
});