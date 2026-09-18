import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/showcase/stream/route';
import { ShowcaseOrchestrator } from '@ilot/shared-core';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    ShowcaseOrchestrator: {
      getPersonalizedShowcase: vi.fn(),
    }
  };
});

// Mock du cache de stream pour éviter d'importer le vrai cache externe complexe en test unitaire isolé
vi.mock('@/lib/cache/showcase.cache', () => ({
  getCachedStream: vi.fn(async (userUid: string, filters: unknown) => {
    return await ShowcaseOrchestrator.getPersonalizedShowcase(userUid, filters as any);
  }),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'bird_test_123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

describe('GET /api/showcase/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('doit générer un flux personnalisé pour l\'utilisateur authentifié', async () => {
    const mockPlaylist = [{ mediaId: 'media_1', title: 'Art' }];
    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockResolvedValue(mockPlaylist as unknown as Awaited<ReturnType<typeof ShowcaseOrchestrator.getPersonalizedShowcase>>);

    const req = new NextRequest('http://localhost/api/showcase/stream?apps=DHO,GALLERY&onlyTradable=true');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(ShowcaseOrchestrator.getPersonalizedShowcase).toHaveBeenCalledWith(
      'bird_test_123',
      { selectedApps: ['DHO', 'GALLERY'], onlyTradable: true }
    );
  });
});