import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { OiseauModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import bcrypt from 'bcryptjs';

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

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

describe('API Reset Password POST', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 [POST] doit rejeter (400) si le schéma Zod est invalide', async () => {
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'abc' }) // pas de password
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(400);
  });

  it('🔴 [POST] doit rejeter (400) si le token est invalide', async () => {
    vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    } as unknown as ReturnType<typeof OiseauModel.findOneAndUpdate>);

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired', password: 'password123', confirmPassword: 'password123' })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('invalide ou a expiré');
  });

  it('🟢 [POST] doit sceller la nouvelle clé (200) et invalider le cache', async () => {
    vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'bird_1',
        email: 'test@ilot.fr'
      })
    } as unknown as ReturnType<typeof OiseauModel.findOneAndUpdate>);

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid_token', password: 'newPassword123', confirmPassword: 'newPassword123' })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
    expect(revalidateTag).toHaveBeenCalledWith('oiseau-bird_1');
    expect(bcrypt.hash).toHaveBeenCalled();
  });
});