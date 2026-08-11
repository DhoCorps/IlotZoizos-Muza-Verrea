import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SovereignPurgeWorker } from '../sovereign.purge.worker';
import { SystemPurgeJobModel } from '@ilot/infrastructure';

// 1. On mocke l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  SystemPurgeJobModel: {
    findOneAndUpdate: vi.fn()
  }
}));

// 2. On crée un faux orchestrateur pour le mock
const mockExecute = vi.fn().mockResolvedValue(true);

vi.mock('../sovereign.purge.orchestrator', () => {
  return {
    SovereignPurgeOrchestrator: class {
      executeSovereignPurge = mockExecute;
    }
  };
});

describe('SovereignPurgeWorker - L\'Exécuteur de l\'Ombre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit traiter un job en attente et le marquer comme COMPLETED', async () => {
    const mockJob = {
      entityId: 'bird_test',
      reason: 'VIOLATION',
      actorUid: 'admin_1',
      capabilities: ['ROLE_SOVEREIGN'],
      status: 'PROCESSING',
      save: vi.fn().mockResolvedValue(true)
    };

    vi.mocked(SystemPurgeJobModel.findOneAndUpdate).mockResolvedValue(mockJob as any);
    mockExecute.mockResolvedValueOnce(true); // On s'assure du succès

    await SovereignPurgeWorker.processPendingJobs();

    expect(SystemPurgeJobModel.findOneAndUpdate).toHaveBeenCalledWith(
      { status: 'PENDING' },
      { status: 'PROCESSING' },
      expect.any(Object)
    );
    expect(mockJob.status).toBe('COMPLETED');
    expect(mockJob.save).toHaveBeenCalled();
  });

  it('🔴 doit capturer l\'erreur et marquer le job comme FAILED si l\'orchestrateur plante', async () => {
    const mockJob = {
      entityId: 'bird_fail',
      status: 'PROCESSING',
      save: vi.fn().mockResolvedValue(true)
    };

    vi.mocked(SystemPurgeJobModel.findOneAndUpdate).mockResolvedValue(mockJob as any);
    
    // On force l'erreur sur notre faux orchestrateur pour ce test précis
    mockExecute.mockRejectedValueOnce(new Error('Erreur de destruction'));

    await SovereignPurgeWorker.processPendingJobs();

    expect(mockJob.status).toBe('FAILED');
    expect((mockJob as any).errorPayload).toBe('Erreur de destruction');
    expect(mockJob.save).toHaveBeenCalled();
  });
});