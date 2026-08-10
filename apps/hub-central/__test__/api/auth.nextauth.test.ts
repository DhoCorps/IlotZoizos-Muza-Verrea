import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/auth/[...nextauth]/route';

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX (Hissés automatiquement par Vitest)
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
    withSilice: (handler: any) => handler,
}));

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

describe('API Route: /api/auth/[...nextauth]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 [GET] doit répondre correctement (200) pour une session JSON', async () => {
        const req = new Request('http://localhost:3000/api/auth/session', {
            method: 'GET',
        });

        const res = await GET(req as any);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toEqual({ status: 'mocked-auth-ok' });
    });

    it('🟢 [POST] doit gérer correctement les réponses non-JSON (ex: redirections)', async () => {
        const req = new Request('http://localhost:3000/api/auth/signin/google', {
            method: 'POST',
            body: JSON.stringify({ provider: 'google' }),
        });

        const res = await POST(req as any);
        const text = await res.text();

        expect(res.status).toBe(302);
        expect(text).toBe('Redirecting');
    });
});