import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DlqRetryOrchestrator } from '../dqlRetry.orchestrator';
import { SystemGraphDlqModel, getNeo4jDriver } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SystemGraphDlqModel: {
      find: vi.fn()
    },
    getNeo4jDriver: vi.fn()
  };
});

describe('DlqRetryOrchestrator - Réconciliation de la Matrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit résoudre avec succès les tâches en attente si Neo4j répond via session mutualisée et executeWrite', async () => {
    const mockEntry = {
      operationName: 'Test_Op',
      retryCount: 0,
      status: 'PENDING_RETRY',
      save: vi.fn().mockResolvedValue(true)
    };

    // 🛡️ Mise à jour du mock pour inclure le chaînage .sort().limit()
    vi.mocked(SystemGraphDlqModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockEntry])
    } as any);

    const mockSession = {
      executeWrite: vi.fn(async (cb) => cb({ run: vi.fn().mockResolvedValue(true) })),
      close: vi.fn().mockResolvedValue(true)
    };
    vi.mocked(getNeo4jDriver).mockReturnValue({
      session: vi.fn().mockReturnValue(mockSession)
    } as any);

    const result = await DlqRetryOrchestrator.processDlqBatch();

    expect(result.processed).toBe(1);
    expect(result.resolved).toBe(1);
    expect(mockEntry.status).toBe('RESOLVED');
    expect(mockEntry.save).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalledTimes(1); // Vérifie la fermeture unique globale
  });

  it('🔴 doit incrémenter le retryCount et marquer en FAILED_PERMANENTLY si le max d’essais est atteint', async () => {
    const mockEntry = {
      operationName: 'Fail_Op',
      retryCount: 2, // Plus qu'un essai avant le max (3)
      status: 'PENDING_RETRY',
      save: vi.fn().mockResolvedValue(true)
    };

    // 🛡️ Mise à jour du mock pour inclure le chaînage .sort().limit()
    vi.mocked(SystemGraphDlqModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockEntry])
    } as any);

    const mockSession = {
      executeWrite: vi.fn().mockRejectedValue(new Error('Neo4j down')),
      close: vi.fn().mockResolvedValue(true)
    };
    vi.mocked(getNeo4jDriver).mockReturnValue({
      session: vi.fn().mockReturnValue(mockSession)
    } as any);

    const result = await DlqRetryOrchestrator.processDlqBatch(3);

    expect(result.processed).toBe(1);
    expect(result.resolved).toBe(0);
    expect(mockEntry.retryCount).toBe(3);
    expect(mockEntry.status).toBe('FAILED_PERMANENTLY');
    expect(mockEntry.save).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});