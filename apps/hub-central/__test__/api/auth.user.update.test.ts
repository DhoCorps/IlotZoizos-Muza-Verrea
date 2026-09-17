import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/auth/user/update/route';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: Request, ctx: unknown) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, message: "Oiseau non identifié. Le vent rejette tes murmures." }, { status: 401 });
      }
      // @ts-ignore - Passage sécurisé du mockUser pour le test
      return await handler(req, ctx, mockUser);
    },
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

declare global {
  var __mockUser: { uid: string; capabilities: string[]; [key: string]: unknown } | undefined;
}

type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

describe('API Oiseau Fluctuation PUT', () => {
  const putHandler = PUT as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ Espionnage direct sur le prototype de OiseauOrchestrator
    vi.spyOn(OiseauOrchestrator.prototype, 'appliquerFluctuation').mockResolvedValue({
      energy: 100,
      entropy: 0.5,
    } as unknown as Awaited<ReturnType<OiseauOrchestrator['appliquerFluctuation']>>);
  });

  it('🔴 [PUT] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new Request('http://localhost/api/oiseau', {
      method: 'PUT',
      body: JSON.stringify({ frequenceHEX: '#FF0000' })
    });

    const res = await putHandler(req, {});
    expect(res.status).toBe(401);
  });

  it('🔴 [PUT] doit renvoyer 403 si le sanctuaire est verrouillé', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(OiseauModel.findOne).mockResolvedValueOnce({
      uid: 'bird_1',
      sanctuaireVerrouille: true,
    } as unknown as Awaited<ReturnType<typeof OiseauModel.findOne>>);

    const req = new Request('http://localhost/api/oiseau', {
      method: 'PUT',
      body: JSON.stringify({ frequenceHEX: '#FF0000' })
    });

    const res = await putHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.message).toContain('verrouillé');
  });

  it('🟢 [PUT] doit appliquer la fluctuation avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockOiseauDoc = {
      uid: 'bird_1',
      sanctuaireVerrouille: false,
      sanctuaire: { theme: 'dark' },
      save: vi.fn().mockResolvedValue(true)
    };

    vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockOiseauDoc as unknown as Awaited<ReturnType<typeof OiseauModel.findOne>>);

    const req = new Request('http://localhost/api/oiseau', {
      method: 'PUT',
      body: JSON.stringify({ frequenceHEX: '#00FF00', sanctuaire: { theme: 'light' } })
    });

    const res = await putHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("La structure a muté.");
    expect(json.etat).toEqual({ energy: 100, entropy: 0.5 });
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
    expect(revalidateTag).toHaveBeenCalledWith('oiseau-bird_1');
  });
});