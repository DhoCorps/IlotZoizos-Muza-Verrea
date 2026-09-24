import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tom-hat-toes/tasks/[slug]/irrigate/route';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
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
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 TESTS
// -------------------------------------------------------------------------
describe('Route API : Irrigation Tâche (POST /api/tom-hat-toes/tasks/[slug]/irrigate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TaskIrrigationOrchestrator
    vi.spyOn(TaskIrrigationOrchestrator.prototype, 'processTaskIrrigation').mockResolvedValue({
      status: 'irrigated',
      healthy: true,
    } as unknown as Awaited<ReturnType<TaskIrrigationOrchestrator['processTaskIrrigation']>>);
  });

  it('doit rejeter (401) si l\'utilisateur n\'est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/tom-hat-toes/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'my-task' }) });
    
    expect(response.status).toBe(401);
  });

  it('doit renvoyer 404 si la tâche est introuvable', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/tasks/inconnue/irrigate', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'inconnue' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('Tâche introuvable');
  });

  it('doit réussir (200) l\'irrigation et invalider les tags de cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'task_abc',
      slug: 'my-task',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/tasks/my-task/irrigate', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'my-task' }) });
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