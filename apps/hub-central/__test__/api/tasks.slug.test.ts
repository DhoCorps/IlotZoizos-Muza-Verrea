import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/tasks/[slug]/route';
import { TaskModel, getNeo4jSession, findEntityBySlugOrUid } from '@ilot/infrastructure';

// 🛡️ Mocks globaux de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
    return {
        ...actual,
        connectToDatabase: vi.fn().mockResolvedValue(true),
        TaskModel: {
            findOne: vi.fn(),
        },
        getNeo4jSession: vi.fn(),
        findEntityBySlugOrUid: vi.fn(),
    };
});

// 🪄 Mock du cache des tâches pour éviter les appels réels
vi.mock('@/lib/cache/tasks.cache', () => ({
    getCachedTaskDetails: vi.fn(),
}));

// 🪄 Mock de la classe TaskOrchestrator
vi.mock('@ilot/shared-core', () => {
    return {
        TaskOrchestrator: class {
            updateTask = vi.fn().mockResolvedValue({ uid: 'task_123', name: 'Atome Muté' });
            disintegrateTask = vi.fn().mockResolvedValue(true);
        }
    };
});

// 🛡️ Simulation de l'API Guard withAura
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: any) => async (req: Request, context: any) => {
        const currentUser = { uid: 'bird_123', capabilities: ['*'] };
        return handler(req, context, currentUser);
    },
}));

vi.mock('@/lib/slugify', () => ({
    slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidateTag: vi.fn(),
}));

import { getCachedTaskDetails } from '@/lib/cache/tasks.cache';

describe('Route API : Atome Individuel ([slug])', () => {
    let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        delete (global as any).__mockUser;
        mockNeoSession = {
            run: vi.fn().mockResolvedValue({ records: [] }),
            close: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as any);
    });

    it('🟢 GET : doit ausculter l\'atome via le cache avec succès', async () => {
        vi.mocked(getCachedTaskDetails).mockResolvedValueOnce({
            task: { uid: 'task_123', title: 'Atome Silice' },
            caps: ['*']
        } as any);

        const req = new Request('http://localhost:3000/api/tasks/task_123');
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await GET(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.uid).toBe('task_123');
        // Le GET résout par le cache, donc la session Neo4j locale n'est pas ouverte inutilement ici.
    });

    it('🟢 PATCH : doit faire muter l\'atome, renvoyer les données et fermer la session Neo4j', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
            uid: 'task_123',
            slug: 'task_123',
        } as any);

        const req = new Request('http://localhost:3000/api/tasks/task_123', {
            method: 'PATCH',
            body: JSON.stringify({ title: 'Mutation de l Atome' }),
            headers: { 'Content-Type': 'application/json' },
        });
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await PATCH(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.name).toBe('Atome Muté');
        expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TaskModel, 'task_123');
        expect(mockNeoSession.close).toHaveBeenCalledTimes(1); // 🛡️ Vérification de la fermeture de session
    });

    it('🟢 DELETE : doit désintégrer l\'atome avec succès et fermer la session Neo4j', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
            uid: 'task_123',
            slug: 'task_123',
        } as any);

        const req = new Request('http://localhost:3000/api/tasks/task_123', {
            method: 'DELETE',
        });
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await DELETE(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.message).toContain('poussière du Nexus');
        expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TaskModel, 'task_123');
        expect(mockNeoSession.close).toHaveBeenCalledTimes(1); // 🛡️ Vérification de la fermeture de session
    });
});