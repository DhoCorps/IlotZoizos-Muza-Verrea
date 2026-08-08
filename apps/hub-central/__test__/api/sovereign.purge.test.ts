import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sovereign/purge/route';
import { getServerSession } from 'next-auth/next';
import { SovereignPurgeOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@ilot/shared-core', () => ({
  SovereignPurgeOrchestrator: vi.fn().mockImplementation(() => ({
    executeSovereignPurge: vi.fn().mockResolvedValue({ purged: true, count: 5 }),
  })),
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

  it('doit réussir (200) la purge souveraine, exécuter l\'orchestrateur et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1', reason: 'Nettoyage cosmique' }),
    });

    const response = await POST(req as any, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.result.purged).toBe(true);

    // 💥 Vérification de l'invalidation chirurgicale et globale du cache
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('tasks');
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('entity-ent-1');
  });
});