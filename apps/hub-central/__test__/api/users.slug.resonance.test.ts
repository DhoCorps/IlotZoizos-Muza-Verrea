import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/[slug]/resonance/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { ResonanceOrchestrator, TaskResonanceOrchestrator } from '@ilot/shared-core';
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
  OiseauModel: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Résonance (POST /[slug]/resonance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur les prototypes des orchestrateurs
    vi.spyOn(ResonanceOrchestrator, 'weaveResonance').mockResolvedValue(true as any);
    vi.spyOn(ResonanceOrchestrator, 'severResonance').mockResolvedValue(true as any);

    vi.spyOn(TaskResonanceOrchestrator.prototype, 'processUserTaskResonance').mockResolvedValue({
      score: 100,
    } as any);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/users/cible-123/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'cible-123' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si l\'oiseau tente de résonner avec lui-même', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'moi-même', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/users/moi-même/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'moi-même' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("On ne peut résonner avec soi-même.");
  });

  it('doit réussir (200) un abonnement WEAVE, mettre à jour les compteurs et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'source-uid', capabilities: [] }
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'target-uid', slug: 'cible-slug' }),
    } as any);

    const req = new Request('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isHarmonic).toBe(true);

    expect(ResonanceOrchestrator.weaveResonance).toHaveBeenCalled();
    expect(OiseauModel.updateOne).toHaveBeenCalledTimes(2); // Incrément followers & following

    // 💥 Vérification cruciale de l'invalidation croisée des caches
    expect(revalidateTag).toHaveBeenCalledWith('profile-cible-slug');
    expect(revalidateTag).toHaveBeenCalledWith('profile-source-uid');
    expect(revalidateTag).toHaveBeenCalledWith('users');
  });

  it('doit réussir (200) une rupture SEVER et décrémenter les compteurs', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'source-uid', capabilities: [] }
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'target-uid', slug: 'cible-slug' }),
    } as any);

    const req = new Request('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEVER', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    expect(ResonanceOrchestrator.severResonance).toHaveBeenCalled();
    expect(OiseauModel.updateOne).toHaveBeenCalledWith(
      { uid: 'target-uid' },
      { $inc: { followersCount: -1 } }
    );
    expect(revalidateTag).toHaveBeenCalledWith('profile-cible-slug');
  });

  it('doit exécuter le mode calcul par défaut si aucune action WEAVE/SEVER n\'est fournie', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'source-uid', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({}), // Pas d'action WEAVE ou SEVER
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.score).toBe(100);
  });
});