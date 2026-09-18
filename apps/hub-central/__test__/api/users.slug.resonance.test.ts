import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/[slug]/resonance/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ResonanceOrchestrator, TaskResonanceOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    OiseauModel: {
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// Mock unifié de l'api-guard
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    if (!mockCurrentUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockCurrentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Résonance (POST /[slug]/resonance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur les prototypes des orchestrateurs
    vi.spyOn(ResonanceOrchestrator, 'weaveResonance').mockResolvedValue(true as unknown as Awaited<ReturnType<typeof ResonanceOrchestrator.weaveResonance>>);
    vi.spyOn(ResonanceOrchestrator, 'severResonance').mockResolvedValue(true as unknown as Awaited<ReturnType<typeof ResonanceOrchestrator.severResonance>>);

    vi.spyOn(TaskResonanceOrchestrator.prototype, 'processUserTaskResonance').mockResolvedValue({
      score: 100,
    } as unknown as Awaited<ReturnType<TaskResonanceOrchestrator['processUserTaskResonance']>>);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/users/cible-123/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'cible-123' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si l\'oiseau tente de résonner avec lui-même', async () => {
    global.__mockUser = { uid: 'moi-même', capabilities: [] };

    const req = new NextRequest('http://localhost/api/users/moi-même/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'moi-même' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("On ne peut résonner avec soi-même.");
  });

  it('doit réussir (200) un abonnement WEAVE, mettre à jour les compteurs et invalider le cache', async () => {
    global.__mockUser = { uid: 'source-uid', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'target-uid',
      slug: 'cible-slug',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isHarmonic).toBe(true);

    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'cible-slug');
    expect(ResonanceOrchestrator.weaveResonance).toHaveBeenCalled();
    expect(OiseauModel.updateOne).toHaveBeenCalledTimes(2); // Incrément followers & following

    // 💥 Vérification cruciale de l'invalidation croisée des caches en cascade
    expect(revalidateTag).toHaveBeenCalledWith('profile-cible-slug');
    expect(revalidateTag).toHaveBeenCalledWith('profile-source-uid');
    expect(revalidateTag).toHaveBeenCalledWith('users');
  });

  it('doit réussir (200) une rupture SEVER et décrémenter les compteurs', async () => {
    global.__mockUser = { uid: 'source-uid', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'target-uid',
      slug: 'cible-slug',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEVER', type: 'FOLLOWS_GLOBAL' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'cible-slug');
    expect(ResonanceOrchestrator.severResonance).toHaveBeenCalled();
    expect(OiseauModel.updateOne).toHaveBeenCalledWith(
      { uid: 'target-uid' },
      { $inc: { followersCount: -1 } }
    );
    expect(revalidateTag).toHaveBeenCalledWith('profile-cible-slug');
  });

  it('doit exécuter le mode calcul par défaut si aucune action WEAVE/SEVER n\'est fournie', async () => {
    global.__mockUser = { uid: 'source-uid', capabilities: [] };

    const req = new NextRequest('http://localhost/api/users/cible-slug/resonance', {
      method: 'POST',
      body: JSON.stringify({}), // Pas d'action WEAVE ou SEVER
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'cible-slug' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.score).toBe(100);
  });
});