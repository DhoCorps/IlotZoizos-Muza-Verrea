import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sovereign/purge/route';
import { getServerSession } from 'next-auth/next';
import { SystemPurgeJobModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SystemPurgeJobModel: {
    create: vi.fn().mockResolvedValue(true),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Purge Souveraine (POST /api/purge)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1', reason: 'Obsolescence' }),
    });

    const response = await POST(req as any, {});
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si le contexte de purge est incomplet', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1' }), // Absence de 'reason'
    });

    const response = await POST(req as any, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Contexte de purge incomplet.");
  });

  it('doit planifier la purge souveraine avec succès (202) et consigner le job dans la Silice', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: ['ROLE_SOVEREIGN'] }
    } as any);

    const req = new Request('http://localhost/api/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1', reason: 'Nettoyage cosmique' }),
    });

    const response = await POST(req as any, {});
    const json = await response.json();

    // 🕊️ La route répond désormais en 202 Accepted (asynchrone)
    expect(response.status).toBe(202);
    expect(json.success).toBe(true);
    expect(json.message).toContain("abysses");

    // ⏳ Vérification que l'ordre a bien été enfilé dans la base NoSQL
    expect(SystemPurgeJobModel.create).toHaveBeenCalledWith({
      entityId: 'ent-1',
      reason: 'Nettoyage cosmique',
      actorUid: 'u-123',
      capabilities: ['ROLE_SOVEREIGN'],
      status: 'PENDING'
    });
  });
});