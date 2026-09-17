import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { OiseauModel } from '@ilot/infrastructure';
import { compare } from 'bcryptjs';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
  };
});

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed'),
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
}));

type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

describe('API Auth Login POST', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 [POST] doit rejeter (400) si les champs sont manquants ou invalides (Zod)', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr' }) // password manquant
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(400);
  });

  it('🔴 [POST] doit rejeter (401) si l\'oiseau est introuvable', async () => {
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      })
    } as unknown as ReturnType<typeof OiseauModel.findOne>);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inconnu@ilot.fr', password: 'password123' })
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(401);
  });

  it('🟢 [POST] doit autoriser la connexion (200) avec les bonnes credentials', async () => {
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ 
          uid: 'bird_1', 
          pseudo: 'PiafTest', 
          email: 'test@ilot.fr',
          password: 'hashed_password' 
        })
      })
    } as unknown as ReturnType<typeof OiseauModel.findOne>);
    
    vi.mocked(compare).mockResolvedValue(true as unknown as Awaited<ReturnType<typeof compare>>);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr', password: 'password123' })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.uid).toBe('bird_1');
  });
});