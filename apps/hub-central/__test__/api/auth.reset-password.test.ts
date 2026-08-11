import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { OiseauModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

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
}));

describe('API Reset Password POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 [POST] doit rejeter (400) si le schéma Zod est invalide', async () => {
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'abc' }) // pas de password
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(400);
  });

  it('🔴 [POST] doit rejeter (400) si le token est invalide', async () => {
    vi.mocked(OiseauModel.findOneAndUpdate).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired', password: 'password123', confirmPassword: 'password123' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('invalide ou a expiré');
  });

  it('🟢 [POST] doit sceller la nouvelle clé (200) et invalider le cache', async () => {
    vi.mocked(OiseauModel.findOneAndUpdate).mockResolvedValueOnce({
      uid: 'bird_1',
      email: 'test@ilot.fr'
    } as any);

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid_token', password: 'newPassword123', confirmPassword: 'newPassword123' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
    expect(revalidateTag).toHaveBeenCalledWith('oiseau-bird_1');
    expect(bcrypt.hash).toHaveBeenCalled();
  });
});