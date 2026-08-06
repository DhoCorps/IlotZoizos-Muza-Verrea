import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/tasks/[slug]/irrigate/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockConnectToDatabase = vi.fn().mockResolvedValue(true);
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args)
}));

const mockProcessTaskIrrigation = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  TaskIrrigationOrchestrator: vi.fn().mockImplementation(() => ({
    processTaskIrrigation: mockProcessTaskIrrigation
  }))
}));

describe('API Tasks - Irrigation de l’Atome (/api/tasks/[slug]/irrigate)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'task-atom-42' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  it('🔴 doit rejeter la requête si l’Oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/tasks/task-atom-42/irrigate', {
      method: 'POST'
    });

    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
    mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice en panne"));
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_sovereign', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api/tasks/task-atom-42/irrigate', {
      method: 'POST'
    });

    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("Silice est injoignable");
  });

  it('🔥 doit gérer une défaillance de l’orchestrateur de sève (500)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_sovereign', capabilities: ['*'] }
    } as any);

    mockProcessTaskIrrigation.mockRejectedValueOnce(new Error("Flux de sève bloqué par une dépendance rompue."));

    const req = new Request('http://localhost/api/tasks/task-atom-42/irrigate', {
      method: 'POST'
    });

    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("Flux de sève bloqué");
  });

  it('🟢 doit exécuter l’irrigation de la sève avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_sovereign', capabilities: ['*'] }
    } as any);

    const expectedPayload = {
      success: true,
      taskUid: 'task-atom-42',
      irrigationStatus: 'ACTIVE',
      flowRate: 1
    };

    mockProcessTaskIrrigation.mockResolvedValueOnce(expectedPayload);

    const req = new Request('http://localhost/api/tasks/task-atom-42/irrigate', {
      method: 'POST'
    });

    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.irrigationStatus).toBe('ACTIVE');
    expect(mockProcessTaskIrrigation).toHaveBeenCalledWith('task-atom-42', {
      actorUid: 'bird_sovereign',
      capabilities: ['*']
    });
  });
});