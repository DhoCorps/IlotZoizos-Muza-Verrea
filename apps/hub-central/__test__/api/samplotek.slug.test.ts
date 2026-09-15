import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/samplotek/[slug]/route';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
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
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: any;
}

describe('API SamploTek - Suppression d’un sample ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  it('🔴 doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/samplotek/samp_123', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'samp_123' }) });

    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (403) si l’Oiseau tente de supprimer le sample d’un autre', async () => {
    global.__mockUser = { uid: 'intrus_bird', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'samp_123',
      authorUid: 'owner_bird',
      storageKey: 'hub-central/sample.mp3'
    } as any);

    const req = new Request('http://localhost/api/samplotek/samp_123', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'samp_123' }) });

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
    } as any);

    const req = new Request('http://localhost/api/samplotek/kick-lourd', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'kick-lourd' }) });
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