import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/samplotek/[slug]/route';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    SampleModel: {
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

describe('API SamploTek - Suppression d’un sample ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);
  });

  it('🔴 doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/samplotek/samp_123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'samp_123' }) });

    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (403) si l’Oiseau tente de supprimer le sample d’un autre', async () => {
    global.__mockUser = { uid: 'intrus_bird', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'samp_123',
      authorUid: 'owner_bird',
      storageKey: 'hub-central/sample.mp3'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/samplotek/samp_123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'samp_123' }) });

    expect(res.status).toBe(403);
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(SampleModel.deleteOne).not.toHaveBeenCalled();
  });

  it('🟢 doit dissoudre le sample avec succès (200), purger R2 et invalider le cache', async () => {
    global.__mockUser = { uid: 'owner_bird', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'samp_123',
      slug: 'kick-lourd',
      authorUid: 'owner_bird',
      storageKey: 'hub-central/sample.mp3'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/samplotek/kick-lourd', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'kick-lourd' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(storageService.deleteFile).toHaveBeenCalledWith('hub-central/sample.mp3');
    expect(SampleModel.deleteOne).toHaveBeenCalledWith({ uid: 'samp_123' });
    expect(revalidateTag).toHaveBeenCalledWith('samples');
    expect(revalidateTag).toHaveBeenCalledWith('samples-user-owner_bird');
    expect(revalidateTag).toHaveBeenCalledWith('sample-kick-lourd');
  });
});