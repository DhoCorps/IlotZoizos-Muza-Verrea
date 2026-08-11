import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tasks/[slug]/irrigate/route';
import { getServerSession } from 'next-auth/next';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

// -------------------------------------------------------------------------
// 🧪 TESTS
// -------------------------------------------------------------------------
describe('Route API : Irrigation Tâche (POST /api/tasks/[slug]/irrigate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TaskIrrigationOrchestrator
    vi.spyOn(TaskIrrigationOrchestrator.prototype, 'processTaskIrrigation').mockResolvedValue({
      status: 'irrigated',
      healthy: true,
    } as any);
  });

  it('doit rejeter (401) si l\'utilisateur n\'est pas connecté', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'my-task' }) });
    
    expect(response.status).toBe(401);
  });

  it('doit réussir (200) l\'irrigation et invalider les tags de cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'my-task' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('irrigated');
    
    // 💥 Vérification de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('tasks');
    expect(revalidateTag).toHaveBeenCalledWith('task-my-task');
  });
});