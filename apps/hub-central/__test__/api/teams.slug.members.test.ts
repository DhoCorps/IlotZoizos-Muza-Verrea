import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/members/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    TeamModel: {
      findOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Membres et Recrutement (POST /api/teams/[slug]/members)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'inviteBird').mockResolvedValue({
      success: true,
      message: "Invitation envoyée avec succès",
    } as any);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/teams/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE', userUid: 'target-123' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si l\'action n\'est pas INVITE', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'KICK', userUid: 'target-123' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Mouvement inconnu sur cette frontière.");
  });

  it('doit rejeter (400) si l\'UID de l\'oiseau cible est manquant', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("L'UID de l'oiseau cible est manquant.");
  });

  it('doit réussir (200) l\'invitation d\'un oiseau, exécuter l\'orchestrateur et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: ['*'] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid'
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE', userUid: 'target-123', capabilities: ['READ'] }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

    // 💥 Vérification de l'invalidation chirurgicale du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    expect(revalidateTag).toHaveBeenCalledWith('teams-target-123');
  });
});