import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { OiseauModel } from '@ilot/infrastructure';
import bcrypt from 'bcryptjs';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed'),
}));

describe('API Auth Login POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('🔴 [POST] doit rejeter (400) si les champs sont manquants', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(400);
  });

  it('🔴 [POST] doit rejeter (401) si l\'oiseau est introuvable', async () => {
    vi.mocked(OiseauModel.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
    } as any);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inconnu@ilot.fr', password: 'password123' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🟢 [POST] doit autoriser la connexion (200) avec les bonnes credentials', async () => {
    vi.mocked(OiseauModel.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
            uid: 'bird_1', 
            pseudo: 'PiafTest', 
            email: 'test@ilot.fr',
            password: 'hashed_password' 
        })
    } as any);
    
    // On s'assure que compare renvoie bien true
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr', password: 'password123' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.uid).toBe('bird_1');
  });
});