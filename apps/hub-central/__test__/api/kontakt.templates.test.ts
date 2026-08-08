import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/templates/route';
import { CVTemplateModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

const mockLean = vi.fn();
const mockSort = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  CVTemplateModel: {
    find: vi.fn((...args) => mockFind(...args)),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API CV Templates - Gestion des modèles de CV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des modèles de CV avec succès (200)', async () => {
    mockLean.mockResolvedValueOnce([{ uid: 'tmpl_1', title: 'Parchemin Cyber' }]);

    const req = new Request('http://localhost/api/cv-templates');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].uid).toBe('tmpl_1');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation)
  // =========================================================================
  it('🔴 doit rejeter la publication si l’oiseau n’est pas connecté (401)', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouveau Modèle' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer un modèle de CV avec succès et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', name: 'Oiseau Fer', capabilities: [] };

    const mockCreatedTemplate = {
      uid: 'tmpl_new',
      title: 'Nouveau Modèle',
      authorUid: 'bird_1'
    };

    vi.mocked(CVTemplateModel.create).mockResolvedValueOnce(mockCreatedTemplate as any);

    const req = new Request('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouveau Modèle', priceShards: 10 })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('tmpl_new');
    expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
    expect(revalidateTag).toHaveBeenCalledWith('author-bird_1');
  });
});