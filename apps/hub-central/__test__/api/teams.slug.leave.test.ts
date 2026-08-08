import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/leave/route';
import { getServerSession } from 'next-auth/next';
import { TeamOrchestrator } from '@ilot/shared-core';
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
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    leaveTeam: vi.fn().mockResolvedValue({ success: true, message: "L'oiseau a pris son envol avec succès." }),
  })),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Envol volontaire d\'un Nid (POST /api/teams/[slug]/leave)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si le protocole mémoriel (mode) est absent ou invalide', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'INVALID_MODE' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("protocole mémoriel valide");
  });

  it('doit réussir (200) l\'envol avec le protocole CLEAN, exécuter l\'orchestrateur et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // 💥 Vérification de l'invalidation chirurgicale du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
    expect(revalidateTag).toHaveBeenCalledWith('profile-u-123');
  });
});