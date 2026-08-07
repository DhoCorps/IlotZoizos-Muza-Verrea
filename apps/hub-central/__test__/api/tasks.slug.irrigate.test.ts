import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tasks/[slug]/irrigate/route'; // Ajuste le chemin selon ton arborescence
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@ilot/infrastructure';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  TaskIrrigationOrchestrator: vi.fn().mockImplementation(() => ({
    processTaskIrrigation: vi.fn(),
  })),
}));

describe('Task Irrigation Slug API [POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/tasks/ma-tache/irrigate', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Oiseau non identifié');
  });

  it('devrait réussir (200) et déclencher l irrigation via l orchestrateur avec slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const mockProcessIrrigation = vi.fn().mockResolvedValueOnce({ success: true, irrigated: true });
    vi.mocked(TaskIrrigationOrchestrator).mockImplementationOnce(() => ({
      processTaskIrrigation: mockProcessIrrigation,
    } as any));

    const req = new Request('http://localhost/api/tasks/Ma Super Tache!/irrigate', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'Ma Super Tache!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProcessIrrigation).toHaveBeenCalledWith(
      'ma-super-tache',
      {
        actorUid: 'user-bird-1',
        capabilities: [],
      }
    );
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });
});