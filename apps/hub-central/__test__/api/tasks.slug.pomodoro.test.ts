import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tasks/[slug]/pomodoro/route';
import { TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

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
    TaskModel: { findOne: vi.fn() },
    findEntityBySlugOrUid: vi.fn(),
    getNeo4jSession: vi.fn(),
  };
});

declare global {
  var __mockUser: any;
}

describe('Route API : Pomodoro (POST /api/tasks/[slug]/pomodoro)', () => {
  let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
    mockNeoSession = {
      run: vi.fn().mockResolvedValue({ records: [{ get: () => true }] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as any);
  });

  it('doit rejeter (401) si l\'utilisateur n\'est pas connecté', async () => {
    const req = new Request('http://localhost/api/tasks/my-task/pomodoro', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'my-task' }) });
    expect(response.status).toBe(401);
  });

  it('doit renvoyer 404 si l\'atome est introuvable', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/tasks/inconnue/pomodoro', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'inconnue' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('Atome introuvable');
  });

  it('doit valider le cycle Pomodoro avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'task_123',
      slug: 'ma-tache',
    } as any);

    vi.spyOn(TaskOrchestrator.prototype, 'completePomodoro').mockResolvedValueOnce({
      uid: 'task_123',
      pomodoros: { estimated: 2, completed: 1 }
    } as any);

    const req = new Request('http://localhost/api/tasks/ma-tache/pomodoro', { method: 'POST' });
    const response = await POST(req as any, { params: Promise.resolve({ slug: 'ma-tache' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pomodoros.completed).toBe(1);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TaskModel, 'ma-tache');

    expect(revalidateTag).toHaveBeenCalledWith('tasks');
    expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    expect(revalidateTag).toHaveBeenCalledWith('task-task_123');
  });
});