import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/[slug]/report/route';
import { NextRequest, NextResponse } from 'next/server';
import { SamplotekOrchestrator } from '@ilot/shared-core';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES GUARDS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, ctx: unknown) => {
    const mockUser = (global as any).__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  SampleModel: {},
  findEntityBySlugOrUid: vi.fn(),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Samplotek Report (POST /api/samplotek/[slug]/report)', () => {
  let reportSampleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SpyOn stable pour intercepter l'appel à l'Orchestrateur
    reportSampleSpy = vi.spyOn(SamplotekOrchestrator.prototype, 'reportSample').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { uid: 'samp_bad', moderation: { reportsCount: 1, isQuarantined: false } },
      isQuarantined: false
    } as any);
  });

  it('🔴 doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    const req = new NextRequest('http://localhost/api/samplotek/samp_bad/report', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'samp_bad' }) });

    expect(res.status).toBe(401);
    expect(reportSampleSpy).not.toHaveBeenCalled();
  });

  it('🔴 doit rejeter (404) si le sample à signaler n’existe pas', async () => {
    (global as any).__mockUser = { uid: 'oiseau_justicier', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/samplotek/ghost_samp/report', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'ghost_samp' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(reportSampleSpy).not.toHaveBeenCalled();
  });

  it('🟢 doit incrémenter le signalement sans quarantaine si le seuil n’est pas atteint', async () => {
    (global as any).__mockUser = { uid: 'oiseau_justicier', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'samp_bad',
      slug: 'bruit-etrange'
    } as any);

    const req = new NextRequest('http://localhost/api/samplotek/bruit-etrange/report', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'bruit-etrange' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('enregistré avec succès');

    expect(reportSampleSpy).toHaveBeenCalledWith('samp_bad', expect.objectContaining({ actorUid: 'oiseau_justicier' }));
    
    // Vérification de la purge cache
    expect(revalidateTag).toHaveBeenCalledWith('samples');
    expect(revalidateTag).toHaveBeenCalledWith('samplotek-public-catalog');
    expect(revalidateTag).toHaveBeenCalledWith('sample-samp_bad');
    expect(revalidateTag).toHaveBeenCalledWith('sample-bruit-etrange');
  });

  it('🟢 doit notifier la mise en quarantaine si le seuil de l\'Orchestrateur est franchi', async () => {
    (global as any).__mockUser = { uid: 'oiseau_justicier', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'samp_toxic' } as any);

    // L'Orchestrateur décide que c'est la goutte d'eau
    reportSampleSpy.mockResolvedValueOnce({
      success: true,
      status: 'success',
      mongo: { uid: 'samp_toxic', status: 'QUARANTINED', moderation: { reportsCount: 4, isQuarantined: true } },
      isQuarantined: true // 🚩
    } as any);

    const req = new NextRequest('http://localhost/api/samplotek/samp_toxic/report', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ slug: 'samp_toxic' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('placé en quarantaine'); // Le message s'adapte
  });
});