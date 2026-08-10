import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/forgot-password/route';
import { OiseauModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
process.env.RESEND_API_KEY = 're_test_key';

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

// 🛡️ MOCK RESEND ROBUSTE : Garantit que 'emails.send' existe toujours sur l'instance
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'msg_123' }, error: null }),
      };
    },
  };
});

describe('API Forgot Password POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('🔴 [POST] doit rejeter (400) si l\'email est invalide ou absent', async () => {
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'mauvais-format' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(400);
  });

  it('🟢 [POST] doit renvoyer un succès silencieux (200) si l\'email n\'existe pas (anti-énumération)', async () => {
    vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'inconnu@ilot.fr' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('🟢 [POST] doit envoyer la fusée de détresse (200) et invalider le cache si l\'oiseau existe', async () => {
    const mockUserDoc = {
      uid: 'bird_1',
      email: 'piaf@ilot.fr',
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockUserDoc as any);

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'piaf@ilot.fr' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUserDoc.save).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
    expect(revalidateTag).toHaveBeenCalledWith('oiseau-bird_1');
  });
});