import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { revalidateTag } from 'next/cache';

const mockFosterOiseau = vi.fn();

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ SUTURE : On conserve le reste de @ilot/shared-core (dont IlotError) via importOriginal
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    OiseauOrchestrator: class {
      fosterOiseau = mockFosterOiseau;
    },
  };
});

type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

describe('API Auth Register POST', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFosterOiseau.mockReset();
    mockFosterOiseau.mockResolvedValue({
      mongo: { uid: 'bird_new', pseudo: 'NouveauPiaf', frequenceHEX: '#000000' }
    });
  });

  it('🔴 [POST] doit rejeter (400) si les champs obligatoires manquent (Zod)', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr' })
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(400);
  });

  it('🟢 [POST] doit inscrire l\'oiseau (201) et invalider le cache', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@ilot.fr', 
        password: 'secure', 
        pseudo: 'NouveauPiaf' 
      })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.oiseau.uid).toBe('bird_new');
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
  });

  it('🔴 [POST] doit gérer les erreurs de l\'orchestrateur (500)', async () => {
    mockFosterOiseau.mockRejectedValueOnce(new Error("Erreur technique"));

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr', password: 'secure', pseudo: 'Piaf' })
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(500);
  });
});