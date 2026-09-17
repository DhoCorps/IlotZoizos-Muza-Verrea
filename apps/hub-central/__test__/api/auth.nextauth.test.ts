import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/auth/[...nextauth]/route';

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api-guards')>();
    return {
        ...actual,
        withSilice: (handler: unknown) => handler, // On court-circuite le wrapper pour isoler les tests
    };
});

vi.mock('next-auth', () => ({
    __esModule: true,
    default: vi.fn(() => async (req: Request) => {
        // Simulation d'une réponse JSON de NextAuth (ex: session)
        if (req.url.includes('session')) {
            return new Response(JSON.stringify({ status: 'mocked-auth-ok' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // Simulation d'une redirection ou réponse texte
        return new Response('Redirecting', {
            status: 302,
            headers: { 'Content-Type': 'text/plain' },
        });
    }),
}));

// Typage strict du handler pour éviter le cast `any`
type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

describe('API Route: /api/auth/[...nextauth]', () => {
    const getHandler = GET as unknown as RouteHandler;
    const postHandler = POST as unknown as RouteHandler;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 [GET] doit répondre correctement (200) pour une session JSON', async () => {
        const req = new Request('http://localhost:3000/api/auth/session', {
            method: 'GET',
        });

        const res = await getHandler(req, {});
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toEqual({ status: 'mocked-auth-ok' });
    });

    it('🟢 [POST] doit gérer correctement les réponses non-JSON (ex: redirections)', async () => {
        const req = new Request('http://localhost:3000/api/auth/signin/google', {
            method: 'POST',
            body: JSON.stringify({ provider: 'google' }),
        });

        const res = await postHandler(req, {});
        const text = await res.text();

        expect(res.status).toBe(302);
        expect(text).toBe('Redirecting');
    });
});