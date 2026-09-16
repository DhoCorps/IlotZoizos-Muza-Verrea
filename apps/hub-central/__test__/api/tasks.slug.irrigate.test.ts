import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tasks/[slug]/irrigate/route';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    TaskModel: {
      findOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: any;
}

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
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'my-task' }) });
    
    expect(response.status).toBe(401);
  });

  it('doit renvoyer 404 si la tâche est introuvable', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/tasks/inconnue/irrigate', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'inconnue' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('Tâche introuvable');
  });

  it('doit réussir (200) l\'irrigation et invalider les tags de cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'task_abc',
      slug: 'my-task',
    } as any);

    const req = new Request('http://localhost/api/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'my-task' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('irrigated');
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TaskModel, 'my-task');
    
    // 💥 Vérification de l'invalidation du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('tasks');
    expect(revalidateTag).toHaveBeenCalledWith('task-my-task');
    expect(revalidateTag).toHaveBeenCalledWith('task-task_abc');
  });
});