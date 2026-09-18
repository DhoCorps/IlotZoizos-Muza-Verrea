import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tasks/route';
import { TaskModel, ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';

// 🛡️ Mocks globaux
vi.mock('@ilot/infrastructure', () => ({
    TaskModel: {
        find: vi.fn(),
        findOne: vi.fn(),
    },
    ProjectModel: {
        findOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
}));

// 🪄 Mock de la classe TaskOrchestrator avec prototype fonctionnel
vi.mock('@ilot/shared-core', () => {
    return {
        TaskOrchestrator: class {
            fosterTask = vi.fn().mockResolvedValue({ uid: 'task_new_123', name: 'Atome Forgé' });
        }
    };
});

// 🛡️ Simulation du decorateur withAura pour injecter un utilisateur valide et handleRouteError
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
        const currentUser = { uid: 'bird_123', capabilities: ['*'] };
        return handler(req, context, currentUser);
    },
    handleRouteError: (error: unknown, context: string) => {
        const err = error as Error;
        console.error(`[${context}]`, err);
        return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}));

vi.mock('next/cache', () => ({
    unstable_cache: (fn: Function) => fn,
    revalidateTag: vi.fn(),
}));

describe('Route API : Atomes (Tasks) /api/tasks', () => {
    let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        delete global.__mockUser;
        mockNeoSession = {
            run: vi.fn().mockResolvedValue({ records: [] }),
            close: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as unknown as ReturnType<typeof getNeo4jSession>);
    });

    it('🟢 GET : doit renvoyer les tâches avec succès', async () => {
        vi.mocked(TaskModel.find).mockReturnValue({
            sort: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{ uid: 'task_1', title: 'Tâche Test' }])
            })
        } as unknown as ReturnType<typeof TaskModel.find>);

        const req = new NextRequest('http://localhost:3000/api/tasks');

        const res = await GET(req, { params: Promise.resolve({}) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data[0].uid).toBe('task_1');
    });

    it('🟢 POST : doit créer un nouvel atome/tâche si autorisé et validé par Zod', async () => {
        vi.mocked(ProjectModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ uid: 'proj_123', creatorUid: 'bird_123' })
        } as unknown as ReturnType<typeof ProjectModel.findOne>);

        const req = new NextRequest('http://localhost:3000/api/tasks', {
            method: 'POST',
            body: JSON.stringify({ projectUid: 'proj_123', title: 'Nouvel Atome' }),
            headers: { 'Content-Type': 'application/json' },
        });

        const res = await POST(req, { params: Promise.resolve({}) });
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.uid).toBe('task_new_123');
    });
});